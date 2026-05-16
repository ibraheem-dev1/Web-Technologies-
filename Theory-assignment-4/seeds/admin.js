const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const mongoUri = 'mongodb://127.0.0.1:27017/assignment3';

const adminEmail = 'admin@example.com';
const adminPassword = 'Admin@123';

async function seedAdmin() {
    try {
        await mongoose.connect(mongoUri);

        const existing = await User.findOne({ email: adminEmail }).lean();
        const passwordHash = await bcrypt.hash(adminPassword, 10);

        if (existing) {
            await User.updateOne(
                { email: adminEmail },
                { $set: { passwordHash, role: 'admin' } }
            );
            console.log('Admin user updated.');
        } else {
            await User.create({
                email: adminEmail,
                passwordHash,
                role: 'admin'
            });
            console.log('Admin user created.');
        }
    } catch (err) {
        console.error('Admin seed error:', err);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

seedAdmin();
