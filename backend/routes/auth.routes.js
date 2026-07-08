const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const verifyToken = require('../middleware/auth.middleware');
const checkRole = require('../middleware/role.middleware');

router.post('/login', authController.login);
router.post('/reset-password', verifyToken, authController.resetPassword);

// Get all users (Admin only)
router.get('/users', verifyToken, checkRole(['Admin']), authController.getAllUsers);

module.exports = router;
