const mongoose = require('mongoose');
const SessionRecording = require('../models/SessionRecording');
const UserInteraction = require('../models/UserInteraction');
const User = require('../models/User');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pagepulse';

console.log('Connecting to MongoDB...');

async function cleanAdminSessions() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Get all admin user IDs
        const adminUsers = await User.find({ role: 'admin' }).select('_id');
        const adminUserIds = adminUsers.map(u => u._id.toString());

        console.log(`Found ${adminUserIds.length} admin users`);

        if (adminUserIds.length === 0) {
            console.log('No admin users found, nothing to clean');
            return;
        }

        // Delete session recordings for admin users
        const sessionResult = await SessionRecording.deleteMany({
            userId: { $in: adminUserIds }
        });
        console.log(`✅ Deleted ${sessionResult.deletedCount} admin session recordings`);

        // Delete user interactions for admin users
        const interactionResult = await UserInteraction.deleteMany({
            userId: { $in: adminUserIds }
        });
        console.log(`✅ Deleted ${interactionResult.deletedCount} admin user interactions`);

        // Also delete sessions where userId matches admin path patterns
        const adminPathSessions = await SessionRecording.deleteMany({
            $or: [
                { entryURL: { $regex: '/admin', $options: 'i' } },
                { entryURL: { $regex: '/login', $options: 'i' } }
            ]
        });
        console.log(`✅ Deleted ${adminPathSessions.deletedCount} sessions from admin/login pages`);

        console.log('\n✅ Admin session cleanup complete!');

    } catch (error) {
        console.error('❌ Error cleaning admin sessions:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

cleanAdminSessions();
