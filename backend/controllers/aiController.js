import express from 'express';
import AICache from '../models/AICache.js';
import SavedAIPlan from '../models/SavedAIPlan.js';
import coachConversationEngine from '../services/ai/coachConversationEngine.js';

// Helper to normalize user queries
const normalizeQuery = (query) => {
  if (!query) return '';
  return query
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const GREETINGS = [
  'hi', 'hello', 'hey', 'hi there', 'hello there', 'hey coach', 'hi coach',
  'good morning', 'good evening', 'good afternoon', 'greetings', 'sup', 'yo',
  'how are you', 'how are you doing', 'how do you do', 'how is it going', 'whats up', 'what is up'
];

const isGreeting = (query) => {
  const normalized = normalizeQuery(query);
  return GREETINGS.some(g => normalized === g || normalized === `${g} ai` || normalized === `${g} bot`);
};

export const executeCoachPipeline = async ({
  message,
  userContext = {},
  history = [],
  currentPlan = null,
  currentWorkout = null,
  recentWorkoutHistory = [],
  currentProgress = {},
  preferences = {}
}) => {
  const rawMessage = (message || '').trim();
  if (!rawMessage) {
    throw new Error('Message is required');
  }

  // 1. RUN CONVERSATIONAL MEMORY & DECISION ENGINE (Acts as Sports Science Calculation & Safety Tool)
  const decisionResult = coachConversationEngine.processTurn({
    message: rawMessage,
    userContext,
    history,
    currentPlan,
    currentWorkout,
    recentWorkoutHistory,
    currentProgress,
    preferences
  });

  // 2. OLLAMA AS BOSS (Local LLM is primary conversational coach orchestrator)
  const enableOllama = process.env.ENABLE_OLLAMA === 'true' || Boolean(process.env.OLLAMA_HOST);
  const ollamaUrl = process.env.OLLAMA_HOST || 'http://localhost:11434/api/chat';
  const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5:0.5b';

  if (enableOllama) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const userName = userContext?.name || userContext?.userName || 'Athlete';
      const primaryGoal = userContext?.primaryGoal || 'General Fitness';
      const fitnessLevel = userContext?.fitnessLevel || 'Beginner';
      const equipment = userContext?.equipmentAccess || 'Full Gym';
      const weight = userContext?.weight || userContext?.weightKg || 'Not specified';
      const safetyFlags = decisionResult.structuredAction?.safetyFlags || [];

      // Enrich workout with dynamic ACSM calorie burn calculation if generated
      if (decisionResult.structuredAction?.workout) {
        const wo = decisionResult.structuredAction.workout;
        const totalDuration = wo.timeBudget || 45;
        let estimatedTotalBurn = 0;
        const main = wo.mainWorkout || [];
        const perExMinutes = main.length > 0 ? Math.max(5, Math.round(totalDuration / main.length)) : 10;
        main.forEach(ex => {
          const burn = exerciseRegistry.estimateExerciseCalories(ex.name, perExMinutes, weight);
          ex.estimatedCalories = burn;
          estimatedTotalBurn += burn;
        });
        wo.estimatedTotalCalories = estimatedTotalBurn;
      }

      const systemPrompt = `You are the GymSync AI Lead Coach — an elite, knowledgeable, and empathetic personal fitness trainer.
USER PROFILE:
- Athlete Name: ${userName}
- Primary Goal: ${primaryGoal}
- Fitness Level: ${fitnessLevel}
- Equipment: ${equipment}
- Weight: ${weight} kg
${safetyFlags.length > 0 ? `- SAFETY ALERT: ${safetyFlags.join(', ')}` : ''}

COACHING DIRECTIVES & FORMAT:
1. BREVITY & ACTION-ORIENTATION (CRITICAL): Keep responses concise (1 to 3 short paragraphs or sentences max). NEVER output long essay-like walls of text.
2. If asking clarification: Ask ONLY ONE single targeted question at a time.
3. If a workout or diet is generated: Give a 1-2 sentence encouraging summary — the interactive card below will display the exercise details.
4. Natural Persona: Act like a genuine human personal coach. Be encouraging, concise, and practical.
5. Language Matching: Seamlessly match the user's language. If they speak in Roman Urdu/Hindi (e.g. "hi coach", "kal training hai", "stamina chahiye", "mera weight 100 kg hai"), reply in fluent, natural Roman Urdu/Hindi. If they speak in English, reply in English.
6. Greetings: If the user simply greets you ("hi", "hello", "salam"), greet them warmly and personally, ask how they feel today and what they want to work on.

${decisionResult.structuredAction?.workout ? `[ENGINE WORKOUT GENERATED]: Focus: "${decisionResult.structuredAction.workout.sessionObjective}", Duration: ${decisionResult.structuredAction.workout.timeBudget || 45} mins. Exercises: ${(decisionResult.structuredAction.workout.mainWorkout || []).map(e => e.name).join(', ')}.` : ''}
${decisionResult.structuredAction?.diet ? `[ENGINE DIET GENERATED]: Calories: ${decisionResult.structuredAction.diet.targetCalories} kcal, Protein: ${decisionResult.structuredAction.diet.macronutrients?.proteinGrams}g, Carbs: ${decisionResult.structuredAction.diet.macronutrients?.carbsGrams}g, Fats: ${decisionResult.structuredAction.diet.macronutrients?.fatsGrams}g.` : ''}
${decisionResult.structuredAction?.explanation ? `[ENGINE RATIONALE]: ${decisionResult.structuredAction.explanation}` : ''}`;

      const ollamaMessages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-6).map(m => ({
          role: (m.role === 'user' || m.sender === 'user') ? 'user' : 'assistant',
          content: m.content || m.text || ''
        })).filter(m => m.content && m.content.trim()),
        { role: 'user', content: rawMessage }
      ];

      const ollamaRes = await fetch(ollamaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: ollamaModel,
          messages: ollamaMessages,
          stream: false
        })
      });
      clearTimeout(timeoutId);

      if (ollamaRes.ok) {
        const data = await ollamaRes.json();
        const reply = data.message?.content?.trim();
        if (reply && reply.length > 5) {
          return {
            role: 'assistant',
            content: reply,
            structuredAction: decisionResult.structuredAction
          };
        }
      }
    } catch (ollamaErr) {
      console.warn('Ollama unavailable or timed out, falling back to deterministic engine:', ollamaErr.message);
    }
  }

  // 3. DETERMINISTIC ENGINE FALLBACK (Used when Ollama is disabled or offline)
  if (isGreeting(rawMessage)) {
    const userName = userContext?.name || userContext?.userName || '';
    const greeting = `Hello${userName ? ` ${userName}` : ''}! 👋 I am your **GymSync AI Lead Coach & Sports Medicine Specialist**.

I have your complete biological profile loaded. I can assist you with:
- 🏋️ **Goal-driven, sport-specific workout plans** (Cricket, Football, Running, Hypertrophy, Fat Loss)
- 🩺 **Zero-tolerance joint & medical safety screening**
- 🥗 **Deterministic, mathematically verified macro & diet plans**
- ⚡ **Dynamic session adjustments** ("I have 20 mins", "Only dumbbells", "Knee discomfort", "Match tomorrow")

How are you feeling today, and what would you like to focus on?`;

    return {
      role: 'assistant',
      content: greeting,
      structuredAction: { intent: 'greeting', workout: null, diet: null, safetyFlags: [], explanation: 'Initial coach greeting.' }
    };
  }

  return {
    role: 'assistant',
    content: decisionResult.content,
    structuredAction: decisionResult.structuredAction
  };
};

