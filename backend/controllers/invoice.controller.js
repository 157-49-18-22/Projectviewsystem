const pool = require('../config/db');
const { sendEmail } = require('../utils/email.service');

// Admin Action: Generate/Send Invoice
exports.createInvoice = async (req, res) => {
    const { client_id, amount, due_date } = req.body;
    let documentData = null;

    if (req.file) {
        const fileType = req.file.mimetype || 'application/pdf';
        const base64Data = req.file.buffer.toString('base64');
        documentData = `data:${fileType};base64,${base64Data}`;
    }
    
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Create Invoice
        const [result] = await connection.query(
            'INSERT INTO invoices (client_id, amount, due_date, file_url, document_data, status) VALUES (?, ?, ?, ?, ?, ?)',
            [client_id, amount, due_date, documentData ? 'pending_url' : null, documentData, 'Sent']
        );
        const invoice_id = result.insertId;

        if (documentData) {
            const documentUrl = `https://projectviewsystem.onrender.com/api/invoices/download/${invoice_id}`;
            await connection.query('UPDATE invoices SET file_url = ? WHERE id = ?', [documentUrl, invoice_id]);
        }

        // 2. Change client status to Payment Pending
        await connection.query(
            'UPDATE clients SET status = ? WHERE id = ?',
            ['Payment Pending', client_id]
        );

        // 3. Log Activity
        await connection.query(
            'INSERT INTO status_log (client_id, entity_type, entity_id, changed_by, remarks) VALUES (?, ?, ?, ?, ?)',
            [client_id, 'invoices', invoice_id, req.user.id, 'Generated Proforma Invoice']
        );

        await connection.commit();

        // 4. Send Email Notifying the Client
        const [clientResult] = await connection.query('SELECT email, contact_person FROM clients WHERE id = ?', [client_id]);
        if (clientResult.length > 0) {
            const emailHtml = `
                <p>Hello ${clientResult[0].contact_person},</p>
                <p>A new proforma invoice of <strong>$${amount}</strong> has been generated and is ready for payment.</p>
                <p>Please log in to your dashboard to view payment instructions and upload your payment receipt.</p>
            `;
            await sendEmail(clientResult[0].email, 'New Invoice Generated for Payment', 'New Invoice Pending', emailHtml);
        }

        res.status(201).json({ message: 'Invoice successfully generated and sent to client.' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
};

// Download Invoice PDF (serve base64 data)
exports.downloadInvoice = async (req, res) => {
    try {
        const [invoices] = await pool.query('SELECT document_data FROM invoices WHERE id = ?', [req.params.id]);
        if (invoices.length === 0 || !invoices[0].document_data) {
            return res.status(404).json({ message: 'Document not found' });
        }
        
        let base64Data = invoices[0].document_data;
        if (base64Data.includes('base64,')) {
            base64Data = base64Data.split('base64,')[1];
        }
        
        const buffer = Buffer.from(base64Data, 'base64');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="invoice_${req.params.id}.pdf"`);
        res.send(buffer);
    } catch (err) {
        console.error('Download error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get Invoices for Client or all for Admin
exports.getInvoices = async (req, res) => {
    const userRole = req.user.role;
    
    try {
        let query, params;

        if (userRole === 'Client') {
            // Client only sees their own invoices
            const client_id = req.user.client_id;
            if (!client_id) {
                return res.status(400).json({ message: 'Client ID not found' });
            }
            query = 'SELECT * FROM invoices WHERE client_id = ? ORDER BY created_at DESC';
            params = [client_id];
        } else {
            // Admin gets all invoices with client information
            query = `
                SELECT i.*, c.contact_person as client_name, c.company_name, c.email 
                FROM invoices i 
                JOIN clients c ON i.client_id = c.id 
                ORDER BY i.created_at DESC
            `;
            params = [];
        }

        const [invoices] = await pool.query(query, params);
        res.json(invoices);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin Action: Delete Invoice
exports.deleteInvoice = async (req, res) => {
    const { id } = req.params;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Check if invoice exists
        const [invoices] = await connection.query('SELECT * FROM invoices WHERE id = ?', [id]);
        if (invoices.length === 0) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        const invoice = invoices[0];

        // Delete invoice
        await connection.query('DELETE FROM invoices WHERE id = ?', [id]);

        // Log activity
        await connection.query(
            'INSERT INTO status_log (client_id, entity_type, entity_id, changed_by, remarks) VALUES (?, ?, ?, ?, ?)',
            [invoice.client_id, 'invoices', id, req.user.id, 'Deleted Invoice']
        );

        await connection.commit();
        res.json({ message: 'Invoice deleted successfully' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
};

exports.debugDb = async (req, res) => {
    try {
        const [rows] = await pool.query('DESCRIBE invoices');
        res.json({ table: 'invoices', columns: rows });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
