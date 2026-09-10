// One-time backfill: populates senderId/receiverId on legacy Message documents that
// were created before those fields existed (or before the P2P sendMessage fix that
// stopped setting receiverId). Run once after deploying the chatController.js /
// authController.js identity fixes:
//
//   node backend/scripts/backfillMessageIdentity.js
//
// Safe to re-run — it only touches rows that are still missing an id. System-contact
// rows ('AI Trainer' / 'Gym Support') are intentionally skipped since they have no
// User document.
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/db.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const SYSTEM_CONTACTS = new Set(['AI Trainer', 'Gym Support']);

const run = async () => {
  await connectDB();
  console.log('Connected. Scanning for messages missing senderId/receiverId...');

  // Cache name -> _id lookups (case-insensitive) to avoid one query per message.
  const nameCache = new Map();
  const resolveId = async (name) => {
    if (!name || SYSTEM_CONTACTS.has(name)) return null;
    const key = name.toLowerCase();
    if (nameCache.has(key)) return nameCache.get(key);
    const u = await User.findOne({ name }).collation({ locale: 'en', strength: 2 }).select('_id');
    const id = u ? u._id : null;
    nameCache.set(key, id);
    return id;
  };

  const cursor = Message.find({
    $or: [{ senderId: null }, { receiverId: null }]
  }).cursor();

  let scanned = 0;
  let updated = 0;
  let unresolved = 0;

  for await (const msg of cursor) {
    scanned += 1;
    const updates = {};

    if (!msg.senderId && !SYSTEM_CONTACTS.has(msg.sender)) {
      const id = await resolveId(msg.sender);
      if (id) updates.senderId = id; else unresolved += 1;
    }
    if (!msg.receiverId && !SYSTEM_CONTACTS.has(msg.receiver)) {
      const id = await resolveId(msg.receiver);
      if (id) updates.receiverId = id; else unresolved += 1;
    }

    if (Object.keys(updates).length > 0) {
      await Message.updateOne({ _id: msg._id }, { $set: updates });
      updated += 1;
    }
  }

  console.log(`Scanned: ${scanned}. Updated: ${updated}. Unresolved name lookups: ${unresolved}.`);
  console.log('Unresolved rows are usually messages from/to since-deleted accounts — expected, left as name-only.');
  process.exit(0);
};

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
