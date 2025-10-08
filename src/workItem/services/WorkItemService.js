const mongoose = require('mongoose');
const {
    createWorkItem,
    findWorkItemById,
    findAllWorkItems,
    findWorkItemsByCreator,
    findWorkItemsByAssignee,
    findWorkItemsByStatus,
    updateWorkItem,
    deleteWorkItem,
    hardDeleteWorkItem,
    countWorkItemsByFilters
} = require('../data/repositories/workItemRepository');
const updateWorkItemRepo = updateWorkItem;
const deleteWorkItemRepo = deleteWorkItem;
const WorkItem = require('../data/models/workItemModel');
const Admin = require('../../admin/data/models/adminModel');

class WorkItemService {
    async createWorkItem(workItemData, createdById) {
        const { title, description, status, priority, assignedTo, tags, dueDate } = workItemData;

        if (!title || title.trim().length < 3) {
            throw new Error('Title must be at least 3 characters long');
        }

        if (!description || description.trim().length < 10) {
            throw new Error('Description must be at least 10 characters long');
        }

        if (priority) {
            const validPriorities = ['low', 'medium', 'high', 'urgent'];
            if (!validPriorities.includes(priority)) {
                throw new Error('Invalid priority. Must be one of: low, medium, high, urgent');
            }
        }

        if (status) {
            const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid status. Must be one of: pending, in_progress, completed, cancelled');
            }
        }

        let assignedToId = null;
        if (assignedTo) {
            if (typeof assignedTo !== 'string') {
                throw new Error('assignedTo must be a string (email address)');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(assignedTo)) {
                throw new Error('assignedTo must be a valid email address');
            }

            const assignedUser = await Admin.findOne({ email: assignedTo.toLowerCase() });
            if (!assignedUser) {
                throw new Error(`User with email ${assignedTo} does not exist`);
            }
            assignedToId = assignedUser._id;
        }

        if (dueDate) {
            const dueDateObj = new Date(dueDate);
            if (isNaN(dueDateObj.getTime())) {
                throw new Error('Invalid due date format');
            }
            if (dueDateObj < new Date()) {
                throw new Error('Due date cannot be in the past');
            }
        }

        const newWorkItemData = {
            title: title.trim(),
            description: description.trim(),
            createdBy: createdById,
            creatorModel: 'Admin',
            status: status || 'pending',
            priority: priority || 'medium',
            ...(assignedToId && { assignedTo: assignedToId, assigneeModel: 'Admin' }),
            ...(tags && Array.isArray(tags) && { tags }),
            ...(dueDate && { dueDate })
        };

        const newWorkItem = await createWorkItem(newWorkItemData);

        const populatedWorkItem = await WorkItem.findById(newWorkItem._id)
            .populate([
                { path: 'createdBy', select: 'firstName lastName email' },
                { path: 'assignedTo', select: 'firstName lastName email' }
            ]);

