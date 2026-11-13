import AICoachMemory from '../../models/AICoachMemory.js';
import User from '../../models/User.js';

/**
 * Service for managing AI coach memory & server-side persistence of user-provided information.
 * Rule 5.3: When a user message needs missing info, the AI asks once, remembers it (server-side), and does not re-ask.
 */

// In-memory cache for fast lookups in test/isolated environments
const memoryCache = new Map();

export const aiUserMemoryService = {
  /**
   * Check if a specific missing info question has already been asked to the user
   */
  async hasBeenAsked(userId, fieldKey) {
    if (!userId || !fieldKey) return false;
    const uStr = String(userId);
    
    // Check in-memory cache first
    const cached = memoryCache.get(uStr);
    if (cached && cached.askedFields && cached.askedFields.has(fieldKey)) {
      return true;
    }

    try {
      const doc = await AICoachMemory.findOne({ userId });
      if (!doc) return false;

      const askedSet = new Set(doc.askedFields || []);
      if (!memoryCache.has(uStr)) {
        memoryCache.set(uStr, { askedFields: askedSet, learnedContext: new Map() });
      } else {
        memoryCache.get(uStr).askedFields = askedSet;
      }
      return askedSet.has(fieldKey);
    } catch (err) {
      console.warn('aiUserMemoryService.hasBeenAsked warning:', err.message);
      return false;
    }
  },

  /**
   * Record that a question has been asked to the user once, preventing repeated asks
   */
  async recordFieldAsked(userId, fieldKey) {
    if (!userId || !fieldKey) return;
    const uStr = String(userId);

    // Update in-memory cache
    if (!memoryCache.has(uStr)) {
      memoryCache.set(uStr, { askedFields: new Set([fieldKey]), learnedContext: new Map() });
    } else {
      memoryCache.get(uStr).askedFields.add(fieldKey);
    }

    try {
      await AICoachMemory.findOneAndUpdate(
        { userId },
        { 
          $addToSet: { askedFields: fieldKey },
          $set: { updatedAt: new Date() }
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.warn('aiUserMemoryService.recordFieldAsked warning:', err.message);
    }
  },

  /**
   * Reset asked questions for testing or explicit user reset
   */
  async resetMemory(userId) {
    if (!userId) return;
    memoryCache.delete(String(userId));
    try {
      await AICoachMemory.deleteOne({ userId });
    } catch (err) {
      console.warn('aiUserMemoryService.resetMemory warning:', err.message);
    }
  },

  /**
   * Parse user message for any provided missing information (weight, height, equipment, training days, fitness level).
   * Persists detected values server-side directly to User.bioData so they are permanently remembered.
   */
  async extractAndPersistUserEntities(userId, message = '', dbUser = null) {
    if (!message || typeof message !== 'string') return { updatedFields: {}, newlyLearned: false };
    const raw = message.trim();
    const lower = raw.toLowerCase();
    const updates = {};
    let newlyLearned = false;

    // 1. Weight Extraction (e.g., "75 kg", "75kg", "80 kilo", "165 lbs", "i weigh 70")
    const weightMatch = lower.match(/(?:i weigh|mera weight|weight is|wazan hai|wazan)?\s*(\d{2,3}(?:\.\d+)?)\s*(?:kg|kgs|kilo|kilos|pounds|lbs)?\b/);
    if (weightMatch) {
      const parsedWeight = parseFloat(weightMatch[1]);
      if (parsedWeight >= 30 && parsedWeight <= 250) {
        // If lbs was specified, convert to kg
        const isLbs = /lbs|pounds/i.test(weightMatch[0]);
        const weightKg = isLbs ? Math.round(parsedWeight * 0.453592) : Math.round(parsedWeight * 10) / 10;
        updates['bioData.weight'] = weightKg;
      }
    }

    // 2. Height Extraction (e.g., "175 cm", "180cm", "5 feet 10 inches", "5'10")
    const heightCmMatch = lower.match(/(\d{3})\s*(?:cm|cms|centimeters)\b/);
    if (heightCmMatch) {
      const cm = parseInt(heightCmMatch[1], 10);
      if (cm >= 100 && cm <= 250) {
        updates['bioData.height'] = cm;
      }
    } else {
      const feetInchesMatch = lower.match(/(\d)\s*(?:feet|ft|'|foot)\s*(\d{1,2})?(?:\s*(?:inches|in|"))?/);
      if (feetInchesMatch) {
        const feet = parseInt(feetInchesMatch[1], 10);
        const inches = parseInt(feetInchesMatch[2] || '0', 10);
        if (feet >= 4 && feet <= 7 && inches < 12) {
          const totalInches = (feet * 12) + inches;
          const cm = Math.round(totalInches * 2.54);
          updates['bioData.height'] = cm;
        }
      }
    }

    // 3. Equipment Access
    if (/\b(?:dumbbells? only|just dumbbells?|mere pas dumbbells hain)\b/i.test(lower)) {
      updates['bioData.equipmentAccess'] = 'Dumbbells Only';
    } else if (/\b(?:bodyweight only|calisthenics|no equipment|zero equipment|ghar par bina saman)\b/i.test(lower)) {
      updates['bioData.equipmentAccess'] = 'Bodyweight Only';
    } else if (/\b(?:full gym|commercial gym|proper gym)\b/i.test(lower)) {
      updates['bioData.equipmentAccess'] = 'Full Gym';
    } else if (/\b(?:home gym|home workout)\b/i.test(lower)) {
      updates['bioData.equipmentAccess'] = 'Home Gym';
    }

    // 4. Training Days Per Week (e.g. "3 days a week", "4 days per week", "haftay mein 4 din")
    const daysMatch = lower.match(/(\d)\s*(?:days?(?:\s*(?:per|\/|a)\s*week)?|din\s*haftay\s*mein|days)\b/);
    if (daysMatch) {
      const days = parseInt(daysMatch[1], 10);
      if (days >= 1 && days <= 7) {
        updates['bioData.trainingDaysPerWeek'] = days;
      }
    }

    // 5. Fitness Level
    if (/\b(?:beginner|newbie|start kar raha hoon|bilkul shuru)\b/i.test(lower)) {
      updates['bioData.fitnessLevel'] = 'Beginner';
    } else if (/\b(?:intermediate|moderate)\b/i.test(lower)) {
      updates['bioData.fitnessLevel'] = 'Intermediate';
    } else if (/\b(?:advanced|athlete|pro)\b/i.test(lower)) {
      updates['bioData.fitnessLevel'] = 'Advanced';
    }

    // Server-side persistence if any updates were detected
    const updateKeys = Object.keys(updates);
    if (updateKeys.length > 0 && userId) {
      newlyLearned = true;
      try {
        if (dbUser) {
          if (!dbUser.bioData) dbUser.bioData = {};
          for (const key of updateKeys) {
            const field = key.replace('bioData.', '');
            dbUser.bioData[field] = updates[key];
          }
          await dbUser.save();
        } else {
          await User.findByIdAndUpdate(userId, { $set: updates });
        }

        // Also record learned keys in AICoachMemory
        const flatLearned = {};
        for (const k of updateKeys) {
          const cleanK = k.replace('bioData.', '');
          flatLearned[cleanK] = updates[k];
        }
        await AICoachMemory.findOneAndUpdate(
          { userId },
          { 
            $set: { 
              learnedContext: flatLearned,
              updatedAt: new Date() 
            } 
          },
          { upsert: true }
        );
      } catch (saveErr) {
        console.warn('aiUserMemoryService.extractAndPersistUserEntities save warning:', saveErr.message);
      }
    }

    return { updatedFields: updates, newlyLearned };
  }
};

export default aiUserMemoryService;
