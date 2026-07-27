import express from 'express';
import AICache from '../models/AICache.js';

// Helper to normalize user queries for caching (lowercasing, removing extra punctuation and spaces)
const normalizeQuery = (query) => {
  if (!query) return '';
  return query
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Common greetings list
const GREETINGS = [
  'hi', 'hello', 'hey', 'hi there', 'hello there', 'hey coach', 'hi coach',
  'good morning', 'good evening', 'good afternoon', 'greetings', 'sup', 'yo'
];

// Check if message is a simple greeting
const isGreeting = (query) => {
  const normalized = normalizeQuery(query);
  return GREETINGS.some(g => normalized === g || normalized === `${g} ai` || normalized === `${g} bot`);
};

// Fitness domain keywords for strict guardrail validation
const FITNESS_KEYWORDS = [
  'workout', 'exercise', 'gym', 'fitness', 'diet', 'nutrition', 'protein', 'calorie',
  'muscle', 'weight', 'fat', 'running', 'run', 'pushup', 'squat', 'bench', 'deadlift',
  'cardio', 'training', 'trainer', 'health', 'bodybuilding', 'arm', 'leg', 'back',
  'chest', 'abs', 'stamina', 'flexibility', 'warmup', 'cooldown', 'recovery',
  'bicep', 'tricep', 'shoulder', 'routine', 'plan', 'creatine', 'supplement', 'physique',
  'pain', 'injury', 'joint', 'stretch', 'posture', 'bmi', 'tdee', 'hiit', 'rep', 'set',
  'motivate', 'motivation', 'bulk', 'cut', 'gain', 'lose'
];

// Check if query is strictly fitness/health related or a greeting
const isFitnessRelated = (query) => {
  if (isGreeting(query)) return true;
  const normalized = normalizeQuery(query);
  if (!normalized) return false;
  return FITNESS_KEYWORDS.some(keyword => normalized.includes(keyword));
};

// Standard natural greeting message
const GET_GREETING_RESPONSE = (name) => {
  const userNameStr = name ? ` ${name}` : '';
  return `Hello${userNameStr}! 👋 Welcome to GymSync!

I am your **GymSync AI Fitness & Medical Health Coach**. I can help you with:
- 🏋️ **Custom Workout Routines & Training Plans**
- 🥗 **Sports Nutrition & Calorie/Macro Diet Advice**
- 🩺 **Exercise Safety & Joint Alignment Rules**
- 🏃 **Cardio, Running & Recovery Strategies**

How can I assist you with your fitness goals today?`;
};

export const handleChat = async (req, res) => {
  try {
    const { message, userContext, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const rawMessage = message.trim();
    const normalized = normalizeQuery(rawMessage);

    // 1. GREETING HANDLER: If user simply says "hi", "hello", etc., return a warm, friendly response
    if (isGreeting(rawMessage)) {
      const userName = userContext?.name || '';
      return res.status(200).json({
        role: 'assistant',
        content: GET_GREETING_RESPONSE(userName)
      });
    }

    // 2. STRICT DOMAIN GUARDRAIL: Filter out non-fitness / general chat questions
    if (!isFitnessRelated(rawMessage)) {
      return res.status(200).json({
        role: 'assistant',
        content: "🏋️ **GymSync AI Coach Notice:**\n\nI am strictly trained as a fitness, gym workout, sports nutrition, and exercise medical specialist. I can only answer questions related to workouts, exercise routines, diet plans, muscle building, and sports safety.\n\nPlease ask a fitness or health-related question!"
      });
    }

    // 3. SMART Q&A DATABASE CACHE: Check MongoDB if this question was previously answered
    // (Clear old bad greetings cache if any existed)
    try {
      // Clean up legacy robotic cache for simple greetings if it exists
      await AICache.deleteMany({ normalizedQuery: { $in: GREETINGS } });

      const cachedQA = await AICache.findOne({ normalizedQuery: normalized });
      if (cachedQA && cachedQA.response && !cachedQA.response.includes('What target muscle group')) {
        cachedQA.hitCount += 1;
        cachedQA.lastUsedAt = new Date();
        await cachedQA.save();

        console.log(`[AI Cache Hit] Saved model tokens for query: "${normalized}" (Hits: ${cachedQA.hitCount})`);
        return res.status(200).json({
          role: 'assistant',
          content: cachedQA.response,
          fromCache: true
        });
      }
    } catch (cacheErr) {
      console.warn('[AI Cache Warning] DB lookup failed, continuing with direct AI model call:', cacheErr.message);
    }

    // 4. MEDICAL & SPORTS SCIENCE SYSTEM PROMPT
    let systemPrompt = `You are the GymSync AI Lead Coach & Sports Medicine Specialist.
You combine elite strength & conditioning coaching with evidence-based sports science and kinesiology.

PERSONALITY & TONE:
- Be warm, encouraging, energetic, and highly professional.
- When greted, welcome the user warmly and naturally.

STRICT MEDICAL & SAFETY GUARDRAILS:
1. Form & Spine Neutrality: Always emphasize proper joint alignment (e.g. keeping knees inline with toes during squats, neutral spine during deadlifts/lifts).
2. Injury Prevention: Advise users to stop immediately if they feel sharp joint pain. Include medical disclaimers if users mention pre-existing conditions or severe pain.
3. Workout Structure: Every workout recommendation must include:
   - Dynamic Warm-up (3-5 mins)
   - Core Resistance / Cardio Workouts (Sets, Reps, Rest intervals)
   - Cool-down & Static Stretching (3-5 mins)
4. Nutrition Safety: Recommend balanced macro distributions and adequate hydration. Discourage extreme crash dieting.
5. Domain Restriction: Refuse any non-fitness, non-health questions politely.

IMPORTANT WORKOUT PLAN RULE:
- If the user asks for a workout plan but DOES NOT specify what body part or goal they are training for, ASK them first for clarification.
- When generating a workout plan, output a comma-separated list of exercises wrapped EXACTLY in these tags: <PLAN>Exercise 1, Exercise 2, Exercise 3</PLAN>

Format all responses beautifully with Markdown. Keep responses clear, encouraging, and scientifically sound.`;

    if (userContext && Object.keys(userContext).length > 0) {
      systemPrompt += `\n\nUSER MEDICAL & FITNESS PROFILE:\n- Goal: ${userContext.primaryGoal || 'General Fitness'}\n- Fitness Level: ${userContext.fitnessLevel || 'Beginner'}\n- Gender: ${userContext.gender || 'Unspecified'}\nTailor safety, load, and progression specifically to this user!`;
    }

    // Format chat history for Ollama
    const formattedHistory = (history || []).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    let aiResponseText = '';

    // 5. CALL LOCAL OLLAMA AI MODEL
    try {
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen2.5:0.5b',
          messages: [
            { role: 'system', content: systemPrompt },
            ...formattedHistory,
            { role: 'user', content: rawMessage }
          ],
          stream: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        aiResponseText = data.message?.content;
      }
    } catch (ollamaErr) {
      console.warn('Local Ollama unready, using fallback response engine.');
    }

    // Fallback engine if local Ollama model is starting or unready
    if (!aiResponseText) {
      aiResponseText = generateFallbackResponse(rawMessage, userContext);
    }

    // 6. SAVE NEW Q&A PAIR TO MONGODB CACHE FOR FUTURE USERS
    if (aiResponseText && normalized && !isGreeting(rawMessage)) {
      try {
        await AICache.create({
          normalizedQuery: normalized,
          originalQuery: rawMessage,
          response: aiResponseText,
          category: categorizeQuery(rawMessage)
        });
        console.log(`[AI Cache Saved] Stored new Q&A pair in DB for query: "${normalized}"`);
      } catch (saveErr) {
        console.warn('[AI Cache Save Warning]:', saveErr.message);
      }
    }

    return res.status(200).json({
      role: 'assistant',
      content: aiResponseText
    });

  } catch (error) {
    console.error('AI Controller Error:', error);
    res.status(500).json({
      error: 'Failed to process AI request',
      message: error.message
    });
  }
};

// Categorize queries for organization
const categorizeQuery = (query) => {
  const q = query.toLowerCase();
  if (q.includes('diet') || q.includes('protein') || q.includes('food') || q.includes('calorie')) return 'nutrition';
  if (q.includes('pain') || q.includes('injury') || q.includes('knee') || q.includes('back')) return 'sports_medicine';
  if (q.includes('run') || q.includes('cardio') || q.includes('stamina')) return 'cardio';
  return 'workout';
};

// Structured evidence-based medical trainer fallback engine when LLM local process is offline
const generateFallbackResponse = (query, context) => {
  const q = query.toLowerCase();

  if (isGreeting(query)) {
    return GET_GREETING_RESPONSE(context?.name || '');
  }
  
  if (q.includes('training') || q.includes('workout') || q.includes('today')) {
    return `💪 **GymSync Daily Medical & Sports Training Plan**

### 1. Dynamic Warm-up (4 Mins)
- Arm Circles & Shoulder Dislocates: 60 sec
- Bodyweight Squats (Focus on hip mobility): 10 reps
- Jumping Jacks: 60 sec

### 2. Core Resistance Training
- **Push-ups**: 3 sets of 10-15 reps *(Maintain neutral spine, elbows at 45° angle)*
- **Bodyweight Squats**: 3 sets of 15 reps *(Keep knees inline with toes, chest upright)*
- **Plank**: 3 sets of 45 seconds *(Engage core, do not let lower back sag)*

<PLAN>Push-ups, Squats, Plank, Jumping Jacks</PLAN>

### 3. Cool-Down & Recovery (3 Mins)
- Standing Quad Stretch & Hamstring Hold: 30 sec each side
- Child's Pose & Deep Diaphragmatic Breathing

> ⚠️ *Medical Safety Note: Maintain hydration and stop immediately if you experience sharp joint pain.*`;
  }

  if (q.includes('diet') || q.includes('protein') || q.includes('nutrition')) {
    return `🥗 **Sports Nutrition & Medical Guidance**

For optimal muscle recovery and energy:
- **Protein Intake**: Aim for 1.6 to 2.2g of protein per kg of body weight daily (Lean chicken, fish, eggs, tofu, whey).
- **Complex Carbohydrates**: Oats, brown rice, and sweet potatoes for sustained glycogen replenish.
- **Hydration**: Minimum 3 Liters of water daily + electrolytes during high-intensity training.

> 🩺 *Consult a healthcare professional before making drastic dietary changes.*`;
  }

  return `🏋️ **GymSync AI Medical Fitness Coach**

Welcome! I am ready to build your custom training plan. 

To provide the safest and most effective exercise prescription:
1. What target muscle group or fitness goal are you focusing on (e.g., Chest, Legs, Cardio, Fat Loss)?
2. Do you have any current joint pain or past injuries I should know about?

Tell me your goal and I will construct your science-backed workout plan!`;
};
