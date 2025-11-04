const User = require('../models/User');

/**
 * Enrich events/sessions with user information
 * @param {Array} items - Array of events/sessions with userId field
 * @returns {Promise<Array>} - Items enriched with userName field
 */
async function enrichWithUserNames(items) {
    if (!items || items.length === 0) return items;

    // Get all unique user IDs (filter out ObjectId types and only keep string IDs that might be ObjectIds)
    const userIds = [...new Set(
        items
            .map(item => item.userId)
            .filter(id => id && typeof id === 'string' && id !== 'anonymous' && id.length === 24) // MongoDB ObjectIds are 24 chars
    )];

    if (userIds.length === 0) {
        // No valid user IDs, just add userName field as userId or 'Anonymous'
        return items.map(item => ({
            ...item.toObject ? item.toObject() : item,
            userName: item.userId || 'Anonymous'
        }));
    }

    // Fetch users in bulk
    const users = await User.find({ _id: { $in: userIds } }).select('_id name email').lean();
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    // Enrich items with user names
    return items.map(item => {
        const itemObj = item.toObject ? item.toObject() : item;
        const user = userMap.get(itemObj.userId);

        return {
            ...itemObj,
            userName: user ? user.name : (itemObj.userId || 'Anonymous'),
            userEmail: user ? user.email : null
        };
    });
}

/**
 * Get user name by ID
 * @param {String} userId - User ID
 * @returns {Promise<String>} - User name or 'Anonymous'
 */
async function getUserName(userId) {
    if (!userId || userId === 'anonymous' || typeof userId !== 'string' || userId.length !== 24) {
        return 'Anonymous';
    }

    try {
        const user = await User.findById(userId).select('name').lean();
        return user ? user.name : 'Anonymous';
    } catch (error) {
        return 'Anonymous';
    }
}

module.exports = {
    enrichWithUserNames,
    getUserName
};
