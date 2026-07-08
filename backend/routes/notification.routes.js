const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const verifyToken = require('../middleware/auth.middleware');

// Get notifications
router.get('/', verifyToken, notificationController.getNotifications);

// Get unread count
router.get('/unread-count', verifyToken, notificationController.getUnreadCount);

// Mark as read
router.put('/mark-read', verifyToken, notificationController.markAsRead);

module.exports = router;
