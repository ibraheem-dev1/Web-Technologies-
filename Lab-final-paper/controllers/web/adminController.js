const productService = require('../../services/productService');
const userService = require('../../services/userService');
const orderService = require('../../services/orderService');
const { categoryOptions, orderStatusOptions } = require('../../shared/constants');
const { setFlash } = require('../../middlewares/flash');

function showLogin(req, res) {
    if (req.session.user && req.session.user.role === 'admin') {
        return res.redirect('/admin');
    }
    return res.render('admin/login');
}

async function login(req, res) {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    try {
        const result = await userService.authenticateAdmin({ email, password });
        if (!result.ok) {
            req.flash('error', 'Invalid credentials.');
            return res.redirect('/admin/login');
        }

        const user = result.user;
        req.session.user = {
            id: String(user._id),
            role: user.role,
            email: user.email,
            name: user.name
        };
        req.flash('success', `Welcome back, ${user.name || 'Admin'}!`);
        return res.redirect('/admin');
    } catch (err) {
        console.error('Admin login error:', err);
        req.flash('error', 'Login error.');
        return res.redirect('/admin/login');
    }
}

function logout(req, res) {
    req.session.user = null;
    req.flash('success', 'You have successfully logged out.');
    return res.redirect('/admin/login');
}

async function dashboard(req, res) {
    try {
        const products = await productService.listAllProducts();
        return res.render('admin/dashboard', { products, user: req.session.user });
    } catch (err) {
        console.error('Admin dashboard error:', err);
        return res.status(500).send('Error loading admin dashboard.');
    }
}

async function orders(req, res) {
    try {
        const ordersList = await orderService.listAllOrders();
        return res.render('admin/orders', {
            orders: ordersList,
            statusOptions: orderStatusOptions,
            user: req.session.user
        });
    } catch (err) {
        console.error('Admin orders error:', err);
        return res.status(500).send('Error loading orders.');
    }
}

async function updateOrderStatus(req, res) {
    const status = (req.body.status || '').trim();
    if (!orderService.isValidStatus(status)) {
        req.flash('error', 'Invalid order status.');
        return res.redirect('/admin/orders');
    }

    try {
        await orderService.updateOrderStatus(req.params.id, status);
        req.flash('success', 'Order status updated.');
        return res.redirect('/admin/orders');
    } catch (err) {
        console.error('Order status update error:', err);
        req.flash('error', 'Unable to update order status.');
        return res.redirect('/admin/orders');
    }
}

function newProductForm(req, res) {
    return res.render('admin/new', {
        error: '',
        product: {},
        categoryOptions,
        user: req.session.user
    });
}

async function createProduct(req, res) {
    try {
        const result = await productService.createProductFromForm(req.body, req.file);
        if (!result.ok) {
            return res.render('admin/new', {
                error: 'Please fill all required fields.',
                product: result.formData,
                categoryOptions,
                user: req.session.user
            });
        }

        setFlash(req, 'success', `Product "${result.product.name}" created.`);
        return res.redirect('/admin');
    } catch (err) {
        console.error('Admin create error:', err);
        return res.status(500).send('Error creating product.');
    }
}

async function editProductForm(req, res) {
    try {
        const result = await productService.getProductById(req.params.id);
        if (!result.ok) {
            return res.status(404).send('Product not found.');
        }
        return res.render('admin/edit', {
            error: '',
            product: result.product,
            categoryOptions,
            user: req.session.user
        });
    } catch (err) {
        console.error('Admin edit fetch error:', err);
        return res.status(500).send('Error loading product.');
    }
}

async function updateProduct(req, res) {
    try {
        const result = await productService.updateProductFromForm(req.params.id, req.body, req.file);
        if (!result.ok) {
            return res.render('admin/edit', {
                error: 'Please fill all required fields.',
                product: result.formData,
                categoryOptions,
                user: req.session.user
            });
        }

        setFlash(req, 'success', `Product "${result.name}" updated.`);
        return res.redirect('/admin');
    } catch (err) {
        console.error('Admin update error:', err);
        return res.status(500).send('Error updating product.');
    }
}

async function deleteProduct(req, res) {
    try {
        const deleted = await productService.deleteProduct(req.params.id);
        const deletedName = deleted && deleted.name ? deleted.name : 'Product';
        setFlash(req, 'success', `Product "${deletedName}" deleted.`);
        return res.redirect('/admin');
    } catch (err) {
        console.error('Admin delete error:', err);
        return res.status(500).send('Error deleting product.');
    }
}

module.exports = {
    showLogin,
    login,
    logout,
    dashboard,
    orders,
    updateOrderStatus,
    newProductForm,
    createProduct,
    editProductForm,
    updateProduct,
    deleteProduct
};
