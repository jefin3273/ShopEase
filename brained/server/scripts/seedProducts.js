/*
 Seed products into MongoDB
 Usage:
   node scripts/seedProducts.js            # upsert by title (no deletes)
   node scripts/seedProducts.js --reset    # delete all products then insert fresh

 Requires MONGO_URI in server/.env (same as server.js)
*/

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');

const log = (...args) => console.log('[seed:products]', ...args);

// Stable Unsplash image helper (just plain URLs)
// Note: These are example public Unsplash images. You can replace with your own later.
const U = {
  headphones:
    'https://images.unsplash.com/photo-1518444028785-8fbcd101ebb9?q=80&w=1600&auto=format&fit=crop',
  smartwatch:
    'https://images.unsplash.com/photo-1516264666780-84c3f03b4ed8?q=80&w=1600&auto=format&fit=crop',
  tshirt:
    'https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=1600&auto=format&fit=crop',
  mug:
    'https://images.unsplash.com/photo-1498804103079-a6351b050096?q=80&w=1600&auto=format&fit=crop',
  shoes:
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1600&auto=format&fit=crop',
  serum:
    'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?q=80&w=1600&auto=format&fit=crop',
  lamp:
    'https://images.unsplash.com/photo-1507473885765-e6ed57cca1c7?q=80&w=1600&auto=format&fit=crop',
  backpack:
    'https://images.unsplash.com/photo-1514477917009-389c76a86b68?q=80&w=1600&auto=format&fit=crop',
  coffee:
    'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?q=80&w=1600&auto=format&fit=crop',
  monitor:
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1600&auto=format&fit=crop',
  duvet:
    'https://images.unsplash.com/photo-1505693314120-0d443867891c?q=80&w=1600&auto=format&fit=crop',
  speaker:
    'https://images.unsplash.com/photo-1518443895914-6f8e1b87c2d3?q=80&w=1600&auto=format&fit=crop',
};