export const getSavedPlans = async (req, res) => {
  try {
    const userName = req.user?.name || req.query.userName;
    if (!userName) {
      return res.status(400).json({ error: 'User identification required' });
    }
    const plans = await SavedAIPlan.find({ userName }).sort({ createdAt: -1 });
    return res.status(200).json(plans);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch saved plans', message: error.message });
  }
};

export const saveAIPlan = async (req, res) => {
  try {
    const userName = req.user?.name || req.body.userName;
    const { title, goal, fitnessLevel, workout, diet, calendar, notes } = req.body;
    if (!userName || !title) {
      return res.status(400).json({ error: 'userName and title are required' });
    }

    const newPlan = await SavedAIPlan.create({
      userName,
      userId: req.user?._id,
      title: title.trim(),
      goal: goal || 'General Fitness',
      fitnessLevel: fitnessLevel || 'Beginner',
      workout: workout || null,
      diet: diet || null,
      calendar: Array.isArray(calendar) ? calendar : [],
      notes: notes || '',
      isActive: true
    });

    return res.status(201).json(newPlan);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save plan', message: error.message });
  }
};

export const deleteSavedPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await SavedAIPlan.findByIdAndDelete(id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    return res.status(200).json({ message: 'Plan deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete plan', message: error.message });
  }
};

export const handleChat = async (req, res) => {
  try {
    const result = await executeCoachPipeline(req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    console.error('AI Controller Error:', error);
    return res.status(error.message === 'Message is required' ? 400 : 500).json({
      error: 'Failed to process AI request',
      message: error.message
    });
  }
};

export default {
  handleChat,
  executeCoachPipeline,
  getSavedPlans,
  saveAIPlan,
  deleteSavedPlan
};
