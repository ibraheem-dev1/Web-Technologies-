const express = require('express');

const verifyToken = require('../middlewares/verifyToken');
const authController = require('../controllers/api/authController');
const productController = require('../controllers/api/productController');
const userController = require('../controllers/api/userController');
const orderController = require('../controllers/api/orderController');

const router = express.Router();

router.post('/auth/login', authController.login);
router.get('/products', productController.list);
router.get('/products/:id', productController.getById);
router.get('/user/profile', verifyToken, userController.profile);
router.post('/orders', verifyToken, orderController.create);

module.exports = router;
