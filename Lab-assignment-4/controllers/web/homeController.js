const { offerImages } = require('../../shared/constants');
const homeService = require('../../services/homeService');

async function home(req, res) {
    try {
        const products = await homeService.getHomeProducts();

        return res.render('index', { active: 'home', offerImages, products });
    } catch (err) {
        console.error('Home fetch error:', err);
        return res.status(500).send('Error loading home page.');
    }
}

async function category(req, res, categoryConfig) {
    try {
        const categoryProducts = await homeService.getCategoryProducts(categoryConfig.active);

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
