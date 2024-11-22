const mongoose = require('mongoose');

const googleSchema = new mongoose.Schema({
    googleId: {
        type: String,
        required: true,
        unique: true
    },
    name: String,
    email: {
        type: String,
        unique: true,
        required: true
    },
    profilePicture: String,
}, { timestamps: true });

const User = mongoose.model('googleUser', googleSchema);

module.exports = User;
