const express = require('express');
const router = express.Router();
const { searchUsers } = require('../controllers/usersController');
const { authenticate } = require('../middlewares/auth');

router.get('/search', authenticate, searchUsers);

module.exports = router;
