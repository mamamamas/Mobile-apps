const mongoose = require('mongoose');

const adminSchema = mongoose.Schema({
    adminEmail: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: 200
    },
    adminPassword: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    adminName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    clinicName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    }
})

module.exports = mongoose.model("admin", adminSchema);