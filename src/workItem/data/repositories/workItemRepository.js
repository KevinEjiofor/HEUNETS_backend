const WorkItem = require('../models/workItemModel');

const createWorkItem = async (workItemData) => {
    const newWorkItem = new WorkItem(workItemData);
    await newWorkItem.save();
    return newWorkItem;
};

const findWorkItemById = async (id) => {
    return WorkItem.findById(id)
        .populate('createdBy', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName email');
};

const findAllWorkItems = async (filters = {}, options = {}) => {
    const {
        page = 1,
        limit = 10,
        sort = '-createdAt',
        populate = true
    } = options;

    const skip = (page - 1) * limit;

    let query = WorkItem.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit);

    if (populate) {
        query = query
            .populate('createdBy', 'firstName lastName email')
            .populate('assignedTo', 'firstName lastName email');
    }

    const [workItems, total] = await Promise.all([
        query.exec(),
        WorkItem.countDocuments(filters)
    ]);

    return {
        workItems,
        pagination: {
            total,
            page,
            pages: Math.ceil(total / limit),
            limit
        }
    };
};

const findWorkItemsByCreator = async (creatorId, options = {}) => {
    return findAllWorkItems({ createdBy: creatorId, isActive: true }, options);
};

const findWorkItemsByAssignee = async (assigneeId, options = {}) => {
    return findAllWorkItems({ assignedTo: assigneeId, isActive: true }, options);
};

const findWorkItemsByStatus = async (status, options = {}) => {
    return findAllWorkItems({ status, isActive: true }, options);
};

const updateWorkItem = async (id, updateData) => {
    const workItem = await WorkItem.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
    )
        .populate('createdBy', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName email');

    if (!workItem) throw new Error('Work item not found');
    return workItem;
};

const deleteWorkItem = async (id) => {

    const workItem = await WorkItem.findByIdAndUpdate(
        id,
        { $set: { isActive: false } },
        { new: true }
    );

    if (!workItem) throw new Error('Work item not found');
    return workItem;
};

const hardDeleteWorkItem = async (id) => {

    const workItem = await WorkItem.findByIdAndDelete(id);
    if (!workItem) throw new Error('Work item not found');
    return workItem;
};

const countWorkItemsByFilters = async (filters) => {
    return WorkItem.countDocuments(filters);
};

module.exports = {
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
};