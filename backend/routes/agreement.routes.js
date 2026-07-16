const express = require('express');
const router = express.Router();
const agreementController = require('../controllers/agreement.controller');
const verifyToken = require('../middleware/auth.middleware');
const checkRole = require('../middleware/role.middleware');
const upload = require('../config/multer');

// Admin routes
router.post('/upload', verifyToken, checkRole(['Admin']), upload.single('agreement_file'), agreementController.uploadAgreement);
router.get('/all', verifyToken, checkRole(['Admin']), agreementController.getAllAgreements);
router.delete('/:id', verifyToken, checkRole(['Admin']), agreementController.deleteAgreement);

// Client routes
router.get('/my-agreements', verifyToken, checkRole(['Client']), agreementController.getClientAgreements);
router.post('/sign', verifyToken, checkRole(['Client']), agreementController.signAgreement);

// Public/Semi-public download route (or protected if needed)
router.get('/download/:id', agreementController.downloadAgreement);

module.exports = router;
