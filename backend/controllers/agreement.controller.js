const pool = require('../config/db');
const { sendEmail } = require('../utils/email.service');
const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const notificationController = require('./notification.controller');

// Client Action: Get Client's Agreements
exports.getClientAgreements = async (req, res) => {
    const client_id = req.user.client_id;
    try {
        const [agreements] = await pool.query(
            'SELECT * FROM agreements WHERE client_id = ? ORDER BY created_at DESC',
            [client_id]
        );
        res.json(agreements);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin Action: Get All Agreements
exports.getAllAgreements = async (req, res) => {
    try {
        const [agreements] = await pool.query(`
            SELECT a.*, c.contact_person, c.company_name, c.email 
            FROM agreements a 
            JOIN clients c ON a.client_id = c.id 
            ORDER BY a.created_at DESC
        `);
        res.json(agreements);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin Action: Upload Agreement
exports.uploadAgreement = async (req, res) => {
    const { client_id } = req.body;
    
    if (!req.file) {
        return res.status(400).json({ message: 'Agreement file is required' });
    }
    
    const file_url = `/uploads/${req.file.filename}`;
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        // Insert agreement
        await connection.query(
            'INSERT INTO agreements (client_id, document_url, status) VALUES (?, ?, ?)',
            [client_id, file_url, 'Pending']
        );
        
        // Update client status
        await connection.query(
            'UPDATE clients SET status = ? WHERE id = ?',
            ['Agreement Sent', client_id]
        );
        
        // Audit log
        await connection.query(
            'INSERT INTO status_log (client_id, entity_type, entity_id, changed_by, remarks) VALUES (?, ?, ?, ?, ?)',
            [client_id, 'agreements', client_id, req.user.id, 'Agreement uploaded and sent to client']
        );

        await connection.commit();

        // Send email notification to client
        const [clientResult] = await connection.query('SELECT email, contact_person FROM clients WHERE id = ?', [client_id]);
        
        if (clientResult.length > 0) {
            const clientEmail = clientResult[0].email;
            const clientName = clientResult[0].contact_person;
            const dashboardUrl = `${process.env.FRONTEND_URL}/login`;
            
            const emailHtml = `
                <h3>Hello ${clientName},</h3>
                <p>A new service agreement has been sent to you by Maydiv.</p>
                <p>Please log in to your dashboard to review and sign the agreement.</p>
                <p><strong>Dashboard URL:</strong> <a href="${dashboardUrl}">${dashboardUrl}</a></p>
                <p>If you have any questions, please contact our support team.</p>
            `;
            
            await sendEmail(clientEmail, 'New Agreement Available for Signature', 'Agreement Sent', emailHtml);
            
            // Create notification
            await notificationController.createNotification(
                client_id,
                'Agreement Sent',
                null,
                'New agreement has been sent for your review and signature'
            );
        }

        res.status(201).json({ message: 'Agreement uploaded and sent to client successfully.' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
};

// Client Action: E-Sign Agreement
exports.signAgreement = async (req, res) => {
    const { agreement_id, signature_data } = req.body; // signature_data is Base64
    const client_id = req.user.client_id;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Ensure this agreement belongs to this client and is pending
        const [agreements] = await connection.query('SELECT * FROM agreements WHERE id = ? AND client_id = ? AND status = ?', [agreement_id, client_id, 'Pending']);
        if (agreements.length === 0) {
            return res.status(404).json({ message: 'Agreement not found or already signed' });
        }

        const agreement = agreements[0];
        // Fix: Strip leading slash so path.join works correctly on Windows
        const cleanDocPath = agreement.document_url.replace(/^\//, '');
        const originalPdfPath = path.join(__dirname, '..', cleanDocPath);
        
        // Load the original PDF
        if (!fs.existsSync(originalPdfPath)) {
            return res.status(404).json({ message: 'Agreement PDF file not found on server. Please contact admin.' });
        }
        const existingPdfBytes = fs.readFileSync(originalPdfPath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];

        // Convert signature Base64 to image (handle both PNG and JPEG/camera capture)
        const mimeMatch = signature_data.match(/^data:(image\/[a-zA-Z+]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1].toLowerCase() : 'image/png';
        const base64Data = signature_data.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
        const signatureImageBytes = Buffer.from(base64Data, 'base64');
        
        // Determine image type and embed accordingly
        let signatureImage;
        if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
            signatureImage = await pdfDoc.embedJpg(signatureImageBytes);
        } else {
            // Default to PNG (canvas drawings, webp fallback)
            signatureImage = await pdfDoc.embedPng(signatureImageBytes);
        }
        
        // Calculate signature position (bottom right of first page)
        const { width, height } = firstPage.getSize();
        const signatureWidth = 150;
        const signatureHeight = 75;
        firstPage.drawImage(signatureImage, {
            x: width - signatureWidth - 20,
            y: 20,
            width: signatureWidth,
            height: signatureHeight,
        });

        // Save signed PDF
        const signedPdfBytes = await pdfDoc.save();
        const signedFilename = `signed_${agreement_id}_${Date.now()}.pdf`;
        const signedPdfPath = path.join(__dirname, '..', 'uploads', signedFilename);
        fs.writeFileSync(signedPdfPath, signedPdfBytes);

        // Update agreement with signed PDF URL
        const signedPdfUrl = `/uploads/${signedFilename}`;

        // 1. Update agreement status
        await connection.query(
            'UPDATE agreements SET signature_data = ?, status = ?, signed_at = NOW(), document_url = ? WHERE id = ?',
            [signature_data, 'Signed', signedPdfUrl, agreement_id]
        );

        // 2. Update client status in lifecycle
        await connection.query(
            'UPDATE clients SET status = ? WHERE id = ?',
            ['Agreement Signed', client_id]
        );

        // 3. Log Activity
        await connection.query(
            'INSERT INTO status_log (client_id, entity_type, entity_id, changed_by, remarks) VALUES (?, ?, ?, ?, ?)',
            [client_id, 'agreements', agreement_id, req.user.id, 'Signed Agreement']
        );
        
        await connection.commit();

        // 4. Send Confirmation Email to Client
        const [clientResult] = await connection.query('SELECT email, contact_person FROM clients WHERE id = ?', [client_id]);
        
        if (clientResult.length > 0) {
            const clientEmail = clientResult[0].email;
            const clientName = clientResult[0].contact_person;
            const emailHtml = `
                <p>Thank you for signing the agreement! Your signed copy is now securely stored in your portal.</p>
                <p>The next step is to clear the initial proforma invoice which will be available in your dashboard shortly.</p>
            `;
            await sendEmail(clientEmail, 'Agreement Successfully Signed', 'Agreement Signed', emailHtml);
            
            // 5. Send Notification to Admin
            const adminEmail = 'admin@maydiv.com';
            const adminEmailHtml = `
                <h3>Agreement Signed by Client</h3>
                <p><strong>Client:</strong> ${clientName}</p>
                <p><strong>Agreement ID:</strong> ${agreement_id}</p>
                <p>The client has successfully signed the agreement. You can view the signed agreement in your dashboard.</p>
            `;
            await sendEmail(adminEmail, 'Client Signed Agreement', 'Agreement Signed Notification', adminEmailHtml);
        }

        res.json({ message: 'Agreement successfully signed.' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
};
