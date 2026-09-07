import express from 'express';
import AICache from '../models/AICache.js';
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

export const handleChat = async (req, res) => {
  try {
    const {
      message,
      userContext = {},
      history = [],
      currentPlan = null,
      currentWorkout = null,
      recentWorkoutHistory = [],
      currentProgress = {},
      preferences = {}
    } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const rawMessage = message.trim();

    // 1. GREETING HANDLER
    if (isGreeting(rawMessage)) {
      const userName = userContext?.name || userContext?.userName || '';
      const greeting = `Hello${userName ? ` ${userName}` : ''}! 👋 I am your **GymSync AI Lead Coach & Sports Medicine Specialist**.

I have your complete biological profile loaded. I can assist you with:
- 🏋️ **Goal-driven, sport-specific workout plans** (Cricket, Football, Running, Hypertrophy, Fat Loss)
- 🩺 **Zero-tolerance joint & medical safety screening**
- 🥗 **Deterministic, mathematically verified macro & diet plans**
- ⚡ **Dynamic session adjustments** ("I have 20 mins", "Only dumbbells", "Knee discomfort", "Match tomorrow")

How are you feeling today, and what would you like to focus on?`;

      return res.status(200).json({
        role: 'assistant',
        content: greeting,
        structuredAction: { intent: 'greeting', workout: null, diet: null, safetyFlags: [], explanation: 'Initial coach greeting.' }
      });
    }

    // 2. RUN CONVERSATIONAL MEMORY & DECISION ENGINE
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

    // 3. OPTIONAL LOCAL OLLAMA INTEGRATION (Augments explanation if available, but cannot override safety/math)
    const enableOllama = process.env.ENABLE_OLLAMA === 'true' || Boolean(process.env.OLLAMA_HOST);
    const ollamaUrl = process.env.OLLAMA_HOST || 'http://localhost:11434/api/chat';

    if (enableOllama) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const systemPrompt = `You are the GymSync AI Lead Coach. Explain this decision professionally and encouragingly. Do not invent contradictory numbers or bypass safety rules. Decision: ${decisionResult.structuredAction.explanation}`;

        const ollamaRes = await fetch(ollamaUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            model: process.env.OLLAMA_MODEL || 'qwen2.5:0.5b',
            messages: [
              { role: 'system', content: systemPrompt },
              ...history.slice(-4).map(m => ({ role: m.role || (m.sender === 'user' ? 'user' : 'assistant'), content: m.content || m.text })),
              { role: 'user', content: rawMessage }
            ],
            stream: false
          })
        });
        clearTimeout(timeoutId);

        if (ollamaRes.ok) {
          const data = await ollamaRes.json();
          if (data.message?.content && data.message.content.length > 50) {
            // Prepend Ollama conversational coaching advice while maintaining deterministic sections
            decisionResult.content = `${data.message.content}\n\n---\n${decisionResult.content}`;
          }
        }
      } catch (ollamaErr) {
        // Fallback to deterministic coach engine silently
      }
    }

    return res.status(200).json({
      role: 'assistant',
      content: decisionResult.content,
      structuredAction: decisionResult.structuredAction
    });

  } catch (error) {
    console.error('AI Controller Error:', error);
    res.status(500).json({
      error: 'Failed to process AI request',
      message: error.message
    });
  }
};

export default { handleChat };
