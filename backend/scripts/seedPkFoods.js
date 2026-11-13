/**
 * Seed Script: Pakistani Food Database
 * Reads /backend/data/pkFoods.json (~1024 entries) and seeds into MongoDB PkFood collection.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PkFood from '../models/PkFood.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

export async function seedPkFoods() {
  const jsonPath = path.resolve(__dirname, '../data/pkFoods.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`pkFoods.json not found at ${jsonPath}`);
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const foods = JSON.parse(raw);

  console.log(`📦 Loaded ${foods.length} Pakistani food records from ${jsonPath}`);

  const operations = foods.map(item => ({
    updateOne: {
      filter: { foodId: item.foodId },
      update: { $set: item },
      upsert: true
    }
  }));

  const result = await PkFood.bulkWrite(operations);
  console.log(`✅ PkFood seeding complete: ${result.upsertedCount} inserted, ${result.modifiedCount} modified.`);
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gymsync';
  mongoose.connect(mongoUri)
    .then(async () => {
      console.log('Connected to MongoDB');
      await seedPkFoods();
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
      process.exit(0);
    })
    .catch(err => {
      console.error('Failed to seed Pakistani foods:', err);
      process.exit(1);
    });
}
