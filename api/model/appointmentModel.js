const mongoose = require('mongoose')
const { v4: uuidv4 } = require('uuid');
const Schema = mongoose.Schema;


const requestSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    User: {
        type: Schema.Types.ObjectId,
        ref: 'User',  // Reference to the User model
        required: true,
    },
    googleName: {

        type: String,  // Store Google user's name directly
        required: false,

    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model('Request', requestSchema);
