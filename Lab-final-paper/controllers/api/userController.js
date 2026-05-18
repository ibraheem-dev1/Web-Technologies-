const User = require('../../models/User');

async function profile(req, res) {
    const userId = req.user && req.user.user_id;
    if (!userId) {
        return res.status(401).json({ ok: false, message: 'Unauthorized.' });
    }

    try {
        const user = await User.findById(userId).select('name email role').lean();
        if (!user) {
            return res.status(404).json({ ok: false, message: 'User not found.' });
        }

        return res.json({
            ok: true,
            user: {
                id: String(user._id),
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error('API profile error:', err);
        return res.status(500).json({ ok: false, message: 'Unable to load profile.' });
    }
}

module.exports = {
    profile
};
