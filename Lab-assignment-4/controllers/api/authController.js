const jwt = require('jsonwebtoken');
const userService = require('../../services/userService');

async function login(req, res) {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        return res.status(500).json({ ok: false, message: 'Server misconfigured.' });
    }

    try {
        const authResult = await userService.authenticateUser({ email, password });
        if (!authResult.ok) {
            const status = authResult.reason === 'missing_fields' ? 400 : 401;
            const message = authResult.reason === 'missing_fields'
                ? 'Email and password are required.'
                : 'Invalid email or password.';
            return res.status(status).json({ ok: false, message });
        }

        const user = authResult.user;

        const token = jwt.sign(
            { user_id: String(user._id), role: user.role },
            jwtSecret,
            { expiresIn: '1h' }
        );

        return res.json({
            ok: true,
            token,
            user: {
                id: String(user._id),
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error('API login error:', err);
        return res.status(500).json({ ok: false, message: 'Login failed.' });
    }
}

module.exports = {
    login
};
