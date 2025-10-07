const WorkItemService = require('../../../src/workItem/services/WorkItemService');
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
} = require('../../../src/workItem/data/repositories/workItemRepository');
const WorkItem = require('../../../src/workItem/data/models/workItemModel');

// Mock the repository functions
jest.mock('../../../src/workItem/data/repositories/workItemRepository');
jest.mock('../../../src/workItem/data/models/workItemModel');

describe('WorkItemService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createWorkItem', () => {
        const mockCreatedById = '507f1f77bcf86cd799439011';
        const mockWorkItemData = {
            title: 'Test Work Item',
            description: 'This is a test work item description',
            status: 'pending',
            priority: 'high',
            assignedTo: '507f1f77bcf86cd799439012',
            tags: ['bug', 'urgent'],
            dueDate: new Date('2025-12-31')
        };

        it('should create a work item successfully', async () => {
            const mockCreatedWorkItem = {
                _id: '507f1f77bcf86cd799439013',
                ...mockWorkItemData,
                createdBy: mockCreatedById,
                creatorModel: 'Admin',
                assigneeModel: 'Admin'
            };

            const mockPopulatedData = {
                _id: '507f1f77bcf86cd799439013',
                ...mockWorkItemData,
                createdBy: {
                    _id: mockCreatedById,
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com'
                },
                assignedTo: {
                    _id: '507f1f77bcf86cd799439012',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    email: 'jane@example.com'
                }
            };

            const mockPopulatedWorkItem = {
                ...mockPopulatedData,
                toJSON: jest.fn().mockReturnValue(mockPopulatedData)
            };

            createWorkItem.mockResolvedValue(mockCreatedWorkItem);

            // Mock WorkItem.findById with proper chaining
            const mockExec = jest.fn().mockResolvedValue(mockPopulatedWorkItem);
            const mockPopulate = jest.fn().mockReturnValue({ exec: mockExec });
            WorkItem.findById = jest.fn().mockReturnValue({
                populate: mockPopulate
            });

            const result = await WorkItemService.createWorkItem(mockWorkItemData, mockCreatedById);

            expect(createWorkItem).toHaveBeenCalledWith({
                title: 'Test Work Item',
                description: 'This is a test work item description',
                createdBy: mockCreatedById,
                creatorModel: 'Admin',
                status: 'pending',
                priority: 'high',
                assignedTo: '507f1f77bcf86cd799439012',
                assigneeModel: 'Admin',
                tags: ['bug', 'urgent'],
                dueDate: mockWorkItemData.dueDate
            });
            expect(WorkItem.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439013');
            expect(mockPopulate).toHaveBeenCalledWith([
                { path: 'createdBy', select: 'firstName lastName email' },
                { path: 'assignedTo', select: 'firstName lastName email' }
            ]);
            expect(result).toBeDefined();
            expect(result.title).toBe('Test Work Item');
            expect(result.createdBy.firstName).toBe('John');
        });

        it('should throw error if title is too short', async () => {
            const invalidData = {
                ...mockWorkItemData,
                title: 'ab'
            };

            await expect(
                WorkItemService.createWorkItem(invalidData, mockCreatedById)
            ).rejects.toThrow('Title must be at least 3 characters long');
        });

        it('should throw error if description is too short', async () => {
            const invalidData = {
                ...mockWorkItemData,
                description: 'short'
            };

            await expect(
                WorkItemService.createWorkItem(invalidData, mockCreatedById)
            ).rejects.toThrow('Description must be at least 10 characters long');
        });

        it('should throw error if priority is invalid', async () => {
            const invalidData = {
                ...mockWorkItemData,
                priority: 'invalid'
            };

            await expect(
                WorkItemService.createWorkItem(invalidData, mockCreatedById)
            ).rejects.toThrow('Invalid priority. Must be one of: low, medium, high, urgent');
        });

        it('should throw error if status is invalid', async () => {
            const invalidData = {
                ...mockWorkItemData,
                status: 'invalid'
            };

            await expect(
                WorkItemService.createWorkItem(invalidData, mockCreatedById)
            ).rejects.toThrow('Invalid status. Must be one of: pending, in_progress, completed, cancelled');
        });

        it('should throw error if due date is in the past', async () => {
            const invalidData = {
                ...mockWorkItemData,
                dueDate: new Date('2020-01-01')
            };

            await expect(
                WorkItemService.createWorkItem(invalidData, mockCreatedById)
            ).rejects.toThrow('Due date cannot be in the past');
        });

        it('should create work item without optional fields', async () => {
            const minimalData = {
                title: 'Minimal Work Item',
                description: 'This is a minimal description'
            };

            const mockCreatedWorkItem = {
                _id: '507f1f77bcf86cd799439014',
                ...minimalData,
                createdBy: mockCreatedById,
                creatorModel: 'Admin',
                status: 'pending',
                priority: 'medium'
            };

            const mockPopulatedData = {
                _id: '507f1f77bcf86cd799439014',
                ...minimalData,
                createdBy: {
                    _id: mockCreatedById,
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com'
                },
                status: 'pending',
                priority: 'medium'
            };

            const mockPopulatedWorkItem = {
                ...mockPopulatedData,
                toJSON: jest.fn().mockReturnValue(mockPopulatedData)
            };

            createWorkItem.mockResolvedValue(mockCreatedWorkItem);

            const mockExec = jest.fn().mockResolvedValue(mockPopulatedWorkItem);
            const mockPopulate = jest.fn().mockReturnValue({ exec: mockExec });
            WorkItem.findById = jest.fn().mockReturnValue({
                populate: mockPopulate
            });

            const result = await WorkItemService.createWorkItem(minimalData, mockCreatedById);

            expect(result).toBeDefined();
            expect(result.status).toBe('pending');
            expect(result.priority).toBe('medium');
        });
    });

    describe('getWorkItemById', () => {
        it('should return work item by id', async () => {
            const mockWorkItem = {
                _id: '507f1f77bcf86cd799439013',
                title: 'Test Work Item',
                description: 'Description',
                status: 'pending',
                priority: 'medium',
                toJSON: jest.fn().mockReturnValue({
                    id: '507f1f77bcf86cd799439013',
                    title: 'Test Work Item'
                })
            };

            findWorkItemById.mockResolvedValue(mockWorkItem);

            const result = await WorkItemService.getWorkItemById('507f1f77bcf86cd799439013');

            expect(findWorkItemById).toHaveBeenCalledWith('507f1f77bcf86cd799439013');
            expect(result).toBeDefined();
            expect(mockWorkItem.toJSON).toHaveBeenCalled();
        });

        it('should throw error if work item not found', async () => {
            findWorkItemById.mockResolvedValue(null);

            await expect(
                WorkItemService.getWorkItemById('507f1f77bcf86cd799439013')
            ).rejects.toThrow('Work item not found');
        });
    });

    describe('getAllWorkItems', () => {
        it('should return all work items with pagination', async () => {
            const mockWorkItems = [
                {
                    _id: '1',
                    title: 'Item 1',
                    createdBy: { _id: 'admin1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
                    assignedTo: null,
                    toJSON: jest.fn().mockReturnValue({ title: 'Item 1' })
                },
                {
                    _id: '2',
                    title: 'Item 2',
                    createdBy: { _id: 'admin2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
                    assignedTo: { _id: 'admin3', firstName: 'Bob', lastName: 'Johnson', email: 'bob@example.com' },
                    toJSON: jest.fn().mockReturnValue({ title: 'Item 2' })
                }
            ];

            const mockResult = {
                workItems: mockWorkItems,
                pagination: {
                    total: 2,
                    page: 1,
                    pages: 1,
                    limit: 10
                }
            };

            findAllWorkItems.mockResolvedValue(mockResult);

            const result = await WorkItemService.getAllWorkItems({}, {});

            expect(findAllWorkItems).toHaveBeenCalled();
            expect(result.workItems).toHaveLength(2);
            expect(result.pagination).toBeDefined();
        });

        it('should apply filters correctly', async () => {
            const filters = {
                status: ['pending', 'in_progress'],
                priority: ['high'],
                search: 'test'
            };

            findAllWorkItems.mockResolvedValue({
                workItems: [],
                pagination: { total: 0, page: 1, pages: 0, limit: 10 }
            });

            await WorkItemService.getAllWorkItems(filters, {});

            expect(findAllWorkItems).toHaveBeenCalledWith(
                expect.objectContaining({
                    isActive: true,
                    status: { $in: ['pending', 'in_progress'] },
                    priority: { $in: ['high'] },
                    $or: [
                        { title: { $regex: 'test', $options: 'i' } },
                        { description: { $regex: 'test', $options: 'i' } }
                    ]
                }),
                expect.any(Object)
            );
        });
    });

    describe('updateWorkItem', () => {
        it('should update work item successfully', async () => {
            const mockWorkItem = {
                _id: '507f1f77bcf86cd799439013',
                title: 'Old Title',
                status: 'pending',
                createdBy: { _id: 'admin1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
                assignedTo: null,
                toJSON: jest.fn().mockReturnValue({ title: 'Old Title' })
            };

            const mockUpdatedWorkItem = {
                ...mockWorkItem,
                title: 'New Title',
                status: 'in_progress',
                createdBy: { _id: 'admin1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
                toJSON: jest.fn().mockReturnValue({ title: 'New Title' })
            };

            findWorkItemById.mockResolvedValue(mockWorkItem);
            updateWorkItem.mockResolvedValue(mockUpdatedWorkItem);

            const updateData = {
                title: 'New Title',
                status: 'in_progress'
            };

            const result = await WorkItemService.updateWorkItem('507f1f77bcf86cd799439013', updateData);

            expect(findWorkItemById).toHaveBeenCalledWith('507f1f77bcf86cd799439013');
            expect(updateWorkItem).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should throw error if work item not found', async () => {
            findWorkItemById.mockResolvedValue(null);

            await expect(
                WorkItemService.updateWorkItem('507f1f77bcf86cd799439013', { title: 'New Title' })
            ).rejects.toThrow('Work item not found');
        });

        it('should set completedAt when status changes to completed', async () => {
            const mockWorkItem = {
                _id: '507f1f77bcf86cd799439013',
                status: 'in_progress',
                createdBy: { _id: 'admin1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
                toJSON: jest.fn()
            };

            const mockUpdatedWorkItem = {
                ...mockWorkItem,
                status: 'completed',
                completedAt: new Date(),
                toJSON: jest.fn().mockReturnValue({ status: 'completed' })
            };

            findWorkItemById.mockResolvedValue(mockWorkItem);
            updateWorkItem.mockResolvedValue(mockUpdatedWorkItem);

            await WorkItemService.updateWorkItem('507f1f77bcf86cd799439013', { status: 'completed' });

            expect(updateWorkItem).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439013',
                expect.objectContaining({
                    status: 'completed',
                    completedAt: expect.any(Date)
                })
            );
        });
    });

    describe('deleteWorkItem', () => {
        it('should delete work item successfully', async () => {
            const mockWorkItem = {
                _id: '507f1f77bcf86cd799439013',
                title: 'Test Item'
            };

            findWorkItemById.mockResolvedValue(mockWorkItem);
            deleteWorkItem.mockResolvedValue(mockWorkItem);

            const result = await WorkItemService.deleteWorkItem('507f1f77bcf86cd799439013');

            expect(findWorkItemById).toHaveBeenCalledWith('507f1f77bcf86cd799439013');
            expect(deleteWorkItem).toHaveBeenCalledWith('507f1f77bcf86cd799439013');
            expect(result.message).toBe('Work item deleted successfully');
        });

        it('should throw error if work item not found', async () => {
            findWorkItemById.mockResolvedValue(null);

            await expect(
                WorkItemService.deleteWorkItem('507f1f77bcf86cd799439013')
            ).rejects.toThrow('Work item not found');
        });
    });

    describe('permanentlyDeleteWorkItem', () => {
        it('should permanently delete work item', async () => {
            const mockWorkItem = {
                _id: '507f1f77bcf86cd799439013',
                title: 'Test Item'
            };

            WorkItem.findById = jest.fn().mockResolvedValue(mockWorkItem);
            hardDeleteWorkItem.mockResolvedValue(mockWorkItem);

            const result = await WorkItemService.permanentlyDeleteWorkItem('507f1f77bcf86cd799439013');

            expect(WorkItem.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439013');
            expect(hardDeleteWorkItem).toHaveBeenCalledWith('507f1f77bcf86cd799439013');
            expect(result.message).toBe('Work item permanently deleted successfully');
        });
    });

    describe('getWorkItemsByStatus', () => {
        it('should return work items by status', async () => {
            const mockWorkItems = [
                {
                    _id: '1',
                    status: 'pending',
                    createdBy: { _id: 'admin1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
                    assignedTo: null,
                    toJSON: jest.fn().mockReturnValue({ status: 'pending' })
                }
            ];

            findWorkItemsByStatus.mockResolvedValue({
                workItems: mockWorkItems
            });

            const result = await WorkItemService.getWorkItemsByStatus('pending');

            expect(findWorkItemsByStatus).toHaveBeenCalledWith('pending', { limit: 1000 });
            expect(result).toHaveLength(1);
        });

        it('should throw error for invalid status', async () => {
            await expect(
                WorkItemService.getWorkItemsByStatus('invalid_status')
            ).rejects.toThrow('Invalid status. Must be one of: pending, in_progress, completed, cancelled');
        });
    });

    describe('getWorkItemStats', () => {
        it('should return work item statistics', async () => {
            countWorkItemsByFilters.mockResolvedValueOnce(100); // total
            countWorkItemsByFilters.mockResolvedValueOnce(30);  // pending
            countWorkItemsByFilters.mockResolvedValueOnce(40);  // in_progress
            countWorkItemsByFilters.mockResolvedValueOnce(20);  // completed
            countWorkItemsByFilters.mockResolvedValueOnce(10);  // cancelled
            WorkItem.countDocuments = jest.fn().mockResolvedValue(5); // overdue

            const result = await WorkItemService.getWorkItemStats({});

            expect(result).toEqual({
                total: 100,
                pending: 30,
                inProgress: 40,
                completed: 20,
                cancelled: 10,
                overdue: 5
            });
        });
    });

    describe('bulkUpdateWorkItems', () => {
        it('should bulk update work items successfully', async () => {
            const ids = ['id1', 'id2', 'id3'];
            const updateData = { status: 'completed' };

            WorkItem.updateMany = jest.fn().mockResolvedValue({
                modifiedCount: 3
            });

            const result = await WorkItemService.bulkUpdateWorkItems(ids, updateData);

            expect(WorkItem.updateMany).toHaveBeenCalledWith(
                { _id: { $in: ids }, isActive: true },
                { $set: { status: 'completed' } }
            );
            expect(result.message).toBe('Work items bulk updated successfully');
            expect(result.modifiedCount).toBe(3);
        });

        it('should throw error if no IDs provided', async () => {
            await expect(
                WorkItemService.bulkUpdateWorkItems([], { status: 'completed' })
            ).rejects.toThrow('No work item IDs provided');
        });

        it('should throw error if no valid update fields', async () => {
            await expect(
                WorkItemService.bulkUpdateWorkItems(['id1'], { invalidField: 'value' })
            ).rejects.toThrow('No valid update fields provided');
        });
    });
});