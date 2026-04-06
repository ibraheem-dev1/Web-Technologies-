const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Serve static files (like css, js, images) from the current folder
app.use(express.static(__dirname));

// Single line HTML response for nav links
app.get('/men', (req, res) => res.send('<h1>This is the Men page</h1><a href="/">Go Back</a>'));
app.get('/women', (req, res) => res.send('<h1>This is the Women page</h1><a href="/">Go Back</a>'));
app.get('/kids', (req, res) => res.send('<h1>This is the Kids page</h1><a href="/">Go Back</a>'));
app.get('/home-living', (req, res) => res.send('<h1>This is the Home & Living page</h1><a href="/">Go Back</a>'));
app.get('/beauty', (req, res) => res.send('<h1>This is the Beauty page</h1><a href="/">Go Back</a>'));
app.get('/studio', (req, res) => res.send('<h1>This is the Studio page</h1><a href="/">Go Back</a>'));

// Serve the main index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
