const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const verifyToken = require('../middleware/auth.middleware');
const checkRole = require('../middleware/role.middleware');

// View Project Dashboard Endpoint
router.get('/', verifyToken, checkRole(['Admin', 'Client']), projectController.getAllProjects);
router.get('/:id', verifyToken, projectController.getProjectDetails);

// Get Project Milestones (for milestone approval dropdown)
router.get('/:id/milestones', verifyToken, projectController.getProjectMilestones);

// Admin Only - Create & Edit Project
router.post('/', verifyToken, checkRole(['Admin']), projectController.createProject);
router.put('/:id', verifyToken, checkRole(['Admin']), projectController.updateProject);

// Admin Only - Create Milestone
router.post('/:id/milestones', verifyToken, checkRole(['Admin']), projectController.createMilestone);

// Admin & Client - Update Milestone Status
router.put('/milestones/:id', verifyToken, checkRole(['Admin', 'Client']), projectController.updateMilestone);

// Admin Only - Delete Milestone
router.delete('/milestones/:id', verifyToken, checkRole(['Admin']), projectController.deleteMilestone);

// Admin & Team Endpoint
router.post('/assign', verifyToken, checkRole(['Admin']), projectController.assignTeam);
router.put('/gantt', verifyToken, checkRole(['Admin', 'Team Member']), projectController.updateGantt);

// Admin Only - Finalize
router.post('/:id/complete', verifyToken, checkRole(['Admin']), projectController.completeProject);

// Admin Only - Sell Project
router.put('/:id/sell', verifyToken, checkRole(['Admin']), projectController.sellProject);

// Admin Only - Delete Project
router.delete('/:id', verifyToken, checkRole(['Admin']), projectController.deleteProject);

// Client - Submit Review
router.post('/:id/review', verifyToken, checkRole(['Client']), projectController.submitReview);

module.exports = router;
