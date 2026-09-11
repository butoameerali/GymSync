import exerciseRegistry from '../workout/exerciseRegistry.js';

const STATIC_COMMANDS = {
  '/todays-workout': async (ctx) => ({
    role: 'assistant',
    content: "Loading today's workout mission.",
    structuredAction: { type: 'navigate', payload: { route: '/ai-trainer' } },
    sourceAttribution: { sourceType: 'system' }
  }),
  '/progress': async (ctx) => ({
    role: 'assistant',
    content: "Here is your progress overview.",
    structuredAction: { type: 'navigate', payload: { route: '/dashboard' } },
    sourceAttribution: { sourceType: 'system' }
  }),
  '/diet': async (ctx) => ({
    role: 'assistant',
    content: "Taking you to your Diet Plan.",
    structuredAction: { type: 'navigate', payload: { route: '/ai-trainer', query: { tab: 'diets' } } },
    sourceAttribution: { sourceType: 'system' }
  }),
  '/adjust': async (ctx) => ({
    role: 'assistant',
    content: "Let's adjust your current plan. What would you like to change?",
    sourceAttribution: { sourceType: 'system' }
  }),
  '/swap': async (ctx) => ({
    role: 'assistant',
    content: "Tell me which exercise or meal you want to swap.",
    sourceAttribution: { sourceType: 'system' }
  }),
  '/report': async (ctx) => ({
    role: 'assistant',
    content: "Navigating to issue reporting.",
    structuredAction: { type: 'navigate', payload: { route: '/ai-trainer/report-issue' } },
    sourceAttribution: { sourceType: 'system' }
  })
};

export async function routeSlashCommand(rawMessage, ctx) {
  const command = rawMessage.trim().toLowerCase();
  
  if (STATIC_COMMANDS[command]) {
    return STATIC_COMMANDS[command](ctx);
  }

  // Dynamic exercise shortcut, e.g. "/pushup"
  const specificExercise = command.slice(1).trim();
  if (specificExercise.length > 2) {
    return {
      role: 'assistant',
      content: `Setting up tracking for ${specificExercise}...`,
      structuredAction: {
        type: 'start_exercise',
        payload: {
          exerciseName: specificExercise,
          durationLimitMs: 600000,
          forceCamera: true
        }
      },
      sourceAttribution: { sourceType: 'system' }
    };
  }

  return null;
}
