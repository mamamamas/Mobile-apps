const Post = require('../model/postModel')
const asyncHandler = require('express-async-handler');
const authenticateToken = require('../middleware/authenticateToken');
const isAdmin = require('../middleware/isAdmin');
const validateToken = require('../middleware/validateToken');
const Notification = require("../model/notification/notification");
const User = require("../model/userModel");
const { encrypt, decrypt } = require("../middleware/encryption");

const addPost = (async (req, res) => {
    const currentUser = req.user;
    const { title, body } = req.body;


    if (currentUser.role !== "admin" && currentUser.role !== "staff") {
        return res.status(404).json({ error: "Not authorized" });
    }

    try {
        // Create the new post
        const newPost = await Post.create({
            title,
            body,
            userId: currentUser.sub,
        });

        // Fetch all users to notify
        const allUsers = await User.find().select('_id');

        if (!allUsers || allUsers.length === 0) {
            console.warn("No users found to notify");
        }

        // Extract user IDs for notification
        const recipientIds = allUsers.map(user => user._id);

        // Create and encrypt the notification title
        const notificationTitle = `New Post: ${title} (Created by ${currentUser.firstname})`;
        const encryptedTitle = encrypt(notificationTitle);

        // Create and save the notification
        await Notification.create({
            userId: currentUser.sub,
            adminName: currentUser.firstName,
            title: encryptedTitle,
            documentId: newPost._id,
            documentType: "post",
            recipientIds: recipientIds,
            timestamp: new Date(),
        });

        return res.status(200).json(newPost);
    } catch (err) {
        console.error("Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

const getPost = asyncHandler(async (req, res) => {
    try {
        const posts = await Post.find().sort({ timestamp: -1 });
        res.status(200).json(posts);
    } catch (err) {
        return res.status(400).json({ error: "No Post found" });
    }
});

const getAllPost = asyncHandler(async (req, res) => {
    try {
        const posts = await Post.find().populate('author', 'firstname');
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

const updatePost = asyncHandler(async (req, res) => {
    try {
        const Id = req.params.id;
        const currentUser = req.user;
        const updatedFields = req.body;

        if (currentUser.role !== "admin" && currentUser.role !== "staff") {
            return res.status(404).json({ error: "Not authorized" });
        }
        const updatePost = await Post.findByIdAndUpdate(Id, updatedFields);

        return res.status(200).json(updatePost);
    } catch (err) {
        console.log("error:", err);
        res.status(404).json({ error: "error updating post" });
    }
});


const deletePost = async (req, res) => {
    try {
        const postId = req.body.id;
        const currentUser = req.user;
        console.log(postId);
        if (currentUser.role !== "admin" && currentUser.role !== "staff") {
            return res.status(404).json({ error: "Not authorized" });
        }
        const postToDelete = await Post.findById(postId);
        if (!postToDelete) {
            return res.status(404).json({ message: "Post not found" });
        }

        await Post.findByIdAndDelete(postId);
        res.json({ message: "Post deleted successfully" });
    } catch (err) {
        console.log("error:", err);
        res.status(404).json({ error: "error deleting post" });
    }
};

module.exports = {
    addPost, getAllPost, updatePost, deletePost, getPost
}

