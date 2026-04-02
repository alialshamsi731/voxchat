const express = require('express');
const router = express.Router();
const { createGroup, joinGroup, getMyGroups, getGroupMessages, removeMember } = require('../controllers/groupsController');
const { authenticate } = require('../middlewares/auth');

router.post('/create', authenticate, createGroup);
router.post('/join', authenticate, joinGroup);
router.get('/my', authenticate, getMyGroups);
router.get('/:groupId/messages', authenticate, getGroupMessages);
router.delete('/:groupId/members/:userId', authenticate, removeMember);

module.exports = router;
