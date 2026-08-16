import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import Gym from './models/Gym.js';
import Product from './models/Product.js';
import Exercise from './models/Exercise.js';

dotenv.config();

const seedDatabase = async (attempt = 1) => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/gymsync';
    console.log(`Connecting to MongoDB database for seeding (Attempt ${attempt})...`);
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB Connected for Seeding.');

    // 1. Seed 3 Admin Accounts (1 SuperAdmin + 2 Junior Admins)
    // Use plain passwords here; the User model will hash them automatically.
    const adminPassword = 'admin123';
    const ownerPassword = 'owner123';
    const userPassword = 'user123';

    const accounts = [
      {
        name: 'Senior Super Admin',
        email: 'admin@gymsync.com',
        password: adminPassword,
        role: 'SuperAdmin',
        adminTier: 'Senior',
        isBanned: false
      },
      {
        name: 'Junior Admin Alex',
        email: 'admin2@gymsync.com',
        password: adminPassword,
        role: 'Admin',
        adminTier: 'Junior',
        isBanned: false
      },
      {
        name: 'Junior Admin Sarah',
        email: 'admin3@gymsync.com',
        password: adminPassword,
        role: 'Admin',
        adminTier: 'Junior',
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
      }
    ];

    for (const acc of accounts) {
      const existingUser = await User.findOne({ email: acc.email });
      if (!existingUser) {
        await User.create(acc);
        console.log(`✅ Seeded account: ${acc.email} [Role: ${acc.role}, Tier: ${acc.adminTier || 'None'}]`);
      } else {
        // For admin-type accounts, ensure role, tier and password are enforced
        if (acc.role === 'SuperAdmin' || acc.role === 'Admin') {
          existingUser.role = acc.role;
          existingUser.adminTier = acc.adminTier || existingUser.adminTier;
          existingUser.password = acc.password; // plain password, will be hashed by pre-save hook
          await existingUser.save();
          console.log(`✅ Updated admin account ${acc.email} to role ${acc.role} and ensured password.`);
        } else {
          console.log(`ℹ️ Account ${acc.email} already exists.`);
        }
      }
    }

    // 2. Seed Default Pending Gym Owner Application for Admin Approval
    const existingGym = await Gym.findOne({ name: 'Downtown Powerhouse Gym' });
    if (!existingGym) {
      await Gym.create({
        name: 'Downtown Powerhouse Gym',
        location: 'Westside Athletic Complex',
        monthlyFee: 65,
        ownerName: 'Elite Gym Owner',
        ownerEmail: 'owner@gymsync.com',
        approvalStatus: 'Pending',
        equipmentImages: ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop']
      });
      console.log('✅ Seeded pending Gym Owner facility registration for Admin approval.');
    }

    // 3. Seed Default Store Products
    const countProducts = await Product.countDocuments();
    if (countProducts === 0) {
      await Product.insertMany([
        { name: "Optimum Nutrition Gold Standard 100% Whey", category: "Proteins", price: 64.99, rating: 4.9, image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?q=80&w=1470&auto=format&fit=crop", badge: "Best Seller", status: "Approved" },
        { name: "GymSync Premium Performance T-Shirt", category: "Gym Wear", price: 24.99, rating: 4.7, image: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=1374&auto=format&fit=crop", badge: "New", status: "Approved" },
        { name: "Pro-Grip Lifting Straps", category: "Accessories", price: 14.99, rating: 4.5, image: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?q=80&w=1471&auto=format&fit=crop", status: "Approved" }
      ]);
      console.log('✅ Seeded store inventory products');
    }

    // 4. Seed Default Exercises with running_v1 GPS Detector
    const existingRunning = await Exercise.findOne({ name: 'Outdoor Running' });
    if (!existingRunning) {
      await Exercise.create({
        exerciseId: 'EX-RUNNING-V1',
        name: 'Outdoor Running',
        targetMuscles: ['Full Body', 'Cardio', 'Quads'],
        equipmentRequired: 'None',
        difficulty: 'Beginner',
        description: 'Outdoor running with optional GPS distance tracking.',
        isAiTrackable: true,
        aiDetection: {
          enabled: true,
          detectorId: 'running_v1',
          detectorVersion: '1.0'
        }
      });
      console.log('✅ Seeded Outdoor Running exercise with aiDetection (running_v1).');
    }

    console.log('\n🎉 Database Seeding Completed Successfully!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database Seeding Error:', err.message);
    if (attempt < 3) {
      console.log('Retrying seed connection in 2 seconds...');
      setTimeout(() => seedDatabase(attempt + 1), 2000);
    } else {
      process.exit(1);
    }
  }
};

seedDatabase();
