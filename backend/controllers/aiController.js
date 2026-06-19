import express from 'express';

export const handleChat = async (req, res) => {
  try {
    const { message, userContext, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build the system prompt using the user's exact physical context
    let systemPrompt = `You are the GymSync AI Coach, a highly professional, motivating, and expert personal trainer and nutritionist. 
Your goal is to provide concise, scientifically accurate, and highly structured diet plans and workout schedules.
Format your responses beautifully using Markdown.
Never break character. Keep your answers focused entirely on fitness, health, and diet.

IMPORTANT WORKOUT PLAN RULE:
1. If the user asks for a workout plan but DOES NOT specify what they are training for, DO NOT generate a plan yet. Instead, ASK them: "Are we building a plan based on your profile bio, or are you training for a specific event like an Army physical test or a race?"
2. ONLY when the user specifies their goal, you MUST include a machine-readable workout plan in your response. 
3. You must output a comma-separated list of exercises wrapped EXACTLY in these tags: <PLAN>Exercise 1, Exercise 2, Exercise 3</PLAN>
For example:
"Here is your plan for the Army test:
<PLAN>Push-ups, Squats, Jumping Jacks, Plank</PLAN>
Good luck!"`;

    if (userContext && Object.keys(userContext).length > 0) {
      systemPrompt += `\n\nCRITICAL USER PROFILE:\n- Primary Goal: ${userContext.primaryGoal || 'General Fitness'}\n- Gender: ${userContext.gender || 'Not specified'}\n- Fitness Level: ${userContext.fitnessLevel || 'Beginner'}\n\nTailor all your advice specifically to this user's profile!`;
    }

    // Format chat history for Ollama
    const formattedHistory = (history || []).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    // Call the local Ollama API
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen2.5:0.5b', // Switched to ultra-tiny model for low RAM systems
        messages: [
          { role: 'system', content: systemPrompt },
          ...formattedHistory,
          { role: 'user', content: message }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();

    res.status(200).json({
      role: 'assistant',
      content: data.message.content
    });

  } catch (error) {
    console.error('Ollama Chat Error:', error);
    // Fallback if Ollama isn't running or the model isn't installed
    res.status(500).json({ 
      error: 'Failed to connect to local AI.',
      fallback: true,
      content: "⚠️ **Connection Error:** I couldn't connect to your local Ollama instance.\n\nPlease make sure:\n1. Ollama is currently running on your computer.\n2. You have downloaded the model (e.g., open a terminal and run `ollama run qwen2.5:0.5b`)."
    });
  }
};
