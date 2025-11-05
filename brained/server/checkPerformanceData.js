require('dotenv').config();
const mongoose = require('mongoose');
const PerformanceMetrics = require('./models/PerformanceMetrics');

async function checkData() {
    await mongoose.connect(process.env.MONGO_URI);

    const count = await PerformanceMetrics.countDocuments();
    console.log('📊 Total performance records:', count);

    const withErrors = await PerformanceMetrics.countDocuments({
        jsErrors: { $exists: true, $ne: [] }
    });
    console.log('🐛 Records with JS errors:', withErrors);

    const stats = await PerformanceMetrics.aggregate([
        {
            $group: {
                _id: null,
                avgCLS: { $avg: '$CLS' },
                avgLCP: { $avg: '$LCP' },
                avgFID: { $avg: '$FID' },
                avgINP: { $avg: '$INP' },
                maxCLS: { $max: '$CLS' },
                maxLCP: { $max: '$LCP' },
                maxFID: { $max: '$FID' },
                nonZeroCLS: { $sum: { $cond: [{ $gt: ['$CLS', 0] }, 1, 0] } },
                nonZeroLCP: { $sum: { $cond: [{ $gt: ['$LCP', 0] }, 1, 0] } },
                nonZeroFID: { $sum: { $cond: [{ $gt: ['$FID', 0] }, 1, 0] } }
            }
        }
    ]);

    console.log('\n📈 Performance Stats:');
    console.log('Avg CLS:', stats[0]?.avgCLS?.toFixed(3));
    console.log('Avg LCP:', Math.round(stats[0]?.avgLCP), 'ms');
    console.log('Avg FID:', Math.round(stats[0]?.avgFID), 'ms');
    console.log('Avg INP:', Math.round(stats[0]?.avgINP), 'ms');
    console.log('\n✅ Non-zero values:');
    console.log('CLS > 0:', stats[0]?.nonZeroCLS, 'records');
    console.log('LCP > 0:', stats[0]?.nonZeroLCP, 'records');
    console.log('FID > 0:', stats[0]?.nonZeroFID, 'records');

    // Check timestamp distribution for trends
    const timeRange = await PerformanceMetrics.aggregate([
        {
            $group: {
                _id: null,
                oldest: { $min: '$timestamp' },
                newest: { $max: '$timestamp' },
                uniqueHours: {
                    $addToSet: {
                        $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' }
                    }
                }
            }
        }
    ]);

    console.log('\n🕐 Timestamp Range:');
    console.log('Oldest:', timeRange[0]?.oldest);
    console.log('Newest:', timeRange[0]?.newest);
    console.log('Unique hours:', timeRange[0]?.uniqueHours?.length);

    mongoose.disconnect();
}

checkData().catch(console.error);
