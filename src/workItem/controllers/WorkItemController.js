const WorkItemService = require('../services/WorkItemService');
const { successResponse, errorResponse, notFoundResponse } = require('../../utils/respondHandler');

class WorkItemController {
    static async createWorkItem(req, res) {
        try {
            const { title, description, status, priority, assignedTo, tags, dueDate } = req.body;
            const createdById = req.admin.id;

            const result = await WorkItemService.createWorkItem(
                { title, description, status, priority, assignedTo, tags, dueDate },
                createdById
            );

            return successResponse(res, result, 'Work item created successfully', 201);
        } catch (error) {
            console.error('Error creating work item:', error);
            return errorResponse(res, error.message || 'Failed to create work item', 400);
        }
    }

    static async getWorkItemById(req, res) {
        try {
            const { id } = req.params;

            const result = await WorkItemService.getWorkItemById(id);

            return successResponse(res, result, 'Work item retrieved successfully');
        } catch (error) {
            console.error('Error fetching work item:', error);
            if (error.message === 'Work item not found') {
                return notFoundResponse(res, 'Work item');
            }
            return errorResponse(res, error.message || 'Failed to fetch work item', 400);
        }
    }

    static async getAssigneeList(req, res) {
        try {
            const result = await WorkItemService.getAssigneeList();
            return successResponse(res, result, 'Assignee list retrieved successfully');
        } catch (error) {
            console.error('Error fetching assignee list:', error);
            return errorResponse(res, error.message || 'Failed to fetch assignee list', 400);
        }
    }

    static async getAvailableUsers(req, res) {
        try {
            const result = await WorkItemService.getAvailableUsers();
            return successResponse(res, result, 'Available users retrieved successfully');
        } catch (error) {
            console.error('Error fetching available users:', error);
            return errorResponse(res, error.message || 'Failed to fetch available users', 400);
        }
    }

    static async getAllWorkItems(req, res) {
        try {
            const {
                status,
                priority,
                assignedTo,
                createdBy,
                tags,
                search,
                includeDeleted,
                page,
                limit,
                sortBy,
                sortOrder
            } = req.query;

            const filters = {};
            if (status) filters.status = status.split(',');
            if (priority) filters.priority = priority.split(',');
            if (assignedTo) filters.assignedTo = assignedTo;
            if (createdBy) filters.createdBy = createdBy;
            if (tags) filters.tags = tags.split(',');
            if (search) filters.search = search;
            if (includeDeleted === 'true') filters.includeDeleted = true;

            const options = {};
            if (page) options.page = parseInt(page);
            if (limit) options.limit = parseInt(limit);
            if (sortBy) options.sortBy = sortBy;
            if (sortOrder) options.sortOrder = sortOrder;

            const result = await WorkItemService.getAllWorkItems(filters, options);

            return successResponse(res, result, 'Work items retrieved successfully');
        } catch (error) {
            console.error('Error fetching work items:', error);
            return errorResponse(res, error.message || 'Failed to fetch work items', 400);
        }
    }

