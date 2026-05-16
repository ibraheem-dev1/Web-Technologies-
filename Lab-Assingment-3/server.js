const express = require('express');
const path    = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const methodOverride = require('method-override');

const Product = require('./models/Product');
const User = require('./models/User');
const Order = require('./models/Order');
const { isLoggedIn, isAdmin } = require('./middlewares/auth');
const upload = require('./middlewares/upload');
const { flashMiddleware, setFlash } = require('./middlewares/flash');

const app  = express();
const port = 3000;
const mongoUri = 'mongodb://127.0.0.1:27017/assignment3';

// ── EJS view engine ─────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Static files (css, js, images) ──────────────────────────────────────────
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// ── Body parsing & method override ─────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// ── Sessions (admin login) ─────────────────────────────────────────────────
app.use(
    session({
        secret: 'admin-panel-secret',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: mongoUri,
            collectionName: 'sessions'
        })
    })
);

// ── Flash messages (admin actions) ─────────────────────────────────────────
app.use(flash());
app.use(flashMiddleware);

// ── Middlewares moved to /middlewares ─────────────────────────────────────

// ── Shared data ─────────────────────────────────────────────────────────────
const offerImages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const categoryOptions = ['men', 'women', 'kids'];
const orderStatusOptions = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

function getSessionCart(req) {
    if (!req.session.cart) {
        req.session.cart = { items: {} };
    }
    return req.session.cart;
}

function buildCartSummary(cart) {
    const items = Object.values(cart.items || {});
    const totalQty = items.reduce((sum, item) => sum + item.qty, 0);
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    return { items, totalQty, total };
}

// ── Home ─────────────────────────────────────────────────────────────────────
app.get('/', async (req, res) => {
    try {
        const products = await Product.find({})
            .sort({ createdAt: -1 })
            .limit(8)
            .lean();

        res.render('index', { active: 'home', offerImages, products });
    } catch (err) {
        console.error('Home fetch error:', err);
        res.status(500).send('Error loading home page.');
    }
});

// ── Category pages (Men / Women / Kids only) ────────────────────────────────
const categoryRoutes = [
    { path: '/men',   active: 'men',   name: 'Men' },
    { path: '/women', active: 'women', name: 'Women' },
    { path: '/kids',  active: 'kids',  name: 'Kids' },
];

categoryRoutes.forEach(c => {
    app.get(c.path, async (req, res) => {
        try {
            const categoryProducts = await Product.find({ category: c.active })
                .sort({ createdAt: -1 })
                .lean();

            res.render('category', {
                active:       c.active,
                categoryName: c.name,
                offerImages,
                products: categoryProducts
            });
        } catch (err) {
            console.error('Category fetch error:', err);
            res.status(500).send('Error loading category.');
        }
    });
});

// ── Products catalog (MongoDB) ─────────────────────────────────────────────
app.get('/products', async (req, res) => {
    const limit = 8;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const q = (req.query.q || '').trim();
    const category = (req.query.category || 'all').trim().toLowerCase();
    const minPriceRaw = parseFloat(req.query.minPrice);
    const maxPriceRaw = parseFloat(req.query.maxPrice);
    const sort = (req.query.sort || 'newest').trim();

    const filter = {};
    if (q) {
        filter.name = { $regex: q, $options: 'i' };
    }
    if (category && category !== 'all') {
        filter.category = category;
    }
    if (!Number.isNaN(minPriceRaw) || !Number.isNaN(maxPriceRaw)) {
        filter.price = {};
        if (!Number.isNaN(minPriceRaw)) {
            filter.price.$gte = minPriceRaw;
        }
        if (!Number.isNaN(maxPriceRaw)) {
            filter.price.$lte = maxPriceRaw;
        }
        if (Object.keys(filter.price).length === 0) {
            delete filter.price;
        }
    }

    const sortMap = {
        price_asc:  { price: 1 },
        price_desc: { price: -1 },
        rating_desc:{ rating: -1 },
        newest:     { createdAt: -1 }
    };
    const sortBy = sortMap[sort] || sortMap.newest;

    try {
        const totalCount = await Product.countDocuments(filter);
        const totalPages = Math.max(Math.ceil(totalCount / limit), 1);
        const safePage = Math.min(page, totalPages);

        const productsFromDb = await Product.find(filter)
            .sort(sortBy)
            .skip((safePage - 1) * limit)
            .limit(limit)
            .lean();

        const queryParams = new URLSearchParams();
        if (q) queryParams.set('q', q);
        if (category && category !== 'all') queryParams.set('category', category);
        if (!Number.isNaN(minPriceRaw)) queryParams.set('minPrice', String(minPriceRaw));
        if (!Number.isNaN(maxPriceRaw)) queryParams.set('maxPrice', String(maxPriceRaw));
        if (sort) queryParams.set('sort', sort);

        res.render('products', {
            active: 'products',
            products: productsFromDb,
            page: safePage,
            totalPages,
            totalCount,
            filters: {
                q,
                category: category || 'all',
                minPrice: !Number.isNaN(minPriceRaw) ? minPriceRaw : '',
                maxPrice: !Number.isNaN(maxPriceRaw) ? maxPriceRaw : '',
                sort
            },
            queryString: queryParams.toString(),
            categoryOptions
        });
    } catch (err) {
        console.error('Products fetch error:', err);
        res.status(500).send('Error loading products.');
    }
});

