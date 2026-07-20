const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const verifyToken = require('../middleware/auth.middleware');
const checkRole = require('../middleware/role.middleware');
const upload = require('../config/multer');

// Client uploads payment proof
router.post('/upload', verifyToken, checkRole(['Client']), upload.single('payment_proof'), paymentController.uploadPaymentProof);

// Admin approves/rejects payment
router.post('/approve', verifyToken, checkRole(['Admin']), paymentController.handlePaymentApproval);

// Get payments (Admin: all, Client: own)
router.get('/', verifyToken, paymentController.getPayments);

// Download payment proof from DB (base64)
router.get('/download/:id', paymentController.downloadPayment);

module.exports = router;
