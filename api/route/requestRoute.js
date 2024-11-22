const express = require('express');
const router = express.Router();
const { addRequest, getRequest } = require('../controller/requestController');
const authenticateToken = require('../middleware/authenticateToken');
const isAdmin = require('../middleware/isAdmin');
const validateToken = require('../middleware/validateToken');


router.post('/req', addRequest);

router.get('/requests', getRequest, authenticateToken, isAdmin);

module.exports = router;