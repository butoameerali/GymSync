import express from 'express';
import AICache from '../models/AICache.js';
import SavedAIPlan from '../models/SavedAIPlan.js';
import coachConversationEngine from '../services/ai/coachConversationEngine.js';
import fitnessContentService from '../services/fitnessContentService.js';
import exerciseRegistry from '../services/workout/exerciseRegistry.js';

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

  const userName = userContext?.name || userContext?.userName || 'Athlete';
  const primaryGoal = userContext?.primaryGoal || 'General Fitness';
  const fitnessLevel = userContext?.fitnessLevel || 'Beginner';
  const equipment = userContext?.equipmentAccess || 'Full Gym';
  const weight = userContext?.weight || userContext?.weightKg || 'Not specified';

  const startTime = Date.now();
  let retrievalTimeMs = 0;
  let decisionTimeMs = 0;
  let qwenTimeMs = 0;

  // 1. RETRIEVE AUTHORITATIVE INSTRUCTOR CONTENT FROM KNOWLEDGE LAYER (Parallel Retrieval)
  let relevantPrograms = [];
  let relevantDiets = [];
  let relevantArticles = [];
  let relevantExercises = [];

  try {
    const retrievalStart = Date.now();
    const [progs, diets, articles, exercises] = await Promise.all([
      fitnessContentService.findRelevantPrograms({ query: rawMessage, goal: primaryGoal, equipment, limit: 2 }),
      fitnessContentService.findRelevantDietTemplates({ query: rawMessage, goal: primaryGoal, limit: 2 }),
      fitnessContentService.findRelevantArticles({ query: rawMessage, limit: 2 }),
      fitnessContentService.findRelevantExercises({ query: rawMessage, limit: 4 }),
      exerciseRegistry.syncDatabaseExercises().catch(e => console.warn('AI registry sync warning:', e.message))
    ]);
    relevantPrograms = progs;
    relevantDiets = diets;
    relevantArticles = articles;
    relevantExercises = exercises;
    retrievalTimeMs = Date.now() - retrievalStart;
  } catch (err) {
    console.warn('fitnessContentService query error:', err.message);
  }

  // 2. RUN CONVERSATIONAL MEMORY & DECISION ENGINE (Acts as Sports Science Calculation & Safety Tool)
  const decisionStart = Date.now();
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
  decisionTimeMs = Date.now() - decisionStart;

  const structuredAction = decisionResult.structuredAction || {};
  structuredAction.safetyFlags = structuredAction.safetyFlags || [];


  const isInjuryOrMedical = /sharp pain|hurt bad|injured|injury|popped|torn|severe pain|dislocated|swelling|doctor|sprain|cannot bend/i.test(rawMessage);
  if (isInjuryOrMedical) {
    structuredAction.safetyFlags.push('MEDICAL_DISCLAIMER: User indicated acute pain or injury. Advise stopping exercise immediately and seeking qualified medical attention.');
  }

  const isDietIntent = structuredAction.intent === 'diet' || /diet|meal|food|calorie|protein|nutrition/i.test(rawMessage);
  const isWorkoutIntent = structuredAction.intent === 'workout' || /workout|routine|exercise|training|split|plan|session|primer|match|cricket|football|gym/i.test(rawMessage) || (!isDietIntent && relevantPrograms.length > 0);
  const isTechniqueIntent = /form|pain|hurt|technique|rounding|cue|how to|guide|mistake/i.test(rawMessage) || relevantArticles.length > 0;

  // 3. DETERMINE SOURCE ATTRIBUTION (Strictly separate instructor content from AI-generated)
  let sourceAttribution = null;

  if (isTechniqueIntent && relevantArticles.length > 0) {
    sourceAttribution = {
      sourceType: 'instructor_article',
      sourceId: relevantArticles[0].sourceId,
      sourceTitle: relevantArticles[0].sourceTitle,
      instructor: relevantArticles[0].instructor,
      readTime: relevantArticles[0].readTime,
      category: relevantArticles[0].category
    };
  } else if (isWorkoutIntent && relevantPrograms.length > 0) {
    sourceAttribution = {
      sourceType: 'instructor_program',
      sourceId: relevantPrograms[0].sourceId,
      sourceTitle: relevantPrograms[0].sourceTitle,
      instructor: relevantPrograms[0].instructor,
      goal: relevantPrograms[0].goal,
      difficulty: relevantPrograms[0].difficulty
    };
    // Intelligently select the best matching training session across the program
    let selectedDay = null;
    let selectedWeekNum = 1;
    const lowerQuery = (rawMessage || '').toLowerCase();
    const programWeeks = relevantPrograms[0].weeks || [];


    // Check all weeks and days for focus or exercise keyword matches (e.g. cricket match, agility, leg day, upper push)
    for (const wk of programWeeks) {
      for (const d of (wk.days || [])) {
        if (!d.exercises || d.exercises.length === 0) continue;
        const focusText = (d.focus || '').toLowerCase();
        if (
          (lowerQuery.includes('leg') && (focusText.includes('leg') || focusText.includes('lower'))) ||
          (lowerQuery.includes('chest') && (focusText.includes('chest') || focusText.includes('push'))) ||
          (lowerQuery.includes('push') && focusText.includes('push')) ||
          (lowerQuery.includes('pull') && (focusText.includes('pull') || focusText.includes('back'))) ||
          (lowerQuery.includes('arm') && (focusText.includes('arm') || focusText.includes('upper'))) ||
          (lowerQuery.includes('core') && (focusText.includes('core') || focusText.includes('ab'))) ||
          ((lowerQuery.includes('cricket') || lowerQuery.includes('match') || lowerQuery.includes('game') || lowerQuery.includes('agility') || lowerQuery.includes('stamina')) && 
            (focusText.includes('agility') || focusText.includes('power') || focusText.includes('primer') || focusText.includes('conditioning') || focusText.includes('full'))) ||
          ((lowerQuery.includes('recovery') || lowerQuery.includes('mobility') || lowerQuery.includes('sore')) && (focusText.includes('recovery') || focusText.includes('mobility')))
        ) {
          selectedDay = d;
          selectedWeekNum = wk.weekNumber || 1;
          break;
        }
      }
      if (selectedDay) break;
    }

    // Default to the first active non-rest training day if no specific keyword matched
    if (!selectedDay) {
      for (const wk of programWeeks) {
        const found = (wk.days || []).find(d => !d.restDay && d.exercises && d.exercises.length > 0);
        if (found) {
          selectedDay = found;
          selectedWeekNum = wk.weekNumber || 1;
          break;
        }
      }
    }

    if (selectedDay && !structuredAction.workout) {
      structuredAction.workout = {
        sessionObjective: `${relevantPrograms[0].sourceTitle}: Wk ${selectedWeekNum} ${selectedDay.focus || 'Target Routine'}`,
        timeBudget: 45,
        targetMuscles: [relevantPrograms[0].goal],
        mainWorkout: selectedDay.exercises.map(ex => ({
          name: ex.name,
          sets: ex.sets || 3,
          reps: ex.reps || '10',
          restSeconds: ex.restSeconds || 60,
          targetMuscles: [relevantPrograms[0].goal],
          equipment: ex.intensity || 'Gym Equipment',
          rpe: ex.rpe || 7,
          notes: ex.coachingNotes || ex.notes || ''
        }))
      };
    }
  } else if (isDietIntent && relevantDiets.length > 0) {
    sourceAttribution = {
      sourceType: 'instructor_diet',
      sourceId: relevantDiets[0].sourceId,
      sourceTitle: relevantDiets[0].sourceTitle,
      instructor: relevantDiets[0].instructor,
      calories: relevantDiets[0].calories,
      protein: relevantDiets[0].protein
    };
  } else if (relevantExercises.length > 0) {
    sourceAttribution = {
      sourceType: 'instructor_exercise',
      sourceId: relevantExercises[0].sourceId,
      sourceTitle: relevantExercises[0].sourceTitle,
      category: relevantExercises[0].category
    };
  } else {
    sourceAttribution = {
      sourceType: 'ai_generated',
      sourceTitle: 'GymSync AI Sports Science Engine',
      instructor: 'Autonomous AI'
    };
  }

  structuredAction.sourceAttribution = sourceAttribution;

  // 4. OLLAMA AS BOSS (Local LLM is primary conversational coach orchestrator)
  const enableOllama = process.env.ENABLE_OLLAMA === 'true' || Boolean(process.env.OLLAMA_HOST);
  const ollamaUrl = process.env.OLLAMA_HOST || 'http://localhost:11434/api/chat';
  const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5:0.5b';

  if (enableOllama) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      const safetyFlags = structuredAction.safetyFlags || [];

      // Enrich workout with dynamic calorie burn calculation if generated
      if (structuredAction.workout) {
        const wo = structuredAction.workout;
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

      // Build rich, structured knowledge context for Qwen
      let knowledgeContext = '';
      if (sourceAttribution.sourceType === 'instructor_program') {
        const p = relevantPrograms[0];
        const outlineSummary = (p.weeks || []).slice(0, 2).map(w => 
          `  * Week ${w.weekNumber}: ${(w.days || []).map(d => `Day ${d.dayNumber} (${d.focus || 'Training'}) [${(d.exercises || []).map(e => e.name).slice(0, 3).join(', ')}]`).join('; ')}`
        ).join('\n');

        knowledgeContext += `\n[INSTRUCTOR-AUTHORED PROGRAM AVAILABLE]:
Program: "${p.sourceTitle}" by Coach ${p.instructor}
Goal: ${p.goal} | Difficulty: ${p.difficulty} | Total Weeks: ${p.durationWeeks || 4}
Description: ${p.description}
Program Schedule Breakdown:
${outlineSummary}
Selected Recommended Session: ${structuredAction.workout?.sessionObjective || p.sourceTitle}
Directive: Acknowledge Coach ${p.instructor}'s program. Explain briefly why this specific session fits the athlete's current goal or match context.`;
      } else if (sourceAttribution.sourceType === 'instructor_article') {
        const a = relevantArticles[0];
        knowledgeContext += `\n[INSTRUCTOR-AUTHORED GUIDE AVAILABLE]: "${a.sourceTitle}" by Coach ${a.instructor}. Core Insights: "${a.contentSnippet || a.content?.substring(0, 350)}". Directive: Provide concise coaching advice citing this instructor guide.`;
      } else if (sourceAttribution.sourceType === 'instructor_diet') {
        const d = relevantDiets[0];
        const mealsSummary = (d.meals || []).map(m => `${m.mealName} (${m.timing || 'Daily'}): ${(m.foodItems || []).map(f => `${f.quantity}${f.unit} ${f.name}`).join(', ')}`).join(' | ');
        knowledgeContext += `\n[INSTRUCTOR-AUTHORED DIET TEMPLATE AVAILABLE]: "${d.sourceTitle}" by Coach ${d.instructor}. Daily Calories: ${d.calories || 2000} kcal, Protein: ${d.protein || 130}g. Meals: ${mealsSummary}. Directive: Recommend this instructor nutrition plan adapted to the user.`;
      }

      const systemPrompt = `You are the GymSync AI Lead Coach — an elite, knowledgeable, and empathetic personal fitness trainer.
USER PROFILE:
- Athlete Name: ${userName}
- Primary Goal: ${primaryGoal}
- Fitness Level: ${fitnessLevel}
- Equipment: ${equipment}
- Weight: ${weight} kg
${safetyFlags.length > 0 ? `- SAFETY ALERT: ${safetyFlags.join(', ')}` : ''}
${knowledgeContext}

COACHING DIRECTIVES & FORMAT:
1. BREVITY & ACTION-ORIENTATION (CRITICAL): Keep responses concise (1 to 2 short paragraphs or sentences max). NEVER output long essay-like walls of text.
2. If asking clarification: Ask ONLY ONE single targeted question at a time.
3. If an instructor program, diet, or guide was found: Acknowledge Coach [Name]'s program or guide naturally and explain why this session matches their needs.
4. Natural Persona: Act like a genuine human personal coach. Be encouraging, concise, and practical.
5. Language Matching: Seamlessly match the user's language. If they speak in Roman Urdu/Hindi (e.g. "hi coach", "kal cricket match hai", "stamina chahiye"), reply in fluent, natural Roman Urdu/Hindi. If they speak in English, reply in English.
6. Greetings: If the user simply greets you ("hi", "hello", "salam"), greet them warmly and personally, ask how they feel today and what they want to work on.`;

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
            structuredAction,
            meta: {
              retrievalTimeMs,
              decisionTimeMs,
              qwenTimeMs: Date.now() - startTime - retrievalTimeMs - decisionTimeMs,
              totalTimeMs: Date.now() - startTime
            }
          };
        }
      }
    } catch (ollamaErr) {
      console.warn('Ollama unavailable or timed out, falling back to deterministic engine:', ollamaErr.message);
    }
  }

  const performanceMeta = {
    retrievalTimeMs,
    decisionTimeMs,
    qwenTimeMs: 0,
    totalTimeMs: Date.now() - startTime
  };

  // 5. DETERMINISTIC ENGINE FALLBACK (Used when Ollama is disabled or offline)
  if (isGreeting(rawMessage)) {
    const greeting = `Hello${userName ? ` ${userName}` : ''}! 👋 I am your **GymSync AI Lead Coach**.

Your profile is active. I can assist you with:
- 🏋️ **Goal-driven workout programs** (Hypertrophy, Strength, Cricket, Running)
- 🥗 **Verified nutrition templates** tailored to your macros
- 📖 **Expert technique guides** from certified Fitness Instructors

How are you feeling today, and what would you like to work on?`;

    return {
      role: 'assistant',
      content: greeting,
      structuredAction: { intent: 'greeting', workout: null, diet: null, safetyFlags: [], sourceAttribution },
      meta: performanceMeta
    };
  }

  // Medical safety alert takes precedence over workout/program recommendations
  if (isInjuryOrMedical) {
    return {
      role: 'assistant',
      content: `⚠️ **Medical Safety Alert**: I am an AI coach, not a doctor. If you are experiencing acute pain, swelling, or potential injury, stop the exercise immediately. Do not load the affected area. Rest, elevate, and please consult a physician or sports physiotherapist before resuming training.`,
      structuredAction,
      meta: performanceMeta
    };
  }

  // If a relevant article was found in fallback mode, synthesize a concise coaching answer
  if (sourceAttribution.sourceType === 'instructor_article') {
    const a = relevantArticles[0];
    return {
      role: 'assistant',
      content: `💡 **Expert Form Insight** (from "${a.sourceTitle}" by ${a.instructor}):\n\n${a.contentSnippet || a.content}\n\n*Review the full guide below for complete biomechanics.*`,
      structuredAction,
      meta: performanceMeta
    };
  }

  // If a relevant program was found in fallback mode
  if (sourceAttribution.sourceType === 'instructor_program') {
    const p = relevantPrograms[0];
    return {
      role: 'assistant',
      content: `🏋️ **Verified Instructor Program**: I recommend **"${p.sourceTitle}"** authored by ${p.instructor} (${p.difficulty} • ${p.durationWeeks} weeks • ${p.daysPerWeek} days/week).\n\n${p.description}\n\nYou can apply this routine directly to your calendar below!`,
      structuredAction,
      meta: performanceMeta
    };
  }

  return {
    role: 'assistant',
    content: decisionResult.content,
    structuredAction,
    meta: performanceMeta
  };
};


export const getSavedPlans = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const plans = await SavedAIPlan.find({
      $or: [
        { userId: req.user._id },
        { userName: req.user.name }
      ]
    }).sort({ createdAt: -1 });
    return res.status(200).json(plans);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch saved plans', message: error.message });
  }
};

export const saveAIPlan = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { title, goal, fitnessLevel, workout, diet, calendar, notes } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Plan title is required' });
    }

    const newPlan = await SavedAIPlan.create({
      userName: req.user.name,
      userId: req.user._id,
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
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { id } = req.params;
    const plan = await SavedAIPlan.findById(id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const isOwner = (plan.userId && String(plan.userId) === String(req.user._id)) ||
                    (plan.userName && plan.userName === req.user.name);
    const isStaff = ['Admin', 'SuperAdmin'].includes(req.user.role);

    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to delete this plan' });
    }

    await SavedAIPlan.findByIdAndDelete(id);
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
