const mongoose = require('mongoose');
const Product = require('../models/Product');

const mongoUri = 'mongodb://127.0.0.1:27017/assignment3';

const menProducts = [
    { brand: 'Roadster', name: 'Slim Fit Casual Shirt', price: 799, mrp: 1599, discount: 50, rating: 4.2, ratingCount: '8.1k', image: 1, imageUrl: '/uploads/men-1.jpg', category: 'men', stock: 30 },
    { brand: 'HRX', name: 'Training Joggers', price: 999, mrp: 1999, discount: 50, rating: 4.4, ratingCount: '6.7k', image: 2, imageUrl: '/uploads/men-2.jpg', category: 'men', stock: 25 },
    { brand: "Levi's", name: 'Denim Jeans', price: 1899, mrp: 3699, discount: 49, rating: 4.5, ratingCount: '9.2k', image: 3, imageUrl: '/uploads/men-3.jpg', category: 'men', stock: 18 },
    { brand: 'Puma', name: 'Running Shoes', price: 2499, mrp: 4999, discount: 50, rating: 4.3, ratingCount: '5.3k', image: 4, imageUrl: '/uploads/men-4.jpg', category: 'men', stock: 22 },
    { brand: 'Adidas', name: 'Logo Hoodie', price: 1799, mrp: 3499, discount: 49, rating: 4.6, ratingCount: '7.8k', image: 5, imageUrl: '/uploads/men-5.jpg', category: 'men', stock: 16 },
    { brand: 'Wrogn', name: 'Graphic T-Shirt', price: 599, mrp: 1199, discount: 50, rating: 4.1, ratingCount: '4.9k', image: 6, imageUrl: '/uploads/men-6.jpg', category: 'men', stock: 40 },
    { brand: 'Nike', name: 'Street Sneakers', price: 3299, mrp: 6599, discount: 50, rating: 4.7, ratingCount: '11.2k', image: 7, imageUrl: '/uploads/men-7.jpg', category: 'men', stock: 14 },
    { brand: 'U.S. Polo', name: 'Polo T-Shirt', price: 1099, mrp: 2199, discount: 50, rating: 4.0, ratingCount: '3.5k', image: 8, imageUrl: '/uploads/men-8.jpg', category: 'men', stock: 28 }
];

const womenProducts = [
    { brand: 'H&M', name: 'Floral Maxi Dress', price: 1499, mrp: 2999, discount: 50, rating: 4.4, ratingCount: '6.2k', image: 1, imageUrl: '/uploads/women-1.jpg', category: 'women', stock: 20 },
    { brand: 'Zara', name: 'High Waist Jeans', price: 1999, mrp: 3999, discount: 50, rating: 4.3, ratingCount: '5.7k', image: 2, imageUrl: '/uploads/women-2.jpg', category: 'women', stock: 18 },
    { brand: 'Biba', name: 'Printed Kurta Set', price: 2299, mrp: 4599, discount: 50, rating: 4.5, ratingCount: '7.1k', image: 3, imageUrl: '/uploads/women-3.jpg', category: 'women', stock: 12 },
    { brand: 'Forever 21', name: 'Ribbed Crop Top', price: 799, mrp: 1599, discount: 50, rating: 4.1, ratingCount: '3.9k', image: 4, imageUrl: '/uploads/women-4.jpg', category: 'women', stock: 35 },
    { brand: 'Allen Solly', name: 'Office Blazer', price: 2599, mrp: 5199, discount: 50, rating: 4.2, ratingCount: '2.4k', image: 5, imageUrl: '/uploads/women-5.jpg', category: 'women', stock: 10 },
    { brand: 'Only', name: 'Casual T-Shirt', price: 699, mrp: 1399, discount: 50, rating: 4.0, ratingCount: '4.1k', image: 6, imageUrl: '/uploads/women-6.jpg', category: 'women', stock: 30 },
    { brand: 'Nike', name: 'Women Running Shoes', price: 2999, mrp: 5999, discount: 50, rating: 4.6, ratingCount: '5.6k', image: 7, imageUrl: '/uploads/women-7.jpg', category: 'women', stock: 14 },
    { brand: 'Aurelia', name: 'Anarkali Kurta', price: 1899, mrp: 3799, discount: 50, rating: 4.3, ratingCount: '4.8k', image: 8, imageUrl: '/uploads/women-8.jpg', category: 'women', stock: 16 }
];

const kidsProducts = [
    { brand: 'Nauti Nati', name: 'Boys Graphic Tee', price: 499, mrp: 999, discount: 50, rating: 4.2, ratingCount: '2.1k', image: 1, imageUrl: '/uploads/kids-1.jpg', category: 'kids', stock: 50 },
    { brand: 'Babyhug', name: 'Girls Party Dress', price: 899, mrp: 1799, discount: 50, rating: 4.3, ratingCount: '1.8k', image: 2, imageUrl: '/uploads/kids-2.jpg', category: 'kids', stock: 24 },
    { brand: 'Puma', name: 'Kids Sneakers', price: 1499, mrp: 2999, discount: 50, rating: 4.1, ratingCount: '1.2k', image: 3, imageUrl: '/uploads/kids-3.jpg', category: 'kids', stock: 30 },
    { brand: 'UCB Kids', name: 'Striped Polo Tee', price: 699, mrp: 1399, discount: 50, rating: 4.0, ratingCount: '1.5k', image: 4, imageUrl: '/uploads/kids-4.jpg', category: 'kids', stock: 40 },
    { brand: 'Gini & Jony', name: 'Denim Shorts', price: 799, mrp: 1599, discount: 50, rating: 4.2, ratingCount: '1.1k', image: 5, imageUrl: '/uploads/kids-5.jpg', category: 'kids', stock: 33 },
    { brand: 'Pepe Jeans', name: 'Hooded Sweatshirt', price: 999, mrp: 1999, discount: 50, rating: 4.4, ratingCount: '1.9k', image: 6, imageUrl: '/uploads/kids-6.jpg', category: 'kids', stock: 26 },
    { brand: 'Nike', name: 'Kids Sports Shoes', price: 1999, mrp: 3999, discount: 50, rating: 4.5, ratingCount: '2.6k', image: 7, imageUrl: '/uploads/kids-7.jpg', category: 'kids', stock: 18 },
    { brand: 'Mothercare', name: 'Cotton Pajama Set', price: 599, mrp: 1199, discount: 50, rating: 4.3, ratingCount: '1.7k', image: 8, imageUrl: '/uploads/kids-8.jpg', category: 'kids', stock: 45 }
];

const products = [...menProducts, ...womenProducts, ...kidsProducts];

async function seed() {
    try {
        await mongoose.connect(mongoUri);
        await Product.deleteMany({});
        await Product.insertMany(products);
        console.log(`Seeded ${products.length} products.`);
    } catch (err) {
        console.error('Seed error:', err);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

seed();
