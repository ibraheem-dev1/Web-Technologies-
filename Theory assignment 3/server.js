const express = require('express');
const path    = require('path');
const mongoose = require('mongoose');

const Product = require('./models/Product');

const app  = express();
const port = 3000;
const mongoUri = 'mongodb://127.0.0.1:27017/assignment3';

// ── EJS view engine ─────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Static files (css, js, images) ──────────────────────────────────────────
app.use(express.static(__dirname));

// ── Shared data ─────────────────────────────────────────────────────────────
const offerImages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

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
            categoryOptions: ['men', 'women', 'kids']
        });
    } catch (err) {
        console.error('Products fetch error:', err);
        res.status(500).send('Error loading products.');
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
