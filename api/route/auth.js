const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../model/userModel'); // Assuming you have a User model
const PersonalInfo = require("../model/personalInfoModel");
const EducationInfo = require("../model/educationInfo");
const MedicalInfo = require("../model/medicalRecords/medicalInfo");
const router = express.Router();
const mongoose = require('mongoose');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const jwtSecret = process.env.ACCESS_TOKEN_SECRET;
// const User = require('../model/googleSchema');
router.post('/auth/google', async (req, res) => {
    const { token } = req.body;
    console.log("token: ", token);
    console.log('Google Client ID:', process.env.GOOGLE_CLIENT_ID);

    try {
        // Verify Google ID token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const googleId = payload['sub'];
        const email = payload['email'];
        const firstName = payload['given_name'];
        const lastName = payload['family_name'];
        const pfp = payload['picture']; // Default profile pic URL
        // Check if the user exists in the database
        let user = await User.findOne({ email });
        // Additional console logs for debugging
        console.log('User Email:', email);
        console.log('Profile Pic:', pfp);
        if (!user) {
            // Start a session for the transaction
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                // Create a new user if they don't exist
                user = new User({
                    googleId,
                    email,
                    pfp,
                    role: 'student',
                    firstname: payload['given_name'],
                    lastname: payload['family_name']
                });
                await user.save({ session });

                // Create associated documents with default values
                await PersonalInfo.create([{
                    userId: user._id,
                    firstName: payload['given_name'] || 'N/A',
                    lastName: payload['family_name'] || 'N/A',
                    // ... other fields with default values
                }], { session });

                await MedicalInfo.create([{
                    userId: user._id,
                }], { session });

                await EducationInfo.create([{
                    userId: user._id,
                    educationLevel: 'JHS',
                    yearlvl: '7',
                    section: 'A',
                    department: null,
                    strand: null,
                    course: null,
                    schoolYear: 'N/A'
                }], { session });

                // Commit the transaction
                await session.commitTransaction();
                console.log('New user and associated documents created successfully');
            } catch (error) {
                // If an error occurred, abort the transaction
                await session.abortTransaction();
                console.error('Error creating new user and associated documents:', error);
                return res.status(500).json({ success: false, error: 'Error creating user account' });
            } finally {
                // End the session
                session.endSession();
            }
        } else if (user.role === 'admin') {
            return res.status(400).json({
                success: false,
                error: 'Student can only log in via Google',
            });
        }

        // Generate JWT token for the app
        const accessToken = jwt.sign(
            { sub: user.id, role: user.role, googleId: user.googleId },
            jwtSecret,
            { expiresIn: '30d', audience: 'Saulus', algorithm: 'HS256' }
        );

        // Send response with the JWT token and user data
        res.json({
            success: true,
            token: accessToken,
            id: user.id,
            role: user.role,
            firstname: user.firstname,
            username: user.email,
            pfp: user.pfp// Send profile picture URL
        });

    } catch (error) {
        console.error('Google login error:', error);
        res.status(400).json({ success: false, error: 'Invalid Google token' });
    }
});

// Route to update user profile with Google data
router.post('/updateProfile', async (req, res) => {
    const userId = req.params.id
    const { firstName, lastName, email, profilePic, googleId } = req.body;

    console.log(profilePic);
    try {
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { firstName, lastName, email, profilePic, googleId },
            { new: true, upsert: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ message: 'Error updating user profile' });
    }
});

module.exports = router;
