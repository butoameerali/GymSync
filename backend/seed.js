import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import Gym from './models/Gym.js';
import Product from './models/Product.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/gymsync';
    console.log('Connecting to MongoDB database for seeding...');
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB Connected for Seeding.');

    // 1. Seed Accounts
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const ownerPassword = await bcrypt.hash('owner123', 10);
    const userPassword = await bcrypt.hash('user123', 10);

    const accounts = [
      {
        name: 'Admin Manager',
        email: 'admin@gymsync.com',
        password: hashedPassword,
        role: 'Admin',
        isBanned: false
      },
      {
        name: 'Elite Gym Owner',
        email: 'owner@gymsync.com',
        password: ownerPassword,
        role: 'GymOwner',
        isBanned: false
      },
      {
        name: 'John Doe',
        email: 'user@gymsync.com',
        password: userPassword,
        role: 'User',
        isBanned: false
      },
      {
        name: 'Store Master',
        email: 'store@gymsync.com',
        password: hashedPassword,
        role: 'StoreManager',
        isBanned: false
      },
      {
        name: 'Complaint Moderator',
        email: 'mod@gymsync.com',
        password: hashedPassword,
        role: 'ComplaintModerator',
        isBanned: false
      }
    ];

    for (const acc of accounts) {
      const existingUser = await User.findOne({ email: acc.email });
      if (!existingUser) {
        await User.create(acc);
        console.log(`✅ Seeded account: ${acc.email} [Role: ${acc.role}]`);
      } else {
        console.log(`ℹ️ Account ${acc.email} already exists.`);
      }
    }

    // 2. Seed Default Gym Facility
    const existingGym = await Gym.findOne({ ownerName: 'Elite Gym Owner' });
    if (!existingGym) {
      await Gym.create({
        name: 'Elite GymSync Fitness Center',
        location: 'Downtown Athletic District',
        monthlyFee: 50,
        ownerName: 'Elite Gym Owner',
        rating: 4.9,
        equipmentImages: [
          'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop'
        ]
      });
      console.log('✅ Seeded default Gym facility for Elite Gym Owner');
    }

    // 3. Seed Default Store Products
    const countProducts = await Product.countDocuments();
    if (countProducts === 0) {
      await Product.insertMany([
        { name: "Optimum Nutrition Gold Standard 100% Whey", category: "Proteins", price: 64.99, rating: 4.9, image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?q=80&w=1470&auto=format&fit=crop", badge: "Best Seller", status: "Approved" },
        { name: "GymSync Premium Performance T-Shirt", category: "Gym Wear", price: 24.99, rating: 4.7, image: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=1374&auto=format&fit=crop", badge: "New", status: "Approved" },
        { name: "Pro-Grip Lifting Straps", category: "Accessories", price: 14.99, rating: 4.5, image: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?q=80&w=1471&auto=format&fit=crop", status: "Approved" },
        { name: "C4 Original Pre-Workout", category: "Supplements", price: 29.99, rating: 4.8, image: "https://images.unsplash.com/photo-1579722820308-d74e571900a9?q=80&w=1470&auto=format&fit=crop", badge: "Sale", status: "Approved" },
        { name: "Adjustable Dumbbell Set (50lbs)", category: "Equipment", price: 199.99, rating: 4.9, image: "https://images.unsplash.com/photo-1638202993928-7267aad84c31?q=80&w=1374&auto=format&fit=crop", status: "Approved" }
      ]);
      console.log('✅ Seeded store inventory products');
    }

    console.log('\n🎉 Database Seeding Completed Successfully!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database Seeding Error:', err.message);
    process.exit(1);
  }
};

seedDatabase();
