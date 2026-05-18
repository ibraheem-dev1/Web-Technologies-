const express = require('express');
const authController = require('../../controllers/web/authController');
const { isLoggedIn } = require('../../middlewares/auth');

const router = express.Router();

router.get('/register', authController.showRegister);
router.post('/register', authController.register);
router.get('/login', authController.showLogin);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/profile', isLoggedIn, authController.profile);

module.exports = router;
