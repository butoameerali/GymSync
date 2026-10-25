import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import connectDB from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const [,, emailArg, passwordArg, nameArg, roleArg] = process.argv;

if (!emailArg || !passwordArg) {
  console.log('Usage: node scripts/createAdmin.js <email> <password> [name] [role]');
  console.log('Example: node scripts/createAdmin.js butoameerali@gmail.com MySecurePass123 "Ameer Ali" SuperAdmin');
  process.exit(1);
}

const email = emailArg.toLowerCase().trim();
const password = passwordArg;
const name = nameArg || email.split('@')[0];
const role = roleArg || 'SuperAdmin';

const VALID_ROLES = ['SuperAdmin', 'Admin', 'ComplaintModerator', 'FitnessInstructor'];
if (!VALID_ROLES.includes(role)) {
  console.error(`Invalid admin role "${role}". Must be one of: ${VALID_ROLES.join(', ')}`);
  process.exit(1);
}

async function main() {
  try {
    console.log(`Connecting to MongoDB...`);
    await connectDB();
    console.log('Connected to MongoDB via connectDB().');

    let user = await User.findOne({ email });

    if (user) {
      console.log(`User ${email} already exists with role: "${user.role}". Updating credentials & promoting to "${role}"...`);
      user.password = password; // Will be hashed by userSchema.pre('save')
      user.role = role;
      user.isEmailVerified = true;
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      user.accountStatus = 'Active';
      user.isBanned = false;
      user.isDeleted = false;
      user.isDeactivated = false;
      await user.save();
      console.log(`✅ User ${email} successfully updated and granted role "${role}".`);
    } else {
      console.log(`Creating new administrative user ${email} with role "${role}"...`);
      user = new User({
        name,
        email,
        password,
        role,
        isEmailVerified: true,
        accountStatus: 'Active',
        failedLoginAttempts: 0,
        lockUntil: null
      });
      await user.save();
      console.log(`✅ Admin account created successfully!`);
    }

    console.log(`\n--------------------------------------------`);
    console.log(`Email:    ${user.email}`);
    console.log(`Name:     ${user.name}`);
    console.log(`Role:     ${user.role}`);
    console.log(`Portal:   http://localhost:5174/login`);
    console.log(`--------------------------------------------\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create/update admin:', error);
    process.exit(1);
  }
}

main();
