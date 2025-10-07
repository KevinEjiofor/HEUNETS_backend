const express = require('express');
const router = express.Router();
const WorkItemController = require('../workItem/controllers/WorkItemController');
const { authenticate } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdmin');

router.use(authenticate, isAdmin);

// POST routes
router.post('/', WorkItemController.createWorkItem);
router.post('/:id/restore', WorkItemController.restoreWorkItem);

// GET routes - SPECIFIC ROUTES FIRST
router.get('/stats', WorkItemController.getWorkItemStats);
router.get('/stats/my', WorkItemController.getMyWorkItemStats); // NEW ROUTE
router.get('/my/assigned', WorkItemController.getMyAssignedWorkItems);
router.get('/my/created', WorkItemController.getMyCreatedWorkItems);
router.get('/overdue', WorkItemController.getOverdueWorkItems);
router.get('/assignees/list', WorkItemController.getAssigneeList);
router.get('/users/available', WorkItemController.getAvailableUsers);
router.get('/status/:status', WorkItemController.getWorkItemsByStatus);
router.get('/', WorkItemController.getAllWorkItems);

// ⚠️ DYNAMIC ROUTES SHOULD ALWAYS BE LAST
router.get('/:id', WorkItemController.getWorkItemById);

// PUT routes
router.put('/bulk', WorkItemController.bulkUpdateWorkItems)
router.put('/:id', WorkItemController.updateWorkItem);

// DELETE routes
router.delete('/:id/permanent', WorkItemController.permanentlyDeleteWorkItem);
router.delete('/:id', WorkItemController.deleteWorkItem);

module.exports = router;