const pool = require('../config/db');
const { sendEmail } = require('../utils/email.service');
const notificationController = require('./notification.controller');
const { uploadToCloudinary } = require('../utils/cloudinary.service');

// Client Action: Upload Payment Proof (Base64 Database Storage)
exports.uploadPaymentProof = async (req, res) => {
    const { invoice_id } = req.body;
    const client_id = req.user.client_id;
    const connection = await pool.getConnection();

    if (!req.file) {
        connection.release();
        return res.status(400).json({ message: 'Payment proof screenshot/file is required' });
    }

    try {
        await connection.beginTransaction();

        // Convert file buffer to base64 string
        const base64Data = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;
        const documentData = `data:${mimeType};base64,${base64Data}`;

        // Insert payment record with pending URL
        const [result] = await connection.query(
            'INSERT INTO payments (invoice_id, client_id, payment_proof_url, document_data, status) VALUES (?, ?, ?, ?, ?)',
            [invoice_id, client_id, 'pending_url', documentData, 'Submitted']
        );
        const payment_id = result.insertId;

        // Update the payment record with a dynamic URL that references this ID
        const paymentUrl = `https://projectviewsystem.onrender.com/api/payments/download/${payment_id}`;
        await connection.query('UPDATE payments SET payment_proof_url = ? WHERE id = ?', [paymentUrl, payment_id]);

        // Audit log
        await connection.query(
            'INSERT INTO status_log (client_id, entity_type, entity_id, changed_by, remarks) VALUES (?, ?, ?, ?, ?)',
            [client_id, 'payments', invoice_id, req.user.id, 'Uploaded Payment Proof']
        );

        await connection.commit();
        res.status(201).json({ message: 'Payment proof uploaded successfully. Awaiting admin approval.', payment_url: paymentUrl });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
        connection.release();
    }
};

// Admin Action: Approve or Reject Payment
exports.handlePaymentApproval = async (req, res) => {
    const { payment_id, status, rejection_reason } = req.body; // status: 'Approved' or 'Rejected'
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [paymentRecords] = await connection.query('SELECT * FROM payments WHERE id = ?', [payment_id]);
        if (paymentRecords.length === 0) return res.status(404).json({ message: 'Payment record not found' });
        
        const payment = paymentRecords[0];

        // 1. Update Payment Status
        await connection.query('UPDATE payments SET status = ? WHERE id = ?', [status, payment_id]);

        const [clientResult] = await connection.query('SELECT email FROM clients WHERE id = ?', [payment.client_id]);
        const clientEmail = clientResult[0].email;

        if (status === 'Approved') {
            // Unlocks Project Details Phase
            await connection.query('UPDATE invoices SET status = ? WHERE id = ?', ['Paid', payment.invoice_id]);
            await connection.query('UPDATE clients SET status = ? WHERE id = ?', ['Project Active', payment.client_id]);

            // Automatically create a Project record for this client if it doesn't exist
            const [existingProject] = await connection.query('SELECT id FROM projects WHERE client_id = ?', [payment.client_id]);
            let projectId;
            if(existingProject.length === 0) {
                 const [projectResult] = await connection.query(
                    'INSERT INTO projects (client_id, project_name, status) VALUES (?, ?, ?)',
                    [payment.client_id, 'New Website Project', 'Active']
                 );
                 projectId = projectResult.insertId;
            } else {
                 projectId = existingProject[0].id;
                 await connection.query('UPDATE projects SET status = ? WHERE id = ?', ['Active', existingProject[0].id]);
            }
        }

        // 3. Log Action
        await connection.query(
            'INSERT INTO status_log (client_id, entity_type, entity_id, changed_by, remarks) VALUES (?, ?, ?, ?, ?)',
            [payment.client_id, 'payments', payment_id, req.user.id, `Payment ${status}`]
        );

        await connection.commit();
        res.json({ message: `Payment successfully ${status}.` });

        // Background Tasks: Emails and Notifications
        if (status === 'Approved') {
            sendEmail(clientEmail, 'Payment Approved & Project Activated', 'Payment Approved',
                `<p>Your payment has been successfully approved.</p><p>The Project Visibility phase has been unlocked in your dashboard! You can now track timelines and meet your team.</p>`).catch(console.error);
            
            notificationController.createNotification(
                payment.client_id,
                'Payment Approved - Project Active',
                typeof projectId !== 'undefined' ? projectId : null,
                'Your payment has been approved and project is now active'
            ).catch(console.error);
        } else if (status === 'Rejected') {
            sendEmail(clientEmail, 'Payment Proof Rejected', 'Payment Rejected',
                `<p>Your recent payment proof was rejected for the following reason:</p>
                 <blockquote>${rejection_reason || 'Image unclear or transaction not found.'}</blockquote>
                 <p>Please log in and upload a valid proof for the invoice.</p>`).catch(console.error);
            
            notificationController.createNotification(
                payment.client_id,
                'Payment Rejected',
                null,
                `Payment proof rejected: ${rejection_reason || 'Image unclear or transaction not found'}`
            ).catch(console.error);
        }

    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
};

// Get Payments (Admin: all, Client: own)
exports.getPayments = async (req, res) => {
    const userRole = req.user.role;
    
    try {
        let query, params;

        if (userRole === 'Client') {
            // Client only sees their own payments
            const client_id = req.user.client_id;
            if (!client_id) {
                return res.status(400).json({ message: 'Client ID not found' });
            }
            query = `
                SELECT p.*, i.amount as invoice_amount, i.due_date 
                FROM payments p 
                JOIN invoices i ON p.invoice_id = i.id 
                WHERE p.client_id = ? 
                ORDER BY p.submitted_at DESC
            `;
            params = [client_id];
        } else {
            // Admin gets all payments with client information
            query = `
                SELECT p.*, i.amount as invoice_amount, i.due_date, c.contact_person as client_name, c.company_name, c.email 
                FROM payments p 
                JOIN invoices i ON p.invoice_id = i.id 
                JOIN clients c ON p.client_id = c.id 
                ORDER BY p.submitted_at DESC
            `;
            params = [];
        }

        const [payments] = await pool.query(query, params);
        res.json(payments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Download payment proof from DB base64 data
exports.downloadPayment = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT document_data FROM payments WHERE id = ?', [id]);
        if (rows.length === 0 || !rows[0].document_data) {
            return res.status(404).json({ message: 'Payment proof not found' });
        }

        const documentData = rows[0].document_data;
        // Parse out the base64 content and mime type
        const matches = documentData.match(/^data:(.+);base64,(.+)$/);
        if (!matches) {
            return res.status(500).json({ message: 'Invalid document data format' });
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        const fileBuffer = Buffer.from(base64Data, 'base64');

        const ext = mimeType.includes('pdf') ? 'pdf' : mimeType.split('/')[1] || 'jpg';
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `inline; filename="payment-proof-${id}.${ext}"`);
        res.send(fileBuffer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
