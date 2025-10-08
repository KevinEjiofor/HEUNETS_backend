const WorkItemController = require('../../../src/workItem/controllers/WorkItemController');
const WorkItemService = require('../../../src/workItem/services/WorkItemService');
const { successResponse, errorResponse, notFoundResponse } = require('../../../src/utils/respondHandler');

// Mock dependencies
jest.mock('../../../src/workItem/services/WorkItemService');
jest.mock('../../../src/utils/respondHandler');

describe('WorkItemController', () => {
    let mockReq, mockRes;

    beforeEach(() => {
        mockReq = {
            body: {},
            params: {},
            query: {},
            admin: { id: 'admin123' }
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };


        jest.clearAllMocks();


        jest.spyOn(console, 'error').mockImplementation(() => {});


        successResponse.mockImplementation((res, data, message, statusCode = 200) => ({
            status: statusCode,
            data,
            message
        }));

        errorResponse.mockImplementation((res, message, statusCode = 400) => ({
            status: statusCode,
            error: message
        }));

        notFoundResponse.mockImplementation((res, entity) => ({
            status: 404,
            error: `${entity} not found`
        }));
    });

    describe('createWorkItem', () => {
        it('should create a work item successfully', async () => {
            const mockWorkItemData = {
                title: 'Test Work Item',
                description: 'Test Description',
                status: 'pending',
                priority: 'high',
                assignedTo: 'user123',
                tags: ['tag1', 'tag2'],
                dueDate: '2024-12-31'
            };

            const mockResult = { id: 'workitem123', ...mockWorkItemData };

            mockReq.body = mockWorkItemData;
            WorkItemService.createWorkItem.mockResolvedValue(mockResult);

            await WorkItemController.createWorkItem(mockReq, mockRes);

            expect(WorkItemService.createWorkItem).toHaveBeenCalledWith(
                mockWorkItemData,
                'admin123'
            );
            expect(successResponse).toHaveBeenCalledWith(
                mockRes,
                mockResult,
                'Work item created successfully',
                201
            );
        });

        it('should handle errors when creating work item', async () => {
            const error = new Error('Database error');
            mockReq.body = { title: 'Test' };
            WorkItemService.createWorkItem.mockRejectedValue(error);

            await WorkItemController.createWorkItem(mockReq, mockRes);

            expect(errorResponse).toHaveBeenCalledWith(
                mockRes,
                'Database error',
                400
            );
        });

        it('should handle generic errors', async () => {
            mockReq.body = { title: 'Test' };
            WorkItemService.createWorkItem.mockRejectedValue(new Error());

            await WorkItemController.createWorkItem(mockReq, mockRes);

            expect(errorResponse).toHaveBeenCalledWith(
                mockRes,
                'Failed to create work item',
                400
            );
        });
    });

    describe('getWorkItemById', () => {
        it('should retrieve work item by id successfully', async () => {
            const mockWorkItem = { id: 'workitem123', title: 'Test Item' };
            mockReq.params.id = 'workitem123';
            WorkItemService.getWorkItemById.mockResolvedValue(mockWorkItem);

            await WorkItemController.getWorkItemById(mockReq, mockRes);

            expect(WorkItemService.getWorkItemById).toHaveBeenCalledWith('workitem123');
            expect(successResponse).toHaveBeenCalledWith(
                mockRes,
                mockWorkItem,
                'Work item retrieved successfully'
            );
        });

        it('should handle work item not found', async () => {
            const error = new Error('Work item not found');
            mockReq.params.id = 'nonexistent';
            WorkItemService.getWorkItemById.mockRejectedValue(error);

            await WorkItemController.getWorkItemById(mockReq, mockRes);

            expect(notFoundResponse).toHaveBeenCalledWith(mockRes, 'Work item');
        });

        it('should handle other errors', async () => {
            const error = new Error('Database error');
            mockReq.params.id = 'workitem123';
            WorkItemService.getWorkItemById.mockRejectedValue(error);

            await WorkItemController.getWorkItemById(mockReq, mockRes);

            expect(errorResponse).toHaveBeenCalledWith(
                mockRes,
                'Database error',
                400
            );
        });
    });

    describe('getAssigneeList', () => {
        it('should retrieve assignee list successfully', async () => {
            const mockAssignees = [{ id: 'user1', name: 'User One' }];
            WorkItemService.getAssigneeList.mockResolvedValue(mockAssignees);

            await WorkItemController.getAssigneeList(mockReq, mockRes);

            expect(WorkItemService.getAssigneeList).toHaveBeenCalled();
            expect(successResponse).toHaveBeenCalledWith(
                mockRes,
                mockAssignees,
                'Assignee list retrieved successfully'
            );
        });

        it('should handle errors', async () => {
            WorkItemService.getAssigneeList.mockRejectedValue(new Error('Service error'));

            await WorkItemController.getAssigneeList(mockReq, mockRes);

            expect(errorResponse).toHaveBeenCalledWith(
                mockRes,
                'Service error',
                400
            );
        });
    });

    describe('getAvailableUsers', () => {
        it('should retrieve available users successfully', async () => {
            const mockUsers = [{ id: 'user1', name: 'User One' }];
            WorkItemService.getAvailableUsers.mockResolvedValue(mockUsers);

            await WorkItemController.getAvailableUsers(mockReq, mockRes);

            expect(WorkItemService.getAvailableUsers).toHaveBeenCalled();
            expect(successResponse).toHaveBeenCalledWith(
                mockRes,
                mockUsers,
                'Available users retrieved successfully'
            );
        });

        it('should handle errors', async () => {
            WorkItemService.getAvailableUsers.mockRejectedValue(new Error('Service error'));

            await WorkItemController.getAvailableUsers(mockReq, mockRes);

            expect(errorResponse).toHaveBeenCalledWith(
                mockRes,
                'Service error',
                400
            );
        });
    });

    describe('getAllWorkItems', () => {
        it('should retrieve all work items with filters and options', async () => {
            const mockResult = {
                items: [{ id: '1', title: 'Item 1' }],
                total: 1,
                page: 1,
                limit: 10
            };

            mockReq.query = {
                status: 'pending,completed',
                priority: 'high,medium',
                assignedTo: 'user123',
                createdBy: 'admin123',
                tags: 'urgent,important',
                search: 'test',
                includeDeleted: 'true',
                page: '1',
                limit: '10',
                sortBy: 'createdAt',
                sortOrder: 'desc'
            };

            WorkItemService.getAllWorkItems.mockResolvedValue(mockResult);

            await WorkItemController.getAllWorkItems(mockReq, mockRes);

            const expectedFilters = {
                status: ['pending', 'completed'],
                priority: ['high', 'medium'],
                assignedTo: 'user123',
                createdBy: 'admin123',
                tags: ['urgent', 'important'],
                search: 'test',
                includeDeleted: true
            };

            const expectedOptions = {
                page: 1,
                limit: 10,
                sortBy: 'createdAt',
                sortOrder: 'desc'
            };

            expect(WorkItemService.getAllWorkItems).toHaveBeenCalledWith(
                expectedFilters,
                expectedOptions
            );
            expect(successResponse).toHaveBeenCalledWith(
                mockRes,
                mockResult,
                'Work items retrieved successfully'
            );
        });

        it('should handle errors', async () => {
            mockReq.query = {};
            WorkItemService.getAllWorkItems.mockRejectedValue(new Error('Service error'));

            await WorkItemController.getAllWorkItems(mockReq, mockRes);

            expect(errorResponse).toHaveBeenCalledWith(
                mockRes,
                'Service error',
                400
            );
        });
    });

    describe('updateWorkItem', () => {
        it('should update work item successfully', async () => {
            const mockUpdateData = { title: 'Updated Title', status: 'completed' };
            const mockResult = { id: 'workitem123', ...mockUpdateData };

            mockReq.params.id = 'workitem123';
            mockReq.body = mockUpdateData;
            WorkItemService.updateWorkItem.mockResolvedValue(mockResult);

            await WorkItemController.updateWorkItem(mockReq, mockRes);

            expect(WorkItemService.updateWorkItem).toHaveBeenCalledWith(
                'workitem123',
                mockUpdateData
            );
            expect(successResponse).toHaveBeenCalledWith(
                mockRes,
                mockResult,
                'Work item updated successfully'
            );
        });

        it('should handle work item not found during update', async () => {
            const error = new Error('Work item not found');
            mockReq.params.id = 'nonexistent';
            mockReq.body = { title: 'Updated' };
            WorkItemService.updateWorkItem.mockRejectedValue(error);

            await WorkItemController.updateWorkItem(mockReq, mockRes);

            expect(notFoundResponse).toHaveBeenCalledWith(mockRes, 'Work item');
        });

        it('should handle other update errors', async () => {
            const error = new Error('Update failed');
            mockReq.params.id = 'workitem123';
            mockReq.body = { title: 'Updated' };
            WorkItemService.updateWorkItem.mockRejectedValue(error);

            await WorkItemController.updateWorkItem(mockReq, mockRes);

            expect(errorResponse).toHaveBeenCalledWith(
                mockRes,
                'Update failed',
                400
            );
        });
    });

    describe('deleteWorkItem', () => {
        it('should delete work item successfully', async () => {
            const mockResult = { id: 'workitem123', deleted: true };
            mockReq.params.id = 'workitem123';
            WorkItemService.deleteWorkItem.mockResolvedValue(mockResult);

            await WorkItemController.deleteWorkItem(mockReq, mockRes);

            expect(WorkItemService.deleteWorkItem).toHaveBeenCalledWith('workitem123');
            expect(successResponse).toHaveBeenCalledWith(
                mockRes,
                mockResult,
                'Work item deleted successfully'
            );
        });

        it('should handle work item not found during deletion', async () => {
            const error = new Error('Work item not found');
            mockReq.params.id = 'nonexistent';
            WorkItemService.deleteWorkItem.mockRejectedValue(error);

            await WorkItemController.deleteWorkItem(mockReq, mockRes);

            expect(notFoundResponse).toHaveBeenCalledWith(mockRes, 'Work item');
        });
    });

    describe('permanentlyDeleteWorkItem', () => {
        it('should permanently delete work item successfully', async () => {
            const mockResult = { id: 'workitem123', permanentlyDeleted: true };
            mockReq.params.id = 'workitem123';
            WorkItemService.permanentlyDeleteWorkItem.mockResolvedValue(mockResult);

            await WorkItemController.permanentlyDeleteWorkItem(mockReq, mockRes);

            expect(WorkItemService.permanentlyDeleteWorkItem).toHaveBeenCalledWith('workitem123');
            expect(successResponse).toHaveBeenCalledWith(
                mockRes,
                mockResult,
                'Work item permanently deleted successfully'
            );
        });

        it('should handle work item not found during permanent deletion', async () => {
            const error = new Error('Work item not found');
            mockReq.params.id = 'nonexistent';
            WorkItemService.permanentlyDeleteWorkItem.mockRejectedValue(error);

            await WorkItemController.permanentlyDeleteWorkItem(mockReq, mockRes);

            expect(notFoundResponse).toHaveBeenCalledWith(mockRes, 'Work item');
        });
    });

    describe('restoreWorkItem', () => {
        it('should restore work item successfully', async () => {
            const mockResult = { id: 'workitem123', restored: true };
            mockReq.params.id = 'workitem123';
            WorkItemService.restoreWorkItem.mockResolvedValue(mockResult);

            await WorkItemController.restoreWorkItem(mockReq, mockRes);

            expect(WorkItemService.restoreWorkItem).toHaveBeenCalledWith('workitem123');
            expect(successResponse).toHaveBeenCalledWith(
                mockRes,
                mockResult,
                'Work item restored successfully'
            );
        });

        it('should handle deleted work item not found during restoration', async () => {
            const error = new Error('Deleted work item not found');
            mockReq.params.id = 'nonexistent';
            WorkItemService.restoreWorkItem.mockRejectedValue(error);

            await WorkItemController.restoreWorkItem(mockReq, mockRes);

            expect(notFoundResponse).toHaveBeenCalledWith(mockRes, 'Deleted work item');
        });
    });

    describe('getWorkItemsByStatus', () => {
        it('should retrieve work items by status successfully', async () => {
            const mockResult = [{ id: '1', status: 'pending' }];
            mockReq.params.status = 'pending';
            WorkItemService.getWorkItemsByStatus.mockResolvedValue(mockResult);

            await WorkItemController.getWorkItemsByStatus(mockReq, mockRes);

            expect(WorkItemService.getWorkItemsByStatus).toHaveBeenCalledWith('pending');
            expect(successResponse).toHaveBeenCalledWith(
                mockRes,
                mockResult,
                'Work items retrieved successfully'
            );
        });

        it('should handle errors', async () => {
            mockReq.params.status = 'pending';
            WorkItemService.getWorkItemsByStatus.mockRejectedValue(new Error('Service error'));

            await WorkItemController.getWorkItemsByStatus(mockReq, mockRes);

            expect(errorResponse).toHaveBeenCalledWith(
                mockRes,
                'Service error',
                400
            );
        });
    });

    describe('getMyAssignedWorkItems', () => {
        it('should retrieve assigned work items successfully', async () => {
            const mockResult = [{ id: '1', assignedTo: 'admin123' }];
            WorkItemService.getMyAssignedWorkItems.mockResolvedValue(mockResult);

            await WorkItemController.getMyAssignedWorkItems(mockReq, mockRes);

            expect(WorkItemService.getMyAssignedWorkItems).toHaveBeenCalledWith('admin123');
            expect(successResponse).toHaveBeenCalledWith(
                mockRes,
                mockResult,
                'Assigned work items retrieved successfully'
            );
        });

        it('should handle errors', async () => {
            WorkItemService.getMyAssignedWorkItems.mockRejectedValue(new Error('Service error'));

            await WorkItemController.getMyAssignedWorkItems(mockReq, mockRes);

            expect(errorResponse).toHaveBeenCalledWith(
                mockRes,
                'Service error',
                400
            );
        });
    });

    describe('getMyCreatedWorkItems', () => {
        it('should retrieve created work items successfully', async () => {
            const mockResult = [{ id: '1', createdBy: 'admin123' }];
            WorkItemService.getMyCreatedWorkItems.mockResolvedValue(mockResult);

            await WorkItemController.getMyCreatedWorkItems(mockReq, mockRes);

            expect(WorkItemService.getMyCreatedWorkItems).toHaveBeenCalledWith('admin123');
            expect(successResponse).toHaveBeenCalledWith(
                mockRes,
                mockResult,
                'Created work items retrieved successfully'
            );
        });

        it('should handle errors', async () => {
            WorkItemService.getMyCreatedWorkItems.mockRejectedValue(new Error('Service error'));

            await WorkItemController.getMyCreatedWorkItems(mockReq, mockRes);

            expect(errorResponse).toHaveBeenCalledWith(
                mockRes,
                'Service error',
                400
            );
        });
    });

    describe('getOverdueWorkItems', () => {
        it('should retrieve overdue work items successfully', async () => {
            const mockResult = [{ id: '1', overdue: true }];
            WorkItemService.getOverdueWorkItems.mockResolvedValue(mockResult);

            await WorkItemController.getOverdueWorkItems(mockReq, mockRes);

            expect(WorkItemService.getOverdueWorkItems).toHaveBeenCalled();
            expect(successResponse).toHaveBeenCalledWith(
                mockRes,
                mockResult,
                'Overdue work items retrieved successfully'
            );
        });

        it('should handle errors', async () => {
            WorkItemService.getOverdueWorkItems.mockRejectedValue(new Error('Service error'));

            await WorkItemController.getOverdueWorkItems(mockReq, mockRes);

            expect(errorResponse).toHaveBeenCalledWith(
                mockRes,
                'Service error',
                400
            );
        });
    });

    describe('getWorkItemStats', () => {
        it('should retrieve work item stats with filters', async () => {
            const mockResult = { total: 10, completed: 5, pending: 3 };
            mockReq.query = { createdBy: 'admin123', assignedTo: 'user123' };
            WorkItemService.getWorkItemStats.mockResolvedValue(mockResult);

            await WorkItemController.getWorkItemStats(mockReq, mockRes);

            expect(WorkItemService.getWorkItemStats).toHaveBeenCalledWith({
                createdBy: 'admin123',
                assignedTo: 'user123'
            });
            expect(successResponse).toHaveBeenCalledWith(
                mockRes,
                mockResult,
                'Work item statistics retrieved successfully'
            );
        });

        it('should handle errors', async () => {
            mockReq.query = {};
            WorkItemService.getWorkItemStats.mockRejectedValue(new Error('Service error'));

            await WorkItemController.getWorkItemStats(mockReq, mockRes);

            expect(errorResponse).toHaveBeenCalledWith(
                mockRes,
                'Service error',
                400
            );
        });
    });

    describe('getMyWorkItemStats', () => {
        it('should retrieve current user work item stats successfully', async () => {
            const mockResult = { total: 5, assigned: 3, created: 2 };
            WorkItemService.getMyWorkItemStats.mockResolvedValue(mockResult);

            await WorkItemController.getMyWorkItemStats(mockReq, mockRes);

            expect(WorkItemService.getMyWorkItemStats).toHaveBeenCalledWith('admin123');
            expect(successResponse).toHaveBeenCalledWith(
                mockRes,
                mockResult,
                'Your work item statistics retrieved successfully'
            );
        });

        it('should handle errors', async () => {
            WorkItemService.getMyWorkItemStats.mockRejectedValue(new Error('Service error'));

            await WorkItemController.getMyWorkItemStats(mockReq, mockRes);

            expect(errorResponse).toHaveBeenCalledWith(
                mockRes,
                'Service error',
                400
            );
        });
    });

    describe('bulkUpdateWorkItems', () => {
        it('should bulk update work items successfully', async () => {
            const mockBulkData = {
                ids: ['1', '2', '3'],
                updateData: { status: 'completed' }
            };
            const mockResult = { updated: 3 };

            mockReq.body = mockBulkData;
            WorkItemService.bulkUpdateWorkItems.mockResolvedValue(mockResult);

            await WorkItemController.bulkUpdateWorkItems(mockReq, mockRes);

            expect(WorkItemService.bulkUpdateWorkItems).toHaveBeenCalledWith(
                mockBulkData.ids,
                mockBulkData.updateData
            );
            expect(successResponse).toHaveBeenCalledWith(
                mockRes,
                mockResult,
                'Work items bulk updated successfully'
            );
        });

        it('should handle missing IDs or update data', async () => {
            mockReq.body = { ids: ['1', '2'] }; // Missing updateData

            await WorkItemController.bulkUpdateWorkItems(mockReq, mockRes);

            expect(errorResponse).toHaveBeenCalledWith(
                mockRes,
                'IDs and update data are required',
                400
            );
            expect(WorkItemService.bulkUpdateWorkItems).not.toHaveBeenCalled();
        });

        it('should handle bulk update errors', async () => {
            const mockBulkData = {
                ids: ['1', '2', '3'],
                updateData: { status: 'completed' }
            };
            mockReq.body = mockBulkData; // Fix: Add this line to set the request body
            WorkItemService.bulkUpdateWorkItems.mockRejectedValue(new Error('Bulk update failed'));

            await WorkItemController.bulkUpdateWorkItems(mockReq, mockRes);

            expect(errorResponse).toHaveBeenCalledWith(
                mockRes,
                'Bulk update failed',
                400
            );
        });
    });
});

