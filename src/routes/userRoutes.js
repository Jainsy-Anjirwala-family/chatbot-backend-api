const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth } = require('../middlewares/authMiddleware');

// Open route so users can create an account and get a token
router.post('/', userController.createUserAndNotify);
router.post('/existing', userController.existingUserAndNotify);
router.post('/logoutUser', userController.logoutUser);

module.exports = router;