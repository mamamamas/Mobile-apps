
const express = require('express');
const upload = require("../middleware/multer");
const router = express.Router();
const { registerUser, loginUser, updateUser, getAllUser, getUser, logoutUser, StudentGetProfile, ChangePhoto, getGoogle, getGoogleCallback, UpdateStudentProfile } = require('../controller/userController');
const validateToken = require('../middleware/validateToken');
const checkTokenBlacklist = require('../middleware/logOut');
const isAdmin = require('../middleware/isAdmin');
const authenticateToken = require('../middleware/authenticateToken');
router.get('/:id', authenticateToken, getUser);

router.get('/get', getAllUser);

router.post('/registers', registerUser);

router.put('/:id', updateUser)

router.post('/login', loginUser)
router.patch("/profiles/:id", validateToken, UpdateStudentProfile)
router.get("/profile/:id", validateToken, authenticateToken, StudentGetProfile);
router.post('/logout', logoutUser);

router.get("/auth/google", getGoogle)
router.get("/auth/google/callback", getGoogleCallback)
router.post("/profile/:id/photo", upload.single("image"), ChangePhoto);


module.exports = router;