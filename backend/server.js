const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test DB Connection
const pool = require('./config/db');
pool.getConnection()
    .then(async (connection) => {
        console.log('Connected to MySQL DB');
        
        // Auto-fix schema for exact connected database
        try {
            await connection.query('ALTER TABLE invoices ADD COLUMN document_data LONGTEXT');
            console.log('Added document_data column to invoices table successfully.');
        } catch(e) {
            // Error typically means it already exists, gracefully ignore.
        }
        
        try {
            await connection.query('ALTER TABLE payments ADD COLUMN document_data LONGTEXT');
            console.log('Added document_data column to payments table successfully.');
        } catch(e) {}
        
        connection.release();
    })
    .catch(err => {
        console.error('Error connecting to MySQL DB:', err);
    });

// API Routes Outline
const authRoutes = require('./routes/auth.routes');
const clientRoutes = require('./routes/client.routes');
const agreementRoutes = require('./routes/agreement.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const paymentRoutes = require('./routes/payment.routes');
const projectRoutes = require('./routes/project.routes');
const milestoneRoutes = require('./routes/milestone.routes');
const notificationRoutes = require('./routes/notification.routes');
const auditRoutes = require('./routes/notification.routes'); // reused for audit

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/agreements', agreementRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Maydiv Dashboard API' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
