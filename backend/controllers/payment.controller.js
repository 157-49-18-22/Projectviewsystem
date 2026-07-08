const pool = require('../config/db');
const { sendEmail } = require('../utils/email.service');
const notificationController = require('./notification.controller');

// Client Action: Upload Payment Proof
exports.uploadPaymentProof = async (req, res) => {
    const { invoice_id } = req.body;
    const client_id = req.user.client_id;

    if (!req.file) {
        return res.status(400).json({ message: 'Payment proof screenshot/file is required' });
    }
    const payment_proof_url = `/uploads/${req.file.filename}`;

    try {
        await pool.query(
            'INSERT INTO payments (invoice_id, client_id, payment_proof_url, status) VALUES (?, ?, ?, ?)',
            [invoice_id, client_id, payment_proof_url, 'Submitted']
        );

        // Audit log
        await pool.query(
            'INSERT INTO status_log (client_id, entity_type, entity_id, changed_by, remarks) VALUES (?, ?, ?, ?, ?)',
            [client_id, 'payments', invoice_id, req.user.id, 'Uploaded Payment Proof']
        );

        res.status(201).json({ message: 'Payment proof uploaded successfully. Awaiting admin approval.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
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

            // Email Client - Project Unlocked
            await sendEmail(clientEmail, 'Payment Approved & Project Activated', 'Payment Approved',
                `<p>Your payment has been successfully approved.</p><p>The Project Visibility phase has been unlocked in your dashboard! You can now track timelines and meet your team.</p>`);
            
            // Create notification
            await notificationController.createNotification(
                payment.client_id,
                'Payment Approved - Project Active',
                projectId,
                'Your payment has been approved and project is now active'
            );
        } 
        else if (status === 'Rejected') {
            // Email Client - Rejected Reason
            await sendEmail(clientEmail, 'Payment Proof Rejected', 'Payment Rejected',
                `<p>Your recent payment proof was rejected for the following reason:</p>
                 <blockquote>${rejection_reason || 'Image unclear or transaction not found.'}</blockquote>
                 <p>Please log in and upload a valid proof for the invoice.</p>`);
            
            // Create notification
            await notificationController.createNotification(
                payment.client_id,
                'Payment Rejected',
                null,
                `Payment proof rejected: ${rejection_reason || 'Image unclear or transaction not found'}`
            );
        }

        // 3. Log Action
        await connection.query(
            'INSERT INTO status_log (client_id, entity_type, entity_id, changed_by, remarks) VALUES (?, ?, ?, ?, ?)',
            [payment.client_id, 'payments', payment_id, req.user.id, `Payment ${status}`]
        );

        await connection.commit();
        res.json({ message: `Payment successfully ${status}.` });

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
