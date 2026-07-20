const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { sendEmail } = require('../utils/email.service');
const crypto = require('crypto');
const notificationController = require('./notification.controller');

exports.createClient = async (req, res) => {
    const { company_name, contact_person, email, phone } = req.body;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Create client record
        const [clientResult] = await connection.query(
            'INSERT INTO clients (company_name, contact_person, email, phone, status) VALUES (?, ?, ?, ?, ?)',
            [company_name, contact_person, email, phone, 'Account Created']
        );
        const clientId = clientResult.insertId;

        // 2. Auto-generate 8 digit alphanumeric password
        const generatedPassword = crypto.randomBytes(4).toString('hex'); 
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        // 3. Create User record for client login
        const [userResult] = await connection.query(
            'INSERT INTO users (client_id, role, name, email, password_hash, first_login_done) VALUES (?, ?, ?, ?, ?, ?)',
            [clientId, 'Client', contact_person, email, hashedPassword, false]
        );
        const userId = userResult.insertId;
        
        // 4. Log the action
        await connection.query(
            'INSERT INTO status_log (client_id, entity_type, entity_id, changed_by, remarks) VALUES (?, ?, ?, ?, ?)',
            [clientId, 'Client', clientId, req.user.id, 'Created Client Account']
        );

        await connection.commit();

        // 5. Send onboarding email - NON-BLOCKING (background)
        res.status(201).json({ message: 'Client created successfully and onboarding email sent.', clientId });

        // Fire and forget - don't await
        const loginUrl = `${process.env.FRONTEND_URL}/login?email=${encodeURIComponent(email)}`;
        const emailSubject = 'Welcome to Maydiv Dashboard - Your Account Credentials';
        const emailHtml = `
            <h3>Hello ${contact_person},</h3>
            <p>Welcome to Maydiv! Your client dashboard account has been successfully created.</p>
            <p><strong>Dashboard URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
            <p><strong>Email ID (Username):</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> ${generatedPassword}</p>
            <p>For security reasons, you will be prompted to reset your password when you log in for the first time.</p>
        `;
        sendEmail(email, emailSubject, 'Welcome to Maydiv Dashboard', emailHtml).catch(console.error);

        // 6. Create notification (background)
        notificationController.createNotification(
            clientId,
            'Credentials sent to new client',
            null,
            `Welcome email sent to ${contact_person} at ${email}`
        ).catch(console.error);
    } catch (err) {
        await connection.rollback();
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
             return res.status(400).json({ message: 'An account with this email already exists.' });
        }
        res.status(500).json({ message: 'Failed to create client', error: err.message });
    } finally {
        connection.release();
    }
};

exports.getAllClients = async (req, res) => {
    try {
        // If client is calling, only return their own record
        if (req.user.role === 'Client') {
            const client_id = req.user.client_id;
            const [clients] = await pool.query('SELECT * FROM clients WHERE id = ?', [client_id]);
            return res.json(clients);
        }
        // Admin gets all clients
        const [clients] = await pool.query('SELECT * FROM clients ORDER BY created_at DESC');
        res.json(clients);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateClient = async (req, res) => {
    const { company_name, contact_person, email, phone } = req.body;
    const clientId = req.params.id;

    try {
        await pool.query(
            'UPDATE clients SET company_name = ?, contact_person = ?, email = ?, phone = ? WHERE id = ?',
            [company_name, contact_person, email, phone, clientId]
        );

        // Also update the users table if email changed
        await pool.query(
            'UPDATE users SET name = ?, email = ? WHERE client_id = ?',
            [contact_person, email, clientId]
        );

        res.json({ message: 'Client updated successfully' });
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'An account with this email already exists.' });
        }
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.deleteClient = async (req, res) => {
    const clientId = req.params.id;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Delete associated user account
        await connection.query('DELETE FROM users WHERE client_id = ?', [clientId]);

        // Delete client record
        await connection.query('DELETE FROM clients WHERE id = ?', [clientId]);

        await connection.commit();

        res.json({ message: 'Client deleted successfully' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
        connection.release();
    }
};

exports.getClientByEmail = async (req, res) => {
    const { email } = req.params;
    
    try {
        const [clients] = await pool.query('SELECT * FROM clients WHERE email = ?', [email]);
        if (clients.length === 0) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.json(clients[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
