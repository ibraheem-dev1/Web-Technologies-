function requireJwtSecret(req, res, next) {
    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is required. Set it in the .env file.');
        return res.status(500).send('Server misconfigured.');
    }
    return next();
}

module.exports = requireJwtSecret;
