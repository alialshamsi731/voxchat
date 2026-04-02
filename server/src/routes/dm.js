const express = require('express');
const router = express.Router();
const { startConversation, getMyConversations, getMessages } = require('../controllers/dmController');
const { authenticate } = require('../middlewares/auth');

router.post('/start', authenticate, startConversation);
router.get('/my', authenticate, getMyConversations);
router.get('/:conversationId/messages', authenticate, getMessages);

module.exports = router;
