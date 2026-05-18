const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const ctrl = require('./auth.controller');

router.post('/signup', ctrl.signUp);
router.post('/signin', ctrl.signIn);
router.post('/signout', authenticate, ctrl.signOut);
router.get('/profile', authenticate, ctrl.getProfile);
router.patch('/profile', authenticate, ctrl.updateProfile);

module.exports = router;
