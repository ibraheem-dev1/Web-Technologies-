const jwt = require('jsonwebtoken');
const User = require('../../models/User');

async function login(req, res) {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!email || !password) {
        return res.status(400).json({ ok: false, message: 'Email and password are required.' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        return res.status(500).json({ ok: false, message: 'Server misconfigured.' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ ok: false, message: 'Invalid email or password.' });
        }

        const isValid = await user.comparePassword(password);
        if (!isValid) {
            return res.status(401).json({ ok: false, message: 'Invalid email or password.' });
        }

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
