const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');
const verifyToken = require('../middleware/auth.middleware');
const checkRole = require('../middleware/role.middleware');
const upload = require('../config/multer');

// Admin only: Generate Invoice (can optionally upload PDF invoice)
router.post('/create', verifyToken, checkRole(['Admin']), upload.single('invoice_file'), invoiceController.createInvoice);

// Admin only: Delete Invoice
router.delete('/:id', verifyToken, checkRole(['Admin']), invoiceController.deleteInvoice);

// Accessible by Admin or Client
router.get('/', verifyToken, invoiceController.getInvoices);

module.exports = router;
