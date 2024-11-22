const express = require('express');
const router = express.Router();
const { addPost, getAllPost, updatePost, deletePost, getPost } = require('../controller/postController');
const authenticateToken = require('../middleware/authenticateToken');
const isAdmin = require('../middleware/isAdmin');
const validateToken = require('../middleware/validateToken');

router.post('/', authenticateToken, isAdmin, validateToken, addPost);

router.get('/', getPost);

router.get('/all', getAllPost)

router.put('/edit/:id', isAdmin, updatePost)

router.post('/delete', isAdmin, deletePost);

module.exports = router;