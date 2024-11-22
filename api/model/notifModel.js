const mongoose = require('mongoose');

const notifSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    document: {
        type: Object,
        required: true,
    },
    update: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Notification', notifSchema);