        return this._formatWorkItem(populatedWorkItem);
    }

    async getWorkItemById(id) {
        const workItem = await findWorkItemById(id);
        if (!workItem) {
            throw new Error('Work item not found');
        }
        return this._formatWorkItem(workItem);
    }

    async getAllWorkItems(filters = {}, options = {}) {
        const queryFilters = {};

        if (!filters.includeDeleted) {
            queryFilters.isActive = true;
        }

        if (filters.status && filters.status.length > 0) {
            queryFilters.status = { $in: filters.status };
        }

        if (filters.priority && filters.priority.length > 0) {
            queryFilters.priority = { $in: filters.priority };
        }

        if (filters.assignedTo) {
            const assignedUser = await Admin.findOne({ email: filters.assignedTo.toLowerCase() });
            if (!assignedUser) {
                throw new Error(`User with email ${filters.assignedTo} does not exist`);
            }
            queryFilters.assignedTo = assignedUser._id;
        }

        if (filters.createdBy) {
            queryFilters.createdBy = filters.createdBy;
        }

        if (filters.tags && filters.tags.length > 0) {
            queryFilters.tags = { $in: filters.tags };
        }

        if (filters.search) {
            queryFilters.$or = [
                { title: { $regex: filters.search, $options: 'i' } },
                { description: { $regex: filters.search, $options: 'i' } }
            ];
        }

        const queryOptions = {
            page: options.page || 1,
            limit: options.limit || 10,
            sort: options.sortBy
                ? `${options.sortOrder === 'asc' ? '' : '-'}${options.sortBy}`
                : '-createdAt'
        };

        const result = await findAllWorkItems(queryFilters, queryOptions);

        return {
            workItems: result.workItems.map(item => this._formatWorkItem(item)),
            pagination: result.pagination
        };
    }

    async updateWorkItem(id, updateData) {
        const workItem = await findWorkItemById(id);
        if (!workItem) {
            throw new Error('Work item not found');
        }

        const allowedUpdates = ['title', 'description', 'status', 'priority', 'assignedTo', 'tags', 'dueDate'];
        const updates = {};

        Object.keys(updateData).forEach(key => {
            if (allowedUpdates.includes(key) && updateData[key] !== undefined) {
                updates[key] = updateData[key];
            }
        });

        if (updates.assignedTo) {
            if (typeof updates.assignedTo !== 'string') {
                throw new Error('assignedTo must be a string (email address)');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(updates.assignedTo)) {
                throw new Error('assignedTo must be a valid email address');
            }

            const assignedUser = await Admin.findOne({ email: updates.assignedTo.toLowerCase() });
            if (!assignedUser) {
                throw new Error(`User with email ${updates.assignedTo} does not exist`);
            }
            updates.assignedTo = assignedUser._id;
            updates.assigneeModel = 'Admin';
        }

        if (updates.status) {
            const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
            if (!validStatuses.includes(updates.status)) {
                throw new Error('Invalid status');
            }
        }

        if (updates.priority) {
            const validPriorities = ['low', 'medium', 'high', 'urgent'];
            if (!validPriorities.includes(updates.priority)) {
                throw new Error('Invalid priority');
            }
        }

        if (updates.status === 'completed' && workItem.status !== 'completed') {
            updates.completedAt = new Date();
        }

        if (updates.status && updates.status !== 'completed' && workItem.status === 'completed') {
            updates.completedAt = null;
        }

        const updatedWorkItem = await updateWorkItemRepo(id, updates);
        return this._formatWorkItem(updatedWorkItem);
    }

    async deleteWorkItem(id) {
        const workItem = await findWorkItemById(id);
        if (!workItem) {
            throw new Error('Work item not found');
        }

        await deleteWorkItemRepo(id);
        return { message: 'Work item deleted successfully' };
    }

    async permanentlyDeleteWorkItem(id) {
        const workItem = await WorkItem.findById(id);
        if (!workItem) {
            throw new Error('Work item not found');
        }

        await hardDeleteWorkItem(id);
        return { message: 'Work item permanently deleted successfully' };
    }

    async restoreWorkItem(id) {
        const workItem = await WorkItem.findById(id);
        if (!workItem) {
            throw new Error('Deleted work item not found');
        }

        if (workItem.isActive) {
            throw new Error('Work item is not deleted');
        }

        workItem.isActive = true;
        await workItem.save();

        const populatedWorkItem = await WorkItem.findById(id)
            .populate([
                { path: 'createdBy', select: 'firstName lastName email' },
                { path: 'assignedTo', select: 'firstName lastName email' }
            ]);

        return this._formatWorkItem(populatedWorkItem);
    }

    async getWorkItemsByStatus(status) {
        const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new Error('Invalid status. Must be one of: pending, in_progress, completed, cancelled');
        }

        const result = await findWorkItemsByStatus(status, { limit: 1000 });
        const workItems = (result && Array.isArray(result.workItems)) ? result.workItems : [];
        return workItems.map(item => this._formatWorkItem(item));
    }

    async getMyAssignedWorkItems(userId) {
        const result = await findWorkItemsByAssignee(userId, { limit: 1000 });
        const workItems = (result && Array.isArray(result.workItems)) ? result.workItems : [];
        return workItems.map(item => this._formatWorkItem(item));
    }

    async getMyCreatedWorkItems(userId) {
        const result = await findWorkItemsByCreator(userId, { limit: 1000 });
        const workItems = (result && Array.isArray(result.workItems)) ? result.workItems : [];
        return workItems.map(item => this._formatWorkItem(item));
    }

    async getOverdueWorkItems() {
        const workItems = await WorkItem.find({
            isActive: true,
            status: { $nin: ['completed', 'cancelled'] },
            dueDate: { $lt: new Date() }
        })
            .populate('createdBy', 'firstName lastName email')
            .populate('assignedTo', 'firstName lastName email')
            .sort('-dueDate') || []; // Ensure workItems is always an array

        if (!Array.isArray(workItems)) {
            throw new Error('Expected workItems to be an array');
        }

        return workItems.map(item => this._formatWorkItem(item));
    }

    async getWorkItemStats(filters = {}) {
        const queryFilters = { isActive: true };

        if (filters.createdBy) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailRegex.test(filters.createdBy)) {
                const createdUser = await Admin.findOne({
                    email: filters.createdBy.toLowerCase(),
                    isActive: true
                });
                if (!createdUser) {
                    throw new Error(`User with email ${filters.createdBy} does not exist`);
                }
                queryFilters.createdBy = createdUser._id;
            } else if (this._isValidObjectId(filters.createdBy)) {
                queryFilters.createdBy = filters.createdBy;
            } else {
                throw new Error('createdBy must be a valid user ID or email address');
            }
        }

        if (filters.assignedTo) {
            const assignedUser = await Admin.findOne({
                email: filters.assignedTo.toLowerCase(),
                isActive: true
            });
            if (!assignedUser) {
                throw new Error(`User with email ${filters.assignedTo} does not exist`);
            }
            queryFilters.assignedTo = assignedUser._id;
        }

        const [total, pending, inProgress, completed, cancelled, overdue] = await Promise.all([
            countWorkItemsByFilters(queryFilters),
            countWorkItemsByFilters({ ...queryFilters, status: 'pending' }),
            countWorkItemsByFilters({ ...queryFilters, status: 'in_progress' }),
            countWorkItemsByFilters({ ...queryFilters, status: 'completed' }),
            countWorkItemsByFilters({ ...queryFilters, status: 'cancelled' }),
            WorkItem.countDocuments({
                ...queryFilters,
                status: { $nin: ['completed', 'cancelled'] },
                dueDate: { $lt: new Date() }
            })
        ]);

        return {
            total,
            pending,
            inProgress,
            completed,
            cancelled,
            overdue
        };
    }

    async getMyWorkItemStats(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        const queryFilters = {
            isActive: true,
            $or: [
                { createdBy: userId },
                { assignedTo: userId }
            ]
        };

        const [total, pending, inProgress, completed, cancelled, overdue, assigned, created] = await Promise.all([
            countWorkItemsByFilters(queryFilters),
            countWorkItemsByFilters({ ...queryFilters, status: 'pending' }),
            countWorkItemsByFilters({ ...queryFilters, status: 'in_progress' }),
            countWorkItemsByFilters({ ...queryFilters, status: 'completed' }),
            countWorkItemsByFilters({ ...queryFilters, status: 'cancelled' }),
            WorkItem.countDocuments({
                ...queryFilters,
                status: { $nin: ['completed', 'cancelled'] },
                dueDate: { $lt: new Date() }
            }),
            countWorkItemsByFilters({
                isActive: true,
                assignedTo: userId
            }),
            countWorkItemsByFilters({
                isActive: true,
                createdBy: userId
            })
        ]);

        return {
            total,
            pending,
            inProgress,
            completed,
            cancelled,
            overdue,
            assigned,
            created,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            overdueRate: total > 0 ? Math.round((overdue / total) * 100) : 0
        };
    }

    async bulkUpdateWorkItems(ids, updateData) {
        if (!ids || ids.length === 0) {
            throw new Error('No work item IDs provided');
        }

        const allowedUpdates = ['status', 'priority', 'assignedTo', 'tags'];
        const updates = {};

        Object.keys(updateData).forEach(key => {
            if (allowedUpdates.includes(key) && updateData[key] !== undefined) {
                updates[key] = updateData[key];
            }
        });

        if (updates.assignedTo) {
            if (typeof updates.assignedTo !== 'string') {
                throw new Error('assignedTo must be a string (email address)');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(updates.assignedTo)) {
                throw new Error('assignedTo must be a valid email address');
            }

            const assignedUser = await Admin.findOne({ email: updates.assignedTo.toLowerCase() });
            if (!assignedUser) {
                throw new Error(`User with email ${updates.assignedTo} does not exist`);
            }
            updates.assignedTo = assignedUser._id;
            updates.assigneeModel = 'Admin';
        }

        if (Object.keys(updates).length === 0) {
            throw new Error('No valid update fields provided');
        }

        if (updates.status) {
            const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
            if (!validStatuses.includes(updates.status)) {
                throw new Error('Invalid status');
            }
        }

        if (updates.priority) {
            const validPriorities = ['low', 'medium', 'high', 'urgent'];
            if (!validPriorities.includes(updates.priority)) {
                throw new Error('Invalid priority');
            }
        }

        const result = await WorkItem.updateMany(
            { _id: { $in: ids }, isActive: true },
            { $set: updates }
        );

        return {
            message: 'Work items bulk updated successfully',
            modifiedCount: result.modifiedCount
        };
    }

    async getAssigneeList() {
        try {
            const assignedUserIds = await WorkItem.distinct('assignedTo', {
                isActive: true,
                assignedTo: { $exists: true, $ne: null }
            });

            if (assignedUserIds.length === 0) {
                return [];
            }

            const assignedUsers = await Admin.find({
                _id: { $in: assignedUserIds },
                isActive: true
            }, 'firstName lastName email').sort('firstName lastName');

            return assignedUsers.map(user => ({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim()
            }));

        } catch {
            return [];
        }
    }

    async getAvailableUsers() {
        try {
            const users = await Admin.find({
                isActive: true
            }, 'firstName lastName email').sort('firstName lastName');

            return users.map(user => ({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                fullName: `${user.firstName} ${user.lastName}`
            }));
        } catch {
            throw new Error('Failed to fetch available users');
        }
    }

    _isValidObjectId(id) {
        return /^[0-9a-fA-F]{24}$/.test(id);
    }

    _formatWorkItem(item) {
        const itemObj = item.toJSON();

        const formattedItem = {
            ...itemObj,
            createdBy: item.createdBy ? {
                firstName: item.createdBy.firstName,
                lastName: item.createdBy.lastName,
                email: item.createdBy.email,
                fullName: `${item.createdBy.firstName} ${item.createdBy.lastName}`
            } : null,
            assignedTo: item.assignedTo ? {
                firstName: item.assignedTo.firstName,
                lastName: item.assignedTo.lastName,
                email: item.assignedTo.email,
                fullName: `${item.assignedTo.firstName} ${item.assignedTo.lastName}`
            } : null
        };

        delete formattedItem._id;
        if (formattedItem.createdBy) delete formattedItem.createdBy._id;
        if (formattedItem.createdBy) delete formattedItem.createdBy.id;
        if (formattedItem.assignedTo) delete formattedItem.assignedTo._id;
        if (formattedItem.assignedTo) delete formattedItem.assignedTo.id;

        return formattedItem;
    }
}

module.exports = new WorkItemService();
