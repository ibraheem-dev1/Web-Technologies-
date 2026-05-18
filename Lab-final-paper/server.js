require('dotenv').config();

const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const methodOverride = require('method-override');

const { flashMiddleware } = require('./middlewares/flash');
const requireJwtSecret = require('./middlewares/requireJwtSecret');
const apiV1Routes = require('./routes/apiV1');
const homeRoutes = require('./routes/web/homeRoutes');
const productRoutes = require('./routes/web/productRoutes');
const cartRoutes = require('./routes/web/cartRoutes');
const authRoutes = require('./routes/web/authRoutes');
const orderRoutes = require('./routes/web/orderRoutes');
const adminRoutes = require('./routes/web/adminRoutes');

const appConfig = require('./config/default.json');

const app = express();
const port = appConfig.port || 3000;
const mongoUri = appConfig.mongoUri || 'mongodb://127.0.0.1:27017/assignment3';

// ── EJS view engine ─────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', false);

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

// ── Routes (SSR) ───────────────────────────────────────────────────────────
app.use('/', homeRoutes);
app.use('/', productRoutes);
app.use('/', cartRoutes);
app.use('/', authRoutes);
app.use('/', orderRoutes);
app.use('/', adminRoutes);

// ── API v1 (JWT) ───────────────────────────────────────────────────────────
app.use('/api/v1', requireJwtSecret, apiV1Routes);

// ── Start server ───────────────────────────────────────────────────────────
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