// ── Cart (session-based) ───────────────────────────────────────────────────
app.get('/cart', async (req, res) => {
    const cart = getSessionCart(req);
    const summary = buildCartSummary(cart);
    const ids = summary.items.map(item => item.productId);

    try {
        const products = await Product.find({ _id: { $in: ids } })
            .select('stock')
            .lean();
        const stockMap = new Map(products.map(p => [String(p._id), p.stock || 0]));
        const items = summary.items.map(item => ({
            ...item,
            stock: stockMap.get(String(item.productId)) || 0
        }));

        res.render('cart', {
            active: 'cart',
            items,
            total: summary.total,
            totalQty: summary.totalQty
        });
    } catch (err) {
        console.error('Cart load error:', err);
        res.status(500).send('Error loading cart.');
    }
});

app.post('/cart/add', async (req, res) => {
    const productId = (req.body.productId || '').trim();
    const qty = Math.max(parseInt(req.body.qty, 10) || 1, 1);
    const redirectTo = req.get('referer') || '/cart';
    const acceptHeader = req.get('Accept') || '';
    const wantsJson = req.xhr || acceptHeader.includes('application/json');

    function respondError(message, status = 400) {
        if (wantsJson) {
            return res.status(status).json({ ok: false, message });
        }
        req.flash('error', message);
        return res.redirect(redirectTo);
    }

    if (!productId) {
        return respondError('Unable to add item to cart.');
    }

    try {
        const product = await Product.findById(productId).lean();
        if (!product) {
            return respondError('Product not found.', 404);
        }

        if (!product.stock || product.stock <= 0) {
            return respondError('This product is out of stock.');
        }

        const cart = getSessionCart(req);
        const existing = cart.items[productId];
        const existingQty = existing ? existing.qty : 0;
        if (existingQty + qty > product.stock) {
            return respondError(`Only ${product.stock} item(s) left in stock.`);
        }

        if (existing) {
            existing.qty += qty;
        } else {
            cart.items[productId] = {
                productId,
                name: product.name,
                price: product.price,
                imageUrl: product.imageUrl || '/images/banner.jpg',
                qty
            };
        }

        const summary = buildCartSummary(cart);
        if (wantsJson) {
            return res.json({
                ok: true,
                cartCount: summary.totalQty,
                message: `${product.name} added to cart.`
            });
        }

        req.flash('success', `${product.name} added to cart.`);
        return res.redirect(redirectTo);
    } catch (err) {
        console.error('Cart add error:', err);
        return respondError('Unable to add item to cart.', 500);
    }
});

app.post('/cart/remove', (req, res) => {
    const productId = (req.body.productId || '').trim();
    const cart = getSessionCart(req);

    if (productId && cart.items[productId]) {
        delete cart.items[productId];
        req.flash('info', 'Item removed from cart.');
    }

    return res.redirect('/cart');
});

app.post('/cart/adjust', async (req, res) => {
    const productId = (req.body.productId || '').trim();
    const deltaRaw = parseInt(req.body.delta, 10);
    const delta = deltaRaw === -1 ? -1 : 1;
    const acceptHeader = req.get('Accept') || '';
    const wantsJson = req.xhr || acceptHeader.includes('application/json');

    function respondAdjust(message, status = 400) {
        if (wantsJson) {
            return res.status(status).json({ ok: false, message });
        }
        req.flash('error', message);
        return res.redirect('/cart');
    }

    if (!productId) {
        return respondAdjust('Unable to update cart.');
    }

    const cart = getSessionCart(req);
    const item = cart.items[productId];
    if (!item) {
        return respondAdjust('Cart item not found.');
    }

    if (delta < 0) {
        item.qty -= 1;
        if (item.qty <= 0) {
            delete cart.items[productId];
        }

        if (wantsJson) {
            const summary = buildCartSummary(cart);
            return res.json({ ok: true, cartCount: summary.totalQty, qty: item.qty || 0 });
        }

        return res.redirect('/cart');
    }

    try {
        const product = await Product.findById(productId).select('stock').lean();
        const stock = product && product.stock ? product.stock : 0;
        if (stock <= 0 || item.qty + 1 > stock) {
            return respondAdjust(`Only ${stock} item(s) left in stock.`);
        }

        item.qty += 1;
        if (wantsJson) {
            const summary = buildCartSummary(cart);
            return res.json({ ok: true, cartCount: summary.totalQty, qty: item.qty });
        }

        return res.redirect('/cart');
    } catch (err) {
        console.error('Cart adjust error:', err);
        return respondAdjust('Unable to update cart.', 500);
    }
});

