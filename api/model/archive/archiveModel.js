const mongoose = require('mongoose');

const archiveSchema = new mongoose.Schema({
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    collectionName: {
        type: String,
        required: true,
    },
    originalDocument: {
        type: Object,
        required: true
    },
    changes: [
        {
            userId: { // Who made the change
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            changedFields: { // Only the fields that were changed
                type: Object,
                required: true
            },
            timestamp: { // When the change was made
                type: Date,
                default: Date.now
            }
        }
    ]
});

module.exports = mongoose.model('Archive', archiveSchema);