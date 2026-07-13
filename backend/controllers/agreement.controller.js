const pool = require('../config/db');
const { sendEmail } = require('../utils/email.service');
const { PDFDocument } = require('pdf-lib');
const notificationController = require('./notification.controller');
const { uploadToCloudinary, fetchFromUrl } = require('../utils/cloudinary.service');

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

// Admin Action: Upload Agreement (to Cloudinary)
exports.uploadAgreement = async (req, res) => {
    const { client_id } = req.body;

    if (!req.file) {
        return res.status(400).json({ message: 'Agreement file is required' });
    }

    const connection = await pool.getConnection();

    try {
        // Upload PDF buffer directly to Cloudinary (no local disk)
        const { url: cloudinaryUrl } = await uploadToCloudinary(req.file.buffer, 'maydiv/agreements', 'raw');

        await connection.beginTransaction();

        // Insert agreement with Cloudinary URL
        await connection.query(
            'INSERT INTO agreements (client_id, document_url, status) VALUES (?, ?, ?)',
            [client_id, cloudinaryUrl, 'Pending']
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
        res.status(500).json({ message: 'Server error', error: err.message });
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
        const [agreements] = await connection.query(
            'SELECT * FROM agreements WHERE id = ? AND client_id = ? AND status = ?',
            [agreement_id, client_id, 'Pending']
        );
        if (agreements.length === 0) {
            return res.status(404).json({ message: 'Agreement not found or already signed' });
        }

        const agreement = agreements[0];

        // ----------------------------------------------------------
        // Resolve PDF URL — handle both old relative paths & new Cloudinary URLs
        // Old agreements in DB may have relative paths like /uploads/file.pdf
        // New agreements uploaded after Cloudinary fix will have full https:// URLs
        // ----------------------------------------------------------
        let pdfUrl = agreement.document_url;
        if (!pdfUrl.startsWith('http')) {
            // Old relative path — construct full URL from backend
            const backendUrl = process.env.BACKEND_URL || 'https://projectviewsystem.onrender.com';
            pdfUrl = `${backendUrl}${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}`;
        }

        let existingPdfBytes;
        try {
            existingPdfBytes = await fetchFromUrl(pdfUrl);
        } catch (fetchErr) {
            console.error('Failed to fetch PDF from URL:', fetchErr.message, '| URL tried:', pdfUrl);
            // Old files on Render's ephemeral disk are deleted on every redeploy
            // Admin needs to re-upload the agreement through the dashboard
            return res.status(404).json({ 
                message: 'Agreement PDF file is no longer available (server was redeployed). Please ask admin to re-upload the agreement PDF from the dashboard.' 
            });
        }

        // Load the PDF and embed signature
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];

        // Parse mime type from base64 string
        const mimeMatch = signature_data.match(/^data:(image\/[a-zA-Z+]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1].toLowerCase() : 'image/png';
        const base64Data = signature_data.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
        const signatureImageBytes = Buffer.from(base64Data, 'base64');

        // Embed signature image into PDF
        let signatureImage;
        if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
            signatureImage = await pdfDoc.embedJpg(signatureImageBytes);
        } else {
            signatureImage = await pdfDoc.embedPng(signatureImageBytes);
        }

        // Draw signature at bottom-right of first page
        const { width, height } = firstPage.getSize();
        const signatureWidth = 150;
        const signatureHeight = 75;
        firstPage.drawImage(signatureImage, {
            x: width - signatureWidth - 20,
            y: 20,
            width: signatureWidth,
            height: signatureHeight,
        });

        // Save signed PDF to buffer (no local disk)
        const signedPdfBytes = await pdfDoc.save();
        const signedPdfBuffer = Buffer.from(signedPdfBytes);

        // Upload signed PDF to Cloudinary
        const { url: signedPdfUrl } = await uploadToCloudinary(signedPdfBuffer, 'maydiv/signed-agreements', 'raw');

        // 1. Update agreement status with Cloudinary URL
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

        // 4. Send Confirmation Emails (background, non-blocking)
        const [clientResult] = await connection.query('SELECT email, contact_person FROM clients WHERE id = ?', [client_id]);

        if (clientResult.length > 0) {
            const clientEmail = clientResult[0].email;
            const clientName = clientResult[0].contact_person;
            const clientEmailHtml = `
                <p>Thank you for signing the agreement! Your signed copy is now securely stored in your portal.</p>
                <p>The next step is to clear the initial proforma invoice which will be available in your dashboard shortly.</p>
            `;
            sendEmail(clientEmail, 'Agreement Successfully Signed', 'Agreement Signed', clientEmailHtml).catch(console.error);

            const adminEmailHtml = `
                <h3>Agreement Signed by Client</h3>
                <p><strong>Client:</strong> ${clientName}</p>
                <p><strong>Agreement ID:</strong> ${agreement_id}</p>
                <p>The client has successfully signed the agreement. You can view it in your dashboard.</p>
            `;
            sendEmail('admin@maydiv.com', 'Client Signed Agreement', 'Agreement Signed Notification', adminEmailHtml).catch(console.error);
        }

        res.json({ message: 'Agreement successfully signed.' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
        connection.release();
    }
};
