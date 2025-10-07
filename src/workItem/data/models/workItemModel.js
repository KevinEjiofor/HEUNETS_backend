const mongoose = require('mongoose');

const workItemSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        minlength: [3, 'Title must be at least 3 characters long'],
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        minlength: [10, 'Description must be at least 10 characters long'],
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'creatorModel',
        required: true
    },
    creatorModel: {
        type: String,
        required: true,
        enum: ['Admin', 'User']
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'assigneeModel'
    },
    assigneeModel: {
        type: String,
        enum: ['Admin', 'User']
    },
    dueDate: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for better query performance
workItemSchema.index({ createdBy: 1, status: 1 });
workItemSchema.index({ assignedTo: 1, status: 1 });
workItemSchema.index({ createdAt: -1 });

// Virtual for checking if overdue
workItemSchema.virtual('isOverdue').get(function() {
    if (!this.dueDate || this.status === 'completed' || this.status === 'cancelled') {
        return false;
    }
    return new Date() > this.dueDate;
});

// Method to mark as completed
workItemSchema.methods.markAsCompleted = function() {
    this.status = 'completed';
    this.completedAt = new Date();
    return this.save();
};

// Method to sanitize output
workItemSchema.methods.toJSON = function() {
    const workItemObject = this.toObject({ virtuals: true });
    delete workItemObject._id;
    delete workItemObject.__v;
    return workItemObject;
};

module.exports = mongoose.model('WorkItem', workItemSchema);