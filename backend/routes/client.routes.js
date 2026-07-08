const express = require('express');
const router = express.Router();
const clientController = require('../controllers/client.controller');
const verifyToken = require('../middleware/auth.middleware');
const checkRole = require('../middleware/role.middleware');

// Only Admin can create a client
router.post('/', verifyToken, checkRole(['Admin']), clientController.createClient);
// Admin, Team Members, and Clients can view clients
router.get('/', verifyToken, checkRole(['Admin', 'Team Member', 'Client']), clientController.getAllClients);
// Admin can update a client
router.put('/:id', verifyToken, checkRole(['Admin']), clientController.updateClient);
// Admin can delete a client
router.delete('/:id', verifyToken, checkRole(['Admin']), clientController.deleteClient);

module.exports = router;
