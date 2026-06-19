import express from 'express';

export const handleChat = async (req, res) => {
  try {
    const { message, userContext } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build the system prompt using the user's exact physical context
    let systemPrompt = `You are the GymSync AI Coach, a highly professional, motivating, and expert personal trainer and nutritionist. 
Your goal is to provide concise, scientifically accurate, and highly structured diet plans and workout schedules.
Format your responses beautifully using Markdown (use bolding, bullet points, and tables where appropriate).
Never break character. Keep your answers focused entirely on fitness, health, and diet.`;

    if (userContext && Object.keys(userContext).length > 0) {
      systemPrompt += `\n\nCRITICAL USER PROFILE:\n- Primary Goal: ${userContext.primaryGoal || 'General Fitness'}\n- Gender: ${userContext.gender || 'Not specified'}\n- Fitness Level: ${userContext.fitnessLevel || 'Beginner'}\n\nTailor all your advice specifically to this user's profile!`;
    }

    // Call the local Ollama API
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'phi4-mini', // Switched to phi4-mini as requested
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        stream: false
      })
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
      content: "⚠️ **Connection Error:** I couldn't connect to your local Ollama instance.\n\nPlease make sure:\n1. Ollama is currently running on your computer.\n2. You have downloaded the model (e.g., open a terminal and run `ollama run phi4-mini`)."
    });
  }
};
