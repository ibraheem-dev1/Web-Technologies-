const express = require('express');
const adminController = require('../../controllers/web/adminController');
const { isAdmin } = require('../../middlewares/auth');
const upload = require('../../middlewares/upload');

const router = express.Router();

router.get('/admin/login', adminController.showLogin);
router.post('/admin/login', adminController.login);
router.post('/admin/logout', adminController.logout);

router.get('/admin', isAdmin, adminController.dashboard);
router.get('/admin/orders', isAdmin, adminController.orders);
router.post('/admin/orders/:id/status', isAdmin, adminController.updateOrderStatus);
router.get('/admin/products/new', isAdmin, adminController.newProductForm);
router.post('/admin/products', isAdmin, upload.single('imageFile'), adminController.createProduct);
router.get('/admin/products/:id/edit', isAdmin, adminController.editProductForm);
router.put('/admin/products/:id', isAdmin, upload.single('imageFile'), adminController.updateProduct);
router.delete('/admin/products/:id', isAdmin, adminController.deleteProduct);

module.exports = router;