    static async updateWorkItem(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const result = await WorkItemService.updateWorkItem(id, updateData);

            return successResponse(res, result, 'Work item updated successfully');
        } catch (error) {
            console.error('Error updating work item:', error);
            if (error.message === 'Work item not found') {
                return notFoundResponse(res, 'Work item');
            }
            return errorResponse(res, error.message || 'Failed to update work item', 400);
        }
    }

    static async deleteWorkItem(req, res) {
        try {
            const { id } = req.params;

            const result = await WorkItemService.deleteWorkItem(id);

            return successResponse(res, result, 'Work item deleted successfully');
        } catch (error) {
            console.error('Error deleting work item:', error);
            if (error.message === 'Work item not found') {
                return notFoundResponse(res, 'Work item');
            }
            return errorResponse(res, error.message || 'Failed to delete work item', 400);
        }
    }

    static async permanentlyDeleteWorkItem(req, res) {
        try {
            const { id } = req.params;

            const result = await WorkItemService.permanentlyDeleteWorkItem(id);

            return successResponse(res, result, 'Work item permanently deleted successfully');
        } catch (error) {
            console.error('Error permanently deleting work item:', error);
            if (error.message === 'Work item not found') {
                return notFoundResponse(res, 'Work item');
            }
            return errorResponse(res, error.message || 'Failed to permanently delete work item', 400);
        }
    }

    static async restoreWorkItem(req, res) {
        try {
            const { id } = req.params;

            const result = await WorkItemService.restoreWorkItem(id);

            return successResponse(res, result, 'Work item restored successfully');
        } catch (error) {
            console.error('Error restoring work item:', error);
            if (error.message === 'Deleted work item not found') {
                return notFoundResponse(res, 'Deleted work item');
            }
            return errorResponse(res, error.message || 'Failed to restore work item', 400);
        }
    }

    static async getWorkItemsByStatus(req, res) {
        try {
            const { status } = req.params;

            const result = await WorkItemService.getWorkItemsByStatus(status);

            return successResponse(res, result, 'Work items retrieved successfully');
        } catch (error) {
            console.error('Error fetching work items by status:', error);
            return errorResponse(res, error.message || 'Failed to fetch work items', 400);
        }
    }

    static async getMyAssignedWorkItems(req, res) {
        try {
            const userId = req.admin.id;

            const result = await WorkItemService.getMyAssignedWorkItems(userId);

            return successResponse(res, result, 'Assigned work items retrieved successfully');
        } catch (error) {
            console.error('Error fetching assigned work items:', error);
            return errorResponse(res, error.message || 'Failed to fetch assigned work items', 400);
        }
    }

    static async getMyCreatedWorkItems(req, res) {
        try {
            const userId = req.admin.id;

            const result = await WorkItemService.getMyCreatedWorkItems(userId);

            return successResponse(res, result, 'Created work items retrieved successfully');
        } catch (error) {
            console.error('Error fetching created work items:', error);
            return errorResponse(res, error.message || 'Failed to fetch created work items', 400);
        }
    }

    static async getOverdueWorkItems(req, res) {
        try {
            const result = await WorkItemService.getOverdueWorkItems();

            return successResponse(res, result, 'Overdue work items retrieved successfully');
        } catch (error) {
            console.error('Error fetching overdue work items:', error);
            return errorResponse(res, error.message || 'Failed to fetch overdue work items', 400);
        }
    }

    static async getWorkItemStats(req, res) {
        try {
            const { createdBy, assignedTo } = req.query;

            const filters = {};
            if (createdBy) filters.createdBy = createdBy;
            if (assignedTo) filters.assignedTo = assignedTo;

            const result = await WorkItemService.getWorkItemStats(filters);

            return successResponse(res, result, 'Work item statistics retrieved successfully');
        } catch (error) {
            console.error('Error fetching work item stats:', error);
            return errorResponse(res, error.message || 'Failed to fetch work item statistics', 400);
        }
    }

    // NEW METHOD: Get current user's work item stats
    static async getMyWorkItemStats(req, res) {
        try {
            const userId = req.admin.id;

            const result = await WorkItemService.getMyWorkItemStats(userId);

            return successResponse(res, result, 'Your work item statistics retrieved successfully');
        } catch (error) {
            console.error('Error fetching user work item stats:', error);
            return errorResponse(res, error.message || 'Failed to fetch your work item statistics', 400);
        }
    }

    static async bulkUpdateWorkItems(req, res) {
        try {
            const { ids, updateData } = req.body;

            if (!ids || !updateData) {
                return errorResponse(res, 'IDs and update data are required', 400);
            }

            const result = await WorkItemService.bulkUpdateWorkItems(ids, updateData);

            return successResponse(res, result, 'Work items bulk updated successfully');
        } catch (error) {
            console.error('Error bulk updating work items:', error);
            return errorResponse(res, error.message || 'Failed to bulk update work items', 400);
        }
    }
}

module.exports = WorkItemController;