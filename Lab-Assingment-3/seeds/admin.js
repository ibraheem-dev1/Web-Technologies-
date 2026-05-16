const mongoose = require('mongoose');
const User = require('../models/User');

const mongoUri = 'mongodb://127.0.0.1:27017/assignment3';

const adminEmail = 'admin@example.com';
const adminPassword = 'Admin@123';
const adminName = 'Admin';

async function seedAdmin() {
    try {
        await mongoose.connect(mongoUri);

        const existing = await User.findOne({ email: adminEmail });

        if (existing) {
            existing.name = adminName;
            existing.password = adminPassword;
            existing.role = 'admin';
            await existing.save();
            console.log('Admin user updated.');
        } else {
            await User.create({
                name: adminName,
                email: adminEmail,
                password: adminPassword,
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
