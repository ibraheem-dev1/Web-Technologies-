const express = require('express');
const path    = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const methodOverride = require('method-override');
const bcrypt = require('bcrypt');

const Product = require('./models/Product');
const User = require('./models/User');
const requireAdmin = require('./middlewares/adminAuth');
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
        saveUninitialized: false
    })
);

// ── Flash messages (admin actions) ─────────────────────────────────────────
app.use(flashMiddleware);

// ── Middlewares moved to /middlewares ─────────────────────────────────────

// ── Shared data ─────────────────────────────────────────────────────────────
const offerImages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const categoryOptions = ['men', 'women', 'kids'];

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

// ── Admin auth ─────────────────────────────────────────────────────────────
app.get('/admin/login', (req, res) => {
    res.render('admin/login', { error: '' });
});

app.post('/admin/login', async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    try {
        const user = await User.findOne({ email }).lean();
        if (!user || user.role !== 'admin') {
            return res.render('admin/login', { error: 'Invalid credentials.' });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return res.render('admin/login', { error: 'Invalid credentials.' });
        }

        req.session.user = { id: String(user._id), role: user.role, email: user.email };
        return res.redirect('/admin');
    } catch (err) {
        console.error('Admin login error:', err);
        return res.status(500).send('Login error.');
    }
});

app.post('/admin/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin/login');
    });
});

// ── Admin dashboard & CRUD ─────────────────────────────────────────────────
app.get('/admin', requireAdmin, async (req, res) => {
    try {
        const products = await Product.find({}).sort({ createdAt: -1 }).lean();
        res.render('admin/dashboard', { products, user: req.session.user });
    } catch (err) {
        console.error('Admin dashboard error:', err);
        res.status(500).send('Error loading admin dashboard.');
    }
});

app.get('/admin/products/new', requireAdmin, (req, res) => {
    res.render('admin/new', {
        error: '',
        product: {},
        categoryOptions,
        user: req.session.user
    });
});

app.post('/admin/products', requireAdmin, upload.single('imageFile'), async (req, res) => {
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

app.get('/admin/products/:id/edit', requireAdmin, async (req, res) => {
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

app.put('/admin/products/:id', requireAdmin, upload.single('imageFile'), async (req, res) => {
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

app.delete('/admin/products/:id', requireAdmin, async (req, res) => {
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
