const offerImages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const categoryOptions = ['men', 'women', 'kids'];
const orderStatusOptions = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const categoryRoutes = [
    { path: '/men', active: 'men', name: 'Men' },
    { path: '/women', active: 'women', name: 'Women' },
    { path: '/kids', active: 'kids', name: 'Kids' }
];

module.exports = {
    offerImages,
    categoryOptions,
    orderStatusOptions,
    categoryRoutes
};