// ── Customer auth & profile ───────────────────────────────────────────────
app.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect('/profile');
    }
    return res.render('auth/register', { active: 'register' });
});

app.post('/register', async (req, res) => {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';
    const confirmPassword = req.body.confirmPassword || '';

    if (!name || !email || !password || !confirmPassword) {
        req.flash('error', 'Please fill all required fields.');
        return res.redirect('/register');
    }
    if (password.length < 6) {
        req.flash('error', 'Password must be at least 6 characters.');
        return res.redirect('/register');
    }
    if (password !== confirmPassword) {
        req.flash('error', 'Passwords do not match.');
        return res.redirect('/register');
    }

    try {
        const existing = await User.findOne({ email }).lean();
        if (existing) {
            req.flash('error', 'Email already registered.');
            return res.redirect('/register');
        }

        const newUser = await User.create({
            name,
            email,
            password,
            role: 'customer'
        });

        req.session.user = {
            id: String(newUser._id),
            role: newUser.role,
            email: newUser.email,
            name: newUser.name
        };
        req.flash('success', `Welcome, ${newUser.name}!`);
        return res.redirect('/');
    } catch (err) {
        console.error('Register error:', err);
        req.flash('error', 'Registration failed. Please try again.');
        return res.redirect('/register');
    }
});

app.get('/login', (req, res) => {
    if (req.session.user) {
        if (req.session.user.role === 'admin') {
            return res.redirect('/admin');
        }
        return res.redirect('/profile');
    }
    return res.render('auth/login', { active: 'login' });
});

app.post('/login', async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!email || !password) {
        req.flash('error', 'Please enter email and password.');
        return res.redirect('/login');
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }

        const isValid = await user.comparePassword(password);
        if (!isValid) {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }

        req.session.user = {
            id: String(user._id),
            role: user.role,
            email: user.email,
            name: user.name
        };

        req.flash('success', `Welcome back, ${user.name}!`);
        if (user.role === 'admin') {
            return res.redirect('/admin');
        }
        return res.redirect('/');
    } catch (err) {
        console.error('Login error:', err);
        req.flash('error', 'Login failed. Please try again.');
        return res.redirect('/login');
    }
});

app.post('/logout', (req, res) => {
    req.session.user = null;
    req.flash('success', 'You have successfully logged out.');
    return res.redirect('/login');
});

app.get('/profile', isLoggedIn, (req, res) => {
    res.render('profile', { active: 'profile', user: req.session.user });
});

app.get('/orders', isLoggedIn, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.session.user.id })
            .sort({ createdAt: -1 })
            .lean();
        return res.render('orders', { active: 'orders', orders });
    } catch (err) {
        console.error('Orders list error:', err);
        return res.status(500).send('Error loading orders.');
    }
});

app.get('/orders/:id', isLoggedIn, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).lean();
        if (!order) {
            return res.status(404).send('Order not found.');
        }

        const isAdminUser = req.session.user && req.session.user.role === 'admin';
        if (!isAdminUser && String(order.userId) !== String(req.session.user.id)) {
            req.flash('error', 'Access denied.');
            return res.redirect('/orders');
        }

        return res.render('order_detail', { active: 'orders', order });
    } catch (err) {
        console.error('Order detail error:', err);
        return res.status(500).send('Error loading order.');
    }
});

app.get('/checkout', isLoggedIn, (req, res) => {
    const cart = getSessionCart(req);
    const summary = buildCartSummary(cart);
    if (summary.items.length === 0) {
        req.flash('info', 'Your cart is empty.');
        return res.redirect('/cart');
    }

    return res.render('checkout', {
        active: 'checkout',
        items: summary.items,
        total: summary.total,
        totalQty: summary.totalQty,
        address: {}
    });
});

