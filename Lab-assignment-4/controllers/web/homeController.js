const Product = require('../../models/Product');
const { offerImages } = require('../../config/constants');

async function home(req, res) {
    try {
        const products = await Product.find({})
            .sort({ createdAt: -1 })
            .limit(8)
            .lean();

        return res.render('index', { active: 'home', offerImages, products });
    } catch (err) {
        console.error('Home fetch error:', err);
        return res.status(500).send('Error loading home page.');
    }
}

async function category(req, res, categoryConfig) {
    try {
        const categoryProducts = await Product.find({ category: categoryConfig.active })
            .sort({ createdAt: -1 })
            .lean();

        return res.render('category', {
            active: categoryConfig.active,
            categoryName: categoryConfig.name,
            offerImages,
            products: categoryProducts
        });
    } catch (err) {
        console.error('Category fetch error:', err);
        return res.status(500).send('Error loading category.');
    }
}

module.exports = {
    home,
    category
};
