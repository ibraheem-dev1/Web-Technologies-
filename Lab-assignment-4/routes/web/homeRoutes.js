const express = require('express');
const homeController = require('../../controllers/web/homeController');
const { categoryRoutes } = require('../../shared/constants');

const router = express.Router();

router.get('/', homeController.home);

categoryRoutes.forEach(route => {
    router.get(route.path, (req, res) => homeController.category(req, res, route));
});

module.exports = router;
