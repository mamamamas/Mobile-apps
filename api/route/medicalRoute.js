const express = require('express');
const router = express.Router();
const { addInfo, getInfo, getUserInfo, addPersonalInfo, getPersonalInfo, getMedicalInfo } = require('../controller/medicalController');
const authenticateToken = require('../middleware/authenticateToken');
const isAdmin = require('../middleware/isAdmin');
const validateToken = require('../middleware/validateToken');

router.post('/api/medical-info', addInfo)

router.get('/api/medical-info', authenticateToken, isAdmin, validateToken, getInfo);

router.get('/users/:id', getUserInfo);

router.post('/infoadd', addPersonalInfo);

router.get('/personal-info', getPersonalInfo);

router.get('/users/:id', getMedicalInfo)

module.exports = router;