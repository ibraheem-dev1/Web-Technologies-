const express = require('express');
const orderController = require('../../controllers/web/orderController');
const { isLoggedIn } = require('../../middlewares/auth');

const router = express.Router();

router.get('/orders', isLoggedIn, orderController.listOrders);
router.get('/orders/:id', isLoggedIn, orderController.orderDetail);
router.get('/checkout', isLoggedIn, orderController.showCheckout);
router.post('/checkout', isLoggedIn, orderController.checkout);

module.exports = router;
