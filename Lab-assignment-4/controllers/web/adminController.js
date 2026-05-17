const Product = require('../../models/Product');
const User = require('../../models/User');
const Order = require('../../models/Order');
const { categoryOptions, orderStatusOptions } = require('../../config/constants');
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
        const user = await User.findOne({ email });
        if (!user || user.role !== 'admin') {
            req.flash('error', 'Invalid credentials.');
            return res.redirect('/admin/login');
        }

        const isValid = await user.comparePassword(password);
        if (!isValid) {
            req.flash('error', 'Invalid credentials.');
            return res.redirect('/admin/login');
        }

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
        const products = await Product.find({}).sort({ createdAt: -1 }).lean();
        return res.render('admin/dashboard', { products, user: req.session.user });
    } catch (err) {
        console.error('Admin dashboard error:', err);
        return res.status(500).send('Error loading admin dashboard.');
    }
}

async function orders(req, res) {
    try {
        const ordersList = await Order.find({}).sort({ createdAt: -1 }).lean();
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
    if (!orderStatusOptions.includes(status)) {
        req.flash('error', 'Invalid order status.');
        return res.redirect('/admin/orders');
    }

    try {
        await Order.findByIdAndUpdate(req.params.id, { status });
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
    const body = req.body;
    const imageUrlInput = (body.imageUrl || '').trim();
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : imageUrlInput;

    const name = (body.name || '').trim();
    const brand = (body.brand || '').trim();
    const category = (body.category || '').trim().toLowerCase();
    const ratingCount = (body.ratingCount || '').trim() || '0';

    const price = Number(body.price);
    const mrp = Number(body.mrp);
    const discount = Number(body.discount);
    const rating = Number(body.rating);
    const stock = Number(body.stock);
    if (!name || !category || Number.isNaN(price) || Number.isNaN(rating) || Number.isNaN(stock) || !imageUrl) {
        return res.render('admin/new', {
            error: 'Please fill all required fields.',
            product: { ...body, imageUrl: imageUrlInput },
            categoryOptions,
            user: req.session.user
        });
    }

    try {
        await Product.create({
            name,
            brand,
            price,
            mrp: Number.isNaN(mrp) ? 0 : mrp,
            discount: Number.isNaN(discount) ? 0 : discount,
            category,
            rating,
            ratingCount,
            stock,
            imageUrl
        });
        setFlash(req, 'success', `Product "${name}" created.`);
        return res.redirect('/admin');
    } catch (err) {
        console.error('Admin create error:', err);
        return res.status(500).send('Error creating product.');
    }
}

async function editProductForm(req, res) {
    try {
        const product = await Product.findById(req.params.id).lean();
        if (!product) {
            return res.status(404).send('Product not found.');
        }
        return res.render('admin/edit', {
            error: '',
            product,
            categoryOptions,
            user: req.session.user
        });
    } catch (err) {
        console.error('Admin edit fetch error:', err);
        return res.status(500).send('Error loading product.');
    }
}

async function updateProduct(req, res) {
    const body = req.body;
    const imageUrlInput = (body.imageUrl || '').trim();
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : imageUrlInput;

    const name = (body.name || '').trim();
    const brand = (body.brand || '').trim();
    const category = (body.category || '').trim().toLowerCase();
    const ratingCount = (body.ratingCount || '').trim() || '0';

    const price = Number(body.price);
    const mrp = Number(body.mrp);
    const discount = Number(body.discount);
    const rating = Number(body.rating);
    const stock = Number(body.stock);
    if (!name || !category || Number.isNaN(price) || Number.isNaN(rating) || Number.isNaN(stock)) {
        return res.render('admin/edit', {
            error: 'Please fill all required fields.',
            product: { ...body, _id: req.params.id, imageUrl: imageUrlInput },
            categoryOptions,
            user: req.session.user
        });
    }

    const update = {
        name,
        brand,
        price,
        mrp: Number.isNaN(mrp) ? 0 : mrp,
        discount: Number.isNaN(discount) ? 0 : discount,
        category,
        rating,
        ratingCount,
        stock
    };
    if (imageUrl) {
        update.imageUrl = imageUrl;
    }

    try {
        await Product.findByIdAndUpdate(req.params.id, update);
        setFlash(req, 'success', `Product "${name}" updated.`);
        return res.redirect('/admin');
    } catch (err) {
        console.error('Admin update error:', err);
        return res.status(500).send('Error updating product.');
    }
}

async function deleteProduct(req, res) {
    try {
        const deleted = await Product.findByIdAndDelete(req.params.id);
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
