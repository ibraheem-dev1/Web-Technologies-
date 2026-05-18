const express = require('express');
const productController = require('../../controllers/web/productController');

const router = express.Router();

router.get('/products', productController.list);
router.get('/onsale-products', productController.listOnSale);

module.exports = router;
