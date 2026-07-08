const express = require('express');
const router = express.Router();
const milestoneController = require('../controllers/milestone.controller');
const verifyToken = require('../middleware/auth.middleware');
const checkRole = require('../middleware/role.middleware');
const upload = require('../config/multer');

// Get all milestones (Admin sees all, Client sees own)
router.get('/', verifyToken, milestoneController.getAllMilestones);

// Admin/Team: Create a milestone approval request
router.post('/request', verifyToken, checkRole(['Admin', 'Team Member']), upload.single('deliverable_file'), milestoneController.requestApproval);

// Client: Approve or request changes
router.post('/respond', verifyToken, checkRole(['Client', 'Admin']), milestoneController.respondToMilestone);


// Admin/Team: Delete/Withdraw a milestone request (reset to Not Submitted)
router.delete('/:id', verifyToken, checkRole(['Admin', 'Team Member']), milestoneController.deleteMilestoneRequest);

// Admin/Team: Edit a milestone
router.put('/:id', verifyToken, checkRole(['Admin', 'Team Member']), milestoneController.editMilestone);

module.exports = router;