const products = [
  {
    title: 'Aurora Wireless Headphones',
    description:
      'Immersive over‑ear wireless headphones with active noise cancellation, 30h battery life, and plush comfort for all‑day listening.',
    price: 129.99,
    originalPrice: 179.99,
    category: 'Electronics',
    featured: true,
    image: U.headphones,
    images: [U.headphones, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=1600&auto=format&fit=crop'],
    colors: [
      { id: 'blk', name: 'Black', class: 'bg-gray-900' },
      { id: 'sil', name: 'Silver', class: 'bg-gray-300' },
    ],
    sizes: [],
    highlights: ['Active Noise Cancellation', 'Bluetooth 5.3', '30h Battery', 'USB‑C Fast Charge'],
    details:
      'Engineered with dual‑chamber drivers for rich bass and crisp highs. Foldable design with memory‑foam ear cushions.',
    stock: 120,
    rating: 4.7,
    reviewCount: 128,
    badge: 'Best Seller',
  },
  {
    title: 'Nimbus Smartwatch Series 5',
    description:
      'Track your fitness, receive notifications, and personalize your style with interchangeable bands and always‑on display.',
    price: 249.99,
    originalPrice: 299.99,
    category: 'Wearables',
    featured: true,
    image: U.smartwatch,
    images: [U.smartwatch],
    colors: [
      { id: 'grf', name: 'Graphite', class: 'bg-gray-800' },
      { id: 'stl', name: 'Steel', class: 'bg-gray-400' },
    ],
    sizes: [
      { name: '40mm', inStock: true },
      { name: '44mm', inStock: true },
    ],
    highlights: ['Heart‑rate + SpO₂', 'GPS + NFC', '7‑day battery', '5‑ATM water resistant'],
    details: 'Lightweight aluminum case with sapphire glass. Works with iOS and Android.',
    stock: 80,
    rating: 4.5,
    reviewCount: 92,
    badge: 'New',
  },
  {
    title: 'Luma Cotton T‑Shirt',
    description:
      'Ultra‑soft 100% combed cotton tee with a modern relaxed fit. Perfect staple for everyday wear.',
    price: 24.0,
    originalPrice: 29.0,
    category: 'Apparel',
    featured: false,
    image: U.tshirt,
    images: [U.tshirt],
    colors: [
      { id: 'blk', name: 'Black', class: 'bg-black' },
      { id: 'wht', name: 'White', class: 'bg-white' },
      { id: 'nav', name: 'Navy', class: 'bg-blue-900' },
    ],
    sizes: [
      { name: 'XS', inStock: true },
      { name: 'S', inStock: true },
      { name: 'M', inStock: true },
      { name: 'L', inStock: true },
      { name: 'XL', inStock: true },
    ],
    highlights: ['100% cotton', 'Pre‑shrunk', 'Relaxed fit', 'Machine washable'],
    details: 'Responsibly made with long‑staple cotton. Soft hand‑feel and durable ribbed collar.',
    stock: 400,
    rating: 4.6,
    reviewCount: 310,
    badge: 'Best Seller',
  },
  {
    title: 'Terra Ceramic Mug Set (2‑Pack)',
    description:
      'Hand‑glazed stoneware mugs with a matte exterior and glossy interior. Keeps drinks warmer for longer.',
    price: 28.0,
    category: 'Home & Kitchen',
    image: U.mug,
    images: [U.mug],
    colors: [
      { id: 'crm', name: 'Cream', class: 'bg-amber-100' },
      { id: 'slat', name: 'Slate', class: 'bg-slate-500' },
    ],
    sizes: [],
    highlights: ['12oz capacity', 'Dishwasher safe', 'Microwave safe'],
    details: 'A comfortable C‑handle and thick wall design reduce heat transfer to hands.',
    stock: 250,
    rating: 4.4,
    reviewCount: 61,
    badge: 'Popular',
  },
  {
    title: 'Peak Performance Running Shoes',
    description:
      'Supportive daily trainers with responsive cushioning and breathable mesh upper for long runs.',
    price: 99.0,
    originalPrice: 129.0,
    category: 'Footwear',
    featured: true,
    image: U.shoes,
    images: [U.shoes],
    colors: [
      { id: 'blk', name: 'Black', class: 'bg-gray-900' },
      { id: 'sky', name: 'Sky', class: 'bg-sky-400' },
    ],
    sizes: [
      { name: '7', inStock: true },
      { name: '8', inStock: true },
      { name: '9', inStock: true },
      { name: '10', inStock: true },
      { name: '11', inStock: true },
    ],
    highlights: ['Responsive foam', 'Breathable upper', 'Durable outsole'],
    details: 'Rockered geometry promotes a smooth transition from heel to toe.',
    stock: 140,
    rating: 4.3,
    reviewCount: 204,
    badge: 'Sale',
  },
  {
    title: 'Sola Hydrating Face Serum',
    description:
      'Lightweight serum with hyaluronic acid and vitamin B5 for daily hydration and dewy glow.',
    price: 32.0,
    category: 'Beauty',
    image: U.serum,
    images: [U.serum],
    colors: [],
    sizes: [],
    highlights: ['Fragrance‑free', 'Dermatologist tested', 'Vegan & cruelty‑free'],
    details: 'Absorbs quickly and layers well under makeup or sunscreen.',
    stock: 500,
    rating: 4.8,
    reviewCount: 512,
    badge: 'Top Rated',
  },
  {
    title: 'Cascadia Wood Desk Lamp',
    description:
      'Mid‑century inspired lamp with solid wood base and linen shade. Warm ambient lighting for workspaces.',
    price: 79.0,
    category: 'Home Decor',
    image: U.lamp,
    images: [U.lamp],
    colors: [
      { id: 'oak', name: 'Oak', class: 'bg-amber-600' },
      { id: 'wal', name: 'Walnut', class: 'bg-amber-800' },
    ],
    sizes: [],
    highlights: ['LED compatible', 'Fabric shade', 'Inline switch'],
    details: 'Compact footprint fits small desks and side tables.',
    stock: 90,
    rating: 4.2,
    reviewCount: 48,
    badge: 'New',
  },
  {
    title: 'Evergreen Backpack 28L',
    description:
      'Durable daypack with padded laptop sleeve, water‑resistant fabric, and ergonomic straps for comfort.',
    price: 89.0,
    category: 'Accessories',
    image: U.backpack,
    images: [U.backpack],
    colors: [
      { id: 'for', name: 'Forest', class: 'bg-green-700' },
      { id: 'cbl', name: 'Cobalt', class: 'bg-blue-700' },
    ],
    sizes: [],
    highlights: ['28L capacity', 'Padded laptop sleeve', 'YKK zippers'],
    details: 'Side pockets fit bottles up to 1L. Reinforced bottom panel.',
    stock: 160,
    rating: 4.5,
    reviewCount: 133,
    badge: 'Popular',
  },
  {
    title: 'Voyage Pour‑Over Coffee Maker',
    description:
      'Borosilicate glass dripper with stainless steel filter for clean, aromatic brews at home.',
    price: 55.0,
    category: 'Kitchen',
    image: U.coffee,
    images: [U.coffee],
    colors: [],
    sizes: [],
    highlights: ['Reusable steel filter', 'Heat‑resistant glass', 'Dishwasher safe'],
    details: '2‑4 cup capacity with precision spout for controlled pouring.',
    stock: 110,
    rating: 4.1,
    reviewCount: 71,
    badge: 'Eco',
  },
  {
    title: 'Atlas Ultra 27" 4K Monitor',
    description:
      'Stunning 4K IPS panel with 99% sRGB, HDR10 support, and USB‑C power delivery for single‑cable setups.',
    price: 399.0,
    originalPrice: 499.0,
    category: 'Electronics',
    featured: true,
    image: U.monitor,
    images: [U.monitor],
    colors: [{ id: 'blk', name: 'Black', class: 'bg-gray-900' }],
    sizes: [],
    highlights: ['4K IPS', 'HDR10', 'USB‑C 65W', 'Adjustable stand'],
    details: 'Factory‑calibrated color accuracy and ultra‑thin bezels.',
    stock: 60,
    rating: 4.6,
    reviewCount: 87,
    badge: 'Editor’s Pick',
  },
  {
    title: 'Haven Linen Duvet Cover',
    description:
      'Breathable pre‑washed linen for year‑round comfort. Gets softer with every wash.',
    price: 129.0,
    category: 'Home & Living',
    image: U.duvet,
    images: [U.duvet],
    colors: [
      { id: 'ivo', name: 'Ivory', class: 'bg-amber-50' },
      { id: 'sge', name: 'Sage', class: 'bg-green-300' },
    ],
    sizes: [
      { name: 'Full/Queen', inStock: true },
      { name: 'King', inStock: true },
    ],
    highlights: ['Pre‑washed', 'Hidden ties', 'Machine washable'],
    details: 'OEKO‑TEX certified and woven from European flax.',
    stock: 95,
    rating: 4.4,
    reviewCount: 54,
    badge: 'Cozy',
  },
  {
    title: 'Orbit Bluetooth Speaker',
    description:
      'Pocket‑sized speaker with punchy bass, IPX7 water resistance, and 12‑hour battery life.',
    price: 59.0,
    category: 'Electronics',
    image: U.speaker,
    images: [U.speaker],
    colors: [
      { id: 'blk', name: 'Black', class: 'bg-gray-900' },
      { id: 'red', name: 'Crimson', class: 'bg-red-600' },
    ],
    sizes: [],
    highlights: ['IPX7', '12‑hour battery', 'Stereo pair'],
    details: 'USB‑C charging and low‑latency mode for videos.',
    stock: 220,
    rating: 4.3,
    reviewCount: 142,
    badge: 'Portable',
  },
];

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not defined. Create server/.env with MONGO_URI');
    process.exit(1);
  }

  const reset = process.argv.includes('--reset');

  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    log('Connected to MongoDB');

    if (reset) {
      await Product.deleteMany({});
      log('Cleared existing products');
    }

    let inserted = 0;
    let updated = 0;

    for (const p of products) {
      if (reset) {
        await Product.create(p);
        inserted++;
      } else {
        const res = await Product.findOneAndUpdate(
          { title: p.title },
          { $set: p },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        // crude check: if doc existed before, count as updated (no easy way here, so read again by title)
        // Better approach would be to first find then update, but fine for seed purposes
        // We'll do a simple existence check before upsert instead
      }
    }

    if (!reset) {
      // Do a two-pass to correctly count inserts vs updates (lightweight, small dataset)
      inserted = 0;
      updated = 0;
      for (const p of products) {
        const existed = await Product.findOne({ title: p.title });
        if (existed) {
          // Compare a couple fields to guess if it was newly inserted this run
          const createdAgo = Date.now() - existed.createdAt.getTime();
          if (createdAgo < 60 * 1000) inserted++;
          else updated++;
        }
      }
    }

    const total = await Product.countDocuments();
    log(`Seed complete. Inserted: ${inserted}, Updated: ${updated}, Total now: ${total}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  }
}

run();