app.post('/checkout', isLoggedIn, async (req, res) => {
    const cart = getSessionCart(req);
    const summary = buildCartSummary(cart);
    if (summary.items.length === 0) {
        req.flash('info', 'Your cart is empty.');
        return res.redirect('/cart');
    }

    const address = {
        name: (req.body.name || '').trim(),
        phone: (req.body.phone || '').trim(),
        street: (req.body.street || '').trim(),
        city: (req.body.city || '').trim(),
        postal: (req.body.postal || '').trim(),
        country: (req.body.country || '').trim()
    };

    if (!address.name || !address.phone || !address.street || !address.city || !address.postal || !address.country) {
        req.flash('error', 'Please fill in all address fields.');
        return res.redirect('/checkout');
    }

    const updated = [];

    try {
        const productIds = summary.items.map(item => item.productId);
        const products = await Product.find({ _id: { $in: productIds } }).lean();
        const productMap = new Map(products.map(p => [String(p._id), p]));

        const issues = [];
        summary.items.forEach(item => {
            const product = productMap.get(String(item.productId));
            if (!product) {
                issues.push(`${item.name} is no longer available.`);
                return;
            }
            if (!product.stock || product.stock < item.qty) {
                issues.push(`${product.name} has only ${product.stock || 0} left.`);
            }
        });

        if (issues.length > 0) {
            req.flash('error', issues.join(' '));
            return res.redirect('/cart');
        }

        for (const item of summary.items) {
            const updatedProduct = await Product.findOneAndUpdate(
                { _id: item.productId, stock: { $gte: item.qty } },
                { $inc: { stock: -item.qty } },
                { new: true }
            );

            if (!updatedProduct) {
                for (const entry of updated) {
                    await Product.findByIdAndUpdate(entry.productId, { $inc: { stock: entry.qty } });
                }
                req.flash('error', 'Stock changed. Please review your cart.');
                return res.redirect('/cart');
            }

            updated.push({ productId: item.productId, qty: item.qty });
        }

        const order = await Order.create({
            userId: req.session.user.id,
            user: {
                name: req.session.user.name || 'Customer',
                email: req.session.user.email
            },
            address,
            items: summary.items.map(item => ({
                productId: item.productId,
                name: item.name,
                price: item.price,
                qty: item.qty,
                imageUrl: item.imageUrl
            })),
            totalQty: summary.totalQty,
            totalAmount: summary.total
        });

        req.session.cart = { items: {} };
        req.flash('success', 'Order placed successfully.');
        return res.redirect(`/orders/${order._id}`);
    } catch (err) {
        console.error('Checkout error:', err);
        if (updated.length > 0) {
            await Promise.all(
                updated.map(entry =>
                    Product.findByIdAndUpdate(entry.productId, { $inc: { stock: entry.qty } })
                )
            );
        }
        req.flash('error', 'Unable to place order. Please try again.');
        return res.redirect('/checkout');
    }
});

// ── Admin auth ─────────────────────────────────────────────────────────────
app.get('/admin/login', (req, res) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return res.redirect('/admin');
    }
    return res.render('admin/login');
});

app.post('/admin/login', async (req, res) => {
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
});

app.post('/admin/logout', (req, res) => {
    req.session.user = null;
    req.flash('success', 'You have successfully logged out.');
    res.redirect('/admin/login');
});

// ── Admin dashboard & CRUD ─────────────────────────────────────────────────
app.get('/admin', isAdmin, async (req, res) => {
    try {
        const products = await Product.find({}).sort({ createdAt: -1 }).lean();
        res.render('admin/dashboard', { products, user: req.session.user });
    } catch (err) {
        console.error('Admin dashboard error:', err);
        res.status(500).send('Error loading admin dashboard.');
    }
});

app.get('/admin/orders', isAdmin, async (req, res) => {
    try {
        const orders = await Order.find({}).sort({ createdAt: -1 }).lean();
        res.render('admin/orders', {
            orders,
            statusOptions: orderStatusOptions,
            user: req.session.user
        });
    } catch (err) {
        console.error('Admin orders error:', err);
        res.status(500).send('Error loading orders.');
    }
});

app.post('/admin/orders/:id/status', isAdmin, async (req, res) => {
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
});

app.get('/admin/products/new', isAdmin, (req, res) => {
    res.render('admin/new', {
        error: '',
        product: {},
        categoryOptions,
        user: req.session.user
    });
});

app.post('/admin/products', isAdmin, upload.single('imageFile'), async (req, res) => {
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
});

app.get('/admin/products/:id/edit', isAdmin, async (req, res) => {
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
});

app.put('/admin/products/:id', isAdmin, upload.single('imageFile'), async (req, res) => {
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
});

app.delete('/admin/products/:id', isAdmin, async (req, res) => {
    try {
        const deleted = await Product.findByIdAndDelete(req.params.id);
        const deletedName = deleted && deleted.name ? deleted.name : 'Product';
        setFlash(req, 'success', `Product "${deletedName}" deleted.`);
        return res.redirect('/admin');
    } catch (err) {
        console.error('Admin delete error:', err);
        return res.status(500).send('Error deleting product.');
    }
});

// ── Start server ─────────────────────────────────────────────────────────────
async function startServer() {
    try {
        await mongoose.connect(mongoUri);
        console.log('MongoDB connected');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }

    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}

startServer();
