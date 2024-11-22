const Request = require('../model/appointmentModel')
const asyncHandler = require('express-async-handler');


const addRequest = asyncHandler(async (req, res) => {
    try {
        const { title, description, googleId, author, userId } = req.body;

        // Validate if userId exists
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required.' });
        }

        // Validate if user exists in the database
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Create a new request
        const newRequest = await Request.create({
            title,
            description,
            User: userId,// Store the user's ObjectId
            googleId, // Store Google ID if provided
            author // Store the author name or identifier
        });
        await newRequest.save();

        return res.status(200).json({ message: 'Request created successfully', data: newRequest });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Route to get all requests (visible to admins)
const getRequest = asyncHandler(async (req, res) => {
    try {
        const requests = await Request.find().populate('User', 'firstname lastname email');
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching requests', error });
    }
});

module.exports = {
    addRequest, getRequest
}





