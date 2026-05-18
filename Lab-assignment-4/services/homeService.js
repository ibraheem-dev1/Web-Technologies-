const Product = require('../models/Product');

async function getHomeProducts(limit = 8) {
    return Product.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
}

async function getCategoryProducts(category) {
    return Product.find({ category })
        .sort({ createdAt: -1 })
        .lean();
}

module.exports = {
    getHomeProducts,
    getCategoryProducts
};
