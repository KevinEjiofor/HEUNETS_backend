const WorkItemService = require('../../../src/workItem/services/WorkItemService');
const {
    createWorkItem,
    findWorkItemById,
    findAllWorkItems,
    findWorkItemsByStatus,
    findWorkItemsByAssignee,
    findWorkItemsByCreator,
    updateWorkItem,
    deleteWorkItem,
    hardDeleteWorkItem,
    countWorkItemsByFilters
} = require('../../../src/workItem/data/repositories/workItemRepository');
const WorkItem = require('../../../src/workItem/data/models/workItemModel');
const Admin = require('../../../src/admin/data/models/adminModel');

// Mock all dependencies
jest.mock('../../../src/workItem/data/repositories/workItemRepository');
jest.mock('../../../src/workItem/data/models/workItemModel');
jest.mock('../../../src/admin/data/models/adminModel');

describe('WorkItemService', () => {
    let mockAdmin;
    let mockWorkItem;
    let mockWorkItems;

    // Helper function to create mock query chain
    const createMockQuery = (resolveValue) => ({
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation(callback => {
            return Promise.resolve(callback(resolveValue));
        })
    });

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock admin data
        mockAdmin = {
            _id: '507f1f77bcf86cd799439011',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            isActive: true,
            save: jest.fn()
        };

        // Mock work item data
        mockWorkItem = {
            _id: '68e45b40c9a4fb3370ef4df7',
            title: 'Test Work Item',
            description: 'Test Description',
            status: 'pending',
            priority: 'medium',
            createdBy: mockAdmin,
            assignedTo: mockAdmin,
            isActive: true,
            toJSON: jest.fn().mockReturnValue({
                id: '68e45b40c9a4fb3370ef4df7',
                title: 'Test Work Item',
                description: 'Test Description',
                status: 'pending',
                priority: 'medium',
                createdBy: {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john.doe@example.com',
                    fullName: 'John Doe'
                },
                assignedTo: {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john.doe@example.com',
                    fullName: 'John Doe'
                }
            }),
            save: jest.fn()
        };

        mockWorkItems = [mockWorkItem];

        // Mock repository responses
        createWorkItem.mockResolvedValue(mockWorkItem);
        findWorkItemById.mockResolvedValue(mockWorkItem);
        findAllWorkItems.mockResolvedValue({
            workItems: mockWorkItems,
            pagination: { total: 1, page: 1, pages: 1 }
        });
        findWorkItemsByStatus.mockResolvedValue({
            workItems: mockWorkItems
        });
        findWorkItemsByAssignee.mockResolvedValue({
            workItems: mockWorkItems
        });
        findWorkItemsByCreator.mockResolvedValue({
            workItems: mockWorkItems
        });
        updateWorkItem.mockResolvedValue(mockWorkItem);
        deleteWorkItem.mockResolvedValue(true);
        hardDeleteWorkItem.mockResolvedValue(true);
        countWorkItemsByFilters.mockResolvedValue(1);

        // Mock static methods with proper query chain
        WorkItem.findById.mockImplementation(() => createMockQuery(mockWorkItem));
        WorkItem.find.mockImplementation(() => ({
            populate: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue(mockWorkItems) // Return array directly for getOverdueWorkItems
        }));
        WorkItem.countDocuments.mockResolvedValue(1);
        WorkItem.distinct.mockResolvedValue([mockAdmin._id]);
        WorkItem.updateMany.mockResolvedValue({ modifiedCount: 2 });

        // Mock Admin methods
        Admin.findOne.mockResolvedValue(mockAdmin);
        Admin.find.mockImplementation((query, fields) => ({
            select: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue([mockAdmin])
        }));
    });

    describe('createWorkItem', () => {
        it('should create a work item successfully', async () => {
            const workItemData = {
                title: 'Test Work Item',
                description: 'This is a test description that is long enough',
                status: 'pending',
                priority: 'medium'
            };
            const createdById = '507f1f77bcf86cd799439011';

            const result = await WorkItemService.createWorkItem(workItemData, createdById);

            expect(createWorkItem).toHaveBeenCalledWith({
                title: 'Test Work Item',
                description: 'This is a test description that is long enough',
                createdBy: createdById,
                creatorModel: 'Admin',
                status: 'pending',
                priority: 'medium'
            });
            expect(WorkItem.findById).toHaveBeenCalledWith(mockWorkItem._id);
            expect(result).toHaveProperty('title', 'Test Work Item');
            expect(result.createdBy).toBeDefined();
            expect(result.assignedTo).toBeDefined();
        });

        it('should validate title length', async () => {
            const workItemData = {
                title: 'ab',
                description: 'Valid description length here'
            };

            await expect(WorkItemService.createWorkItem(workItemData, 'user123'))
                .rejects.toThrow('Title must be at least 3 characters long');
        });

        it('should validate description length', async () => {
            const workItemData = {
                title: 'Valid Title',
                description: 'short'
            };

            await expect(WorkItemService.createWorkItem(workItemData, 'user123'))
                .rejects.toThrow('Description must be at least 10 characters long');
        });

        it('should validate priority', async () => {
            const workItemData = {
                title: 'Valid Title',
                description: 'Valid description length here',
                priority: 'invalid'
            };

            await expect(WorkItemService.createWorkItem(workItemData, 'user123'))
                .rejects.toThrow('Invalid priority. Must be one of: low, medium, high, urgent');
        });

        it('should validate assignedTo email', async () => {
            const workItemData = {
                title: 'Valid Title',
                description: 'Valid description length here',
                assignedTo: 'invalid-email'
            };

            await expect(WorkItemService.createWorkItem(workItemData, 'user123'))
                .rejects.toThrow('assignedTo must be a valid email address');
        });

        it('should validate assignedTo user exists', async () => {
            const workItemData = {
                title: 'Valid Title',
                description: 'Valid description length here',
                assignedTo: 'nonexistent@example.com'
            };

            Admin.findOne.mockResolvedValue(null);

            await expect(WorkItemService.createWorkItem(workItemData, 'user123'))
                .rejects.toThrow('User with email nonexistent@example.com does not exist');
        });

        it('should handle assignedTo when provided', async () => {
            const workItemData = {
                title: 'Valid Title',
                description: 'Valid description length here',
                assignedTo: 'john.doe@example.com'
            };
            const createdById = '507f1f77bcf86cd799439011';

            await WorkItemService.createWorkItem(workItemData, createdById);

            expect(createWorkItem).toHaveBeenCalledWith(expect.objectContaining({
                assignedTo: mockAdmin._id,
                assigneeModel: 'Admin'
            }));
        });

        it('should handle due date validation', async () => {
            const workItemData = {
                title: 'Valid Title',
                description: 'Valid description length here',
                dueDate: '2020-01-01'
            };

            await expect(WorkItemService.createWorkItem(workItemData, 'user123'))
                .rejects.toThrow('Due date cannot be in the past');
        });
    });

    describe('getWorkItemById', () => {
        it('should return work item by id', async () => {
            const result = await WorkItemService.getWorkItemById('68e45b40c9a4fb3370ef4df7');

            expect(findWorkItemById).toHaveBeenCalledWith('68e45b40c9a4fb3370ef4df7');
            expect(result).toBeDefined();
            expect(result.title).toBe('Test Work Item');
        });

        it('should throw error if work item not found', async () => {
            findWorkItemById.mockResolvedValue(null);

            await expect(WorkItemService.getWorkItemById('nonexistent'))
                .rejects.toThrow('Work item not found');
        });
    });

    describe('getAllWorkItems', () => {
        it('should return all work items with default filters', async () => {
            const result = await WorkItemService.getAllWorkItems();

            expect(findAllWorkItems).toHaveBeenCalledWith(
                { isActive: true },
                { page: 1, limit: 10, sort: '-createdAt' }
            );
            expect(result.workItems).toHaveLength(1);
            expect(result.pagination).toBeDefined();
        });

        it('should apply filters correctly', async () => {
            const filters = {
                status: ['pending', 'in_progress'],
                priority: ['high'],
                search: 'test',
                includeDeleted: true
            };

            await WorkItemService.getAllWorkItems(filters);

            expect(findAllWorkItems).toHaveBeenCalledWith(
                {
                    status: { $in: ['pending', 'in_progress'] },
                    priority: { $in: ['high'] },
                    $or: [
                        { title: { $regex: 'test', $options: 'i' } },
                        { description: { $regex: 'test', $options: 'i' } }
                    ]
                },
                expect.any(Object)
            );
        });

        it('should filter by assignedTo email', async () => {
            const filters = {
                assignedTo: 'john.doe@example.com'
            };

            await WorkItemService.getAllWorkItems(filters);

            expect(Admin.findOne).toHaveBeenCalledWith({ email: 'john.doe@example.com' });
        });

        it('should handle search filter', async () => {
            const filters = {
                search: 'important task'
            };

            await WorkItemService.getAllWorkItems(filters);

            expect(findAllWorkItems).toHaveBeenCalledWith(
                {
                    isActive: true,
                    $or: [
                        { title: { $regex: 'important task', $options: 'i' } },
                        { description: { $regex: 'important task', $options: 'i' } }
                    ]
                },
                expect.any(Object)
            );
        });
    });

    describe('updateWorkItem', () => {
        it('should update work item successfully', async () => {
            const updateData = {
                title: 'Updated Title',
                status: 'completed',
                priority: 'high'
            };

            const result = await WorkItemService.updateWorkItem('68e45b40c9a4fb3370ef4df7', updateData);

            expect(updateWorkItem).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should set completedAt when status changes to completed', async () => {
            const updateData = { status: 'completed' };

            await WorkItemService.updateWorkItem('68e45b40c9a4fb3370ef4df7', updateData);

            expect(updateWorkItem).toHaveBeenCalledWith(
                '68e45b40c9a4fb3370ef4df7',
                expect.objectContaining({
                    status: 'completed',
                    completedAt: expect.any(Date)
                })
            );
        });

        it('should clear completedAt when status changes from completed', async () => {
            mockWorkItem.status = 'completed';
            const updateData = { status: 'in_progress' };

            await WorkItemService.updateWorkItem('68e45b40c9a4fb3370ef4df7', updateData);

            expect(updateWorkItem).toHaveBeenCalledWith(
                '68e45b40c9a4fb3370ef4df7',
                expect.objectContaining({
                    status: 'in_progress',
                    completedAt: null
                })
            );
        });

        it('should validate assignedTo email during update', async () => {
            const updateData = {
                assignedTo: 'invalid-email'
            };

            await expect(WorkItemService.updateWorkItem('68e45b40c9a4fb3370ef4df7', updateData))
                .rejects.toThrow('assignedTo must be a valid email address');
        });
    });

    describe('deleteWorkItem', () => {
        it('should delete work item successfully', async () => {
            const result = await WorkItemService.deleteWorkItem('68e45b40c9a4fb3370ef4df7');

            expect(deleteWorkItem).toHaveBeenCalledWith('68e45b40c9a4fb3370ef4df7');
            expect(result).toEqual({ message: 'Work item deleted successfully' });
        });

        it('should throw error if work item not found for deletion', async () => {
            findWorkItemById.mockResolvedValue(null);

            await expect(WorkItemService.deleteWorkItem('nonexistent'))
                .rejects.toThrow('Work item not found');
        });
    });

    describe('permanentlyDeleteWorkItem', () => {
        it('should permanently delete work item', async () => {
            WorkItem.findById.mockImplementation(() => createMockQuery(mockWorkItem));

            const result = await WorkItemService.permanentlyDeleteWorkItem('68e45b40c9a4fb3370ef4df7');

            expect(hardDeleteWorkItem).toHaveBeenCalledWith('68e45b40c9a4fb3370ef4df7');
            expect(result).toEqual({ message: 'Work item permanently deleted successfully' });
        });

        it('should throw error if work item not found for permanent deletion', async () => {
            WorkItem.findById.mockImplementation(() => createMockQuery(null));

            await expect(WorkItemService.permanentlyDeleteWorkItem('nonexistent'))
                .rejects.toThrow('Work item not found');
        });
    });

    describe('restoreWorkItem', () => {
        it('should restore deleted work item', async () => {
            const deletedWorkItem = {
                ...mockWorkItem,
                isActive: false,
                save: jest.fn().mockResolvedValue(mockWorkItem)
            };

            WorkItem.findById.mockImplementation(() => createMockQuery(deletedWorkItem));

            const result = await WorkItemService.restoreWorkItem('68e45b40c9a4fb3370ef4df7');

            expect(deletedWorkItem.save).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should throw error if work item not found for restoration', async () => {
            WorkItem.findById.mockImplementation(() => createMockQuery(null));

            await expect(WorkItemService.restoreWorkItem('nonexistent'))
                .rejects.toThrow('Deleted work item not found');
        });

        it('should throw error if work item is not deleted', async () => {
            WorkItem.findById.mockImplementation(() => createMockQuery(mockWorkItem));

            await expect(WorkItemService.restoreWorkItem('68e45b40c9a4fb3370ef4df7'))
                .rejects.toThrow('Work item is not deleted');
        });
    });

    describe('getWorkItemsByStatus', () => {
        it('should return work items by valid status', async () => {
            const result = await WorkItemService.getWorkItemsByStatus('pending');

            expect(findWorkItemsByStatus).toHaveBeenCalledWith('pending', { limit: 1000 });
            expect(result).toHaveLength(1);
        });

        it('should throw error for invalid status', async () => {
            await expect(WorkItemService.getWorkItemsByStatus('invalid_status'))
                .rejects.toThrow('Invalid status. Must be one of: pending, in_progress, completed, cancelled');
        });
    });

    describe('getMyAssignedWorkItems', () => {
        it('should return assigned work items for user', async () => {
            const userId = '507f1f77bcf86cd799439011';
            const result = await WorkItemService.getMyAssignedWorkItems(userId);

            expect(findWorkItemsByAssignee).toHaveBeenCalledWith(userId, { limit: 1000 });
            expect(result).toHaveLength(1);
        });
    });

    describe('getMyCreatedWorkItems', () => {
        it('should return created work items for user', async () => {
            const userId = '507f1f77bcf86cd799439011';
            const result = await WorkItemService.getMyCreatedWorkItems(userId);

            expect(findWorkItemsByCreator).toHaveBeenCalledWith(userId, { limit: 1000 });
            expect(result).toHaveLength(1);
        });
    });

    describe('getOverdueWorkItems', () => {
        it('should return overdue work items', async () => {
            const result = await WorkItemService.getOverdueWorkItems();

            expect(WorkItem.find).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    describe('getWorkItemStats', () => {
        it('should return work item statistics', async () => {
            const result = await WorkItemService.getWorkItemStats();

            expect(countWorkItemsByFilters).toHaveBeenCalledTimes(5);
            expect(result).toEqual({
                total: 1,
                pending: 1,
                inProgress: 1,
                completed: 1,
                cancelled: 1,
                overdue: 1
            });
        });

        it('should filter stats by createdBy email', async () => {
            const filters = { createdBy: 'john.doe@example.com' };

            await WorkItemService.getWorkItemStats(filters);

            expect(Admin.findOne).toHaveBeenCalledWith({
                email: 'john.doe@example.com',
                isActive: true
            });
        });

        it('should filter stats by createdBy ID', async () => {
            const filters = { createdBy: '507f1f77bcf86cd799439011' };

            await WorkItemService.getWorkItemStats(filters);

            expect(countWorkItemsByFilters).toHaveBeenCalledWith(
                expect.objectContaining({ createdBy: '507f1f77bcf86cd799439011' })
            );
        });
    });

    describe('getMyWorkItemStats', () => {
        it('should return user work item statistics', async () => {
            const userId = '507f1f77bcf86cd799439011';
            const result = await WorkItemService.getMyWorkItemStats(userId);

            expect(result).toEqual({
                total: 1,
                pending: 1,
                inProgress: 1,
                completed: 1,
                cancelled: 1,
                overdue: 1,
                assigned: 1,
                created: 1,
                completionRate: 100,
                overdueRate: 100
            });
        });

        it('should throw error if user ID is not provided', async () => {
            await expect(WorkItemService.getMyWorkItemStats())
                .rejects.toThrow('User ID is required');
        });
    });

    describe('bulkUpdateWorkItems', () => {
        it('should bulk update work items successfully', async () => {
            const ids = ['68e45b40c9a4fb3370ef4df7', '68e4f03a63de8b9947f4811b'];
            const updateData = {
                status: 'completed',
                priority: 'high'
            };

            const result = await WorkItemService.bulkUpdateWorkItems(ids, updateData);

            expect(WorkItem.updateMany).toHaveBeenCalledWith(
                { _id: { $in: ids }, isActive: true },
                { $set: updateData }
            );
            expect(result).toEqual({
                message: 'Work items bulk updated successfully',
                modifiedCount: 2
            });
        });

        it('should throw error for empty IDs', async () => {
            await expect(WorkItemService.bulkUpdateWorkItems([], { status: 'completed' }))
                .rejects.toThrow('No work item IDs provided');
        });

        it('should throw error for no valid update fields', async () => {
            await expect(WorkItemService.bulkUpdateWorkItems(['id1'], {}))
                .rejects.toThrow('No valid update fields provided');
        });

        it('should handle assignedTo in bulk update', async () => {
            const ids = ['68e45b40c9a4fb3370ef4df7'];
            const updateData = {
                assignedTo: 'john.doe@example.com'
            };

            await WorkItemService.bulkUpdateWorkItems(ids, updateData);

            expect(WorkItem.updateMany).toHaveBeenCalledWith(
                { _id: { $in: ids }, isActive: true },
                { $set: {
                    assignedTo: mockAdmin._id,
                    assigneeModel: 'Admin'
                }}
            );
        });
    });

    describe('getAssigneeList', () => {
        it('should return assignee list', async () => {
            const result = await WorkItemService.getAssigneeList();

            expect(WorkItem.distinct).toHaveBeenCalledWith('assignedTo', {
                isActive: true,
                assignedTo: { $exists: true, $ne: null }
            });
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                fullName: 'John Doe'
            });
        });

        it('should return empty array if no assignees', async () => {
            WorkItem.distinct.mockResolvedValue([]);

            const result = await WorkItemService.getAssigneeList();

            expect(result).toEqual([]);
        });
    });

    describe('getAvailableUsers', () => {
        it('should return available users', async () => {
            const result = await WorkItemService.getAvailableUsers();

            expect(Admin.find).toHaveBeenCalledWith({ isActive: true }, 'firstName lastName email');
            expect(result).toHaveLength(1);
        });

        it('should handle errors gracefully', async () => {
            Admin.find.mockImplementation(() => {
                throw new Error('Database error');
            });

            await expect(WorkItemService.getAvailableUsers())
                .rejects.toThrow('Failed to fetch available users');
        });
    });

    describe('_formatWorkItem', () => {
        it('should format work item correctly', () => {
            const formatted = WorkItemService._formatWorkItem(mockWorkItem);

            expect(formatted.createdBy).toEqual({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                fullName: 'John Doe'
            });
            expect(formatted._id).toBeUndefined();
            expect(formatted.createdBy._id).toBeUndefined();
        });

        it('should handle null createdBy and assignedTo', () => {
            const itemWithoutUsers = {
                ...mockWorkItem,
                createdBy: null,
                assignedTo: null,
                toJSON: jest.fn().mockReturnValue({
                    id: '68e45b40c9a4fb3370ef4df7',
                    title: 'Test Work Item'
                })
            };

            const formatted = WorkItemService._formatWorkItem(itemWithoutUsers);

            expect(formatted.createdBy).toBeNull();
            expect(formatted.assignedTo).toBeNull();
        });
    });

    describe('_isValidObjectId', () => {
        it('should validate correct ObjectId', () => {
            const validId = '507f1f77bcf86cd799439011';
            expect(WorkItemService._isValidObjectId(validId)).toBe(true);
        });

        it('should invalidate incorrect ObjectId', () => {
            const invalidId = 'invalid-id';
            expect(WorkItemService._isValidObjectId(invalidId)).toBe(false);
        });
    });
});

