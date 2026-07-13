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
    const { agreement_id, signature_data, client_photo } = req.body; // Both Base64
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
        // ----------------------------------------------------------
        let pdfUrl = agreement.document_url;
        if (!pdfUrl.startsWith('http')) {
            const backendUrl = process.env.BACKEND_URL || 'https://projectviewsystem.onrender.com';
            pdfUrl = `${backendUrl}${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}`;
        }

        // ----------------------------------------------------------
        // Try to fetch and embed signature into PDF
        // If PDF is unavailable (old Render ephemeral files), skip embedding
        // and sign the agreement using just the signature_data in DB
        // ----------------------------------------------------------
        let finalDocumentUrl = agreement.document_url; // keep original URL as fallback

        try {
            const existingPdfBytes = await fetchFromUrl(pdfUrl);

            // Parse mime type from base64 string
            const mimeMatch = signature_data.match(/^data:(image\/[a-zA-Z+]+);base64,/);
            const mimeType = mimeMatch ? mimeMatch[1].toLowerCase() : 'image/png';
            const base64Data = signature_data.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
            const signatureImageBytes = Buffer.from(base64Data, 'base64');

            // Load and embed signature into PDF
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const pages = pdfDoc.getPages();
            const firstPage = pages[0];

            let signatureImage;
            if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
                signatureImage = await pdfDoc.embedJpg(signatureImageBytes);
            } else {
                signatureImage = await pdfDoc.embedPng(signatureImageBytes);
            }

            const { width } = firstPage.getSize();
            firstPage.drawImage(signatureImage, {
                x: width - 170,
                y: 20,
                width: 150,
                height: 75,
            });

            // Upload signed PDF to Cloudinary
            const signedPdfBytes = await pdfDoc.save();
            const { url: signedPdfUrl } = await uploadToCloudinary(
                Buffer.from(signedPdfBytes),
                'maydiv/signed-agreements',
                'raw'
            );
            finalDocumentUrl = signedPdfUrl; // use new signed PDF URL
            console.log('✅ PDF signed and uploaded to Cloudinary:', signedPdfUrl);

        } catch (pdfErr) {
            // PDF unavailable (old Render file deleted) — sign without PDF embedding
            // Signature is still stored in DB and agreement is marked Signed
            console.warn('⚠️ PDF embedding skipped (file unavailable), signing with DB record only:', pdfErr.message);
        }

        // 1. Update agreement — always runs regardless of PDF availability
        await connection.query(
            'UPDATE agreements SET signature_data = ?, client_photo = ?, status = ?, signed_at = NOW(), document_url = ? WHERE id = ?',
            [signature_data, client_photo, 'Signed', finalDocumentUrl, agreement_id]
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
