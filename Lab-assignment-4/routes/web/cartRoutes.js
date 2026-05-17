const express = require('express');
const cartController = require('../../controllers/web/cartController');

const router = express.Router();

router.get('/cart', cartController.viewCart);
router.post('/cart/add', cartController.addToCart);
router.post('/cart/remove', cartController.removeFromCart);
router.post('/cart/adjust', cartController.adjustCart);

module.exports = router;
