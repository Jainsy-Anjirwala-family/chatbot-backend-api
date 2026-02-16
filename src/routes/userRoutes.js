const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Open route so users can create an account and get a token
router.post('/', userController.createUserAndNotify);

module.exports = router;