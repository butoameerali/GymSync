import SavedAIPlan from '../../models/SavedAIPlan.js';
import { applyPlanEdits } from './planEditor.js';

const STATIC_COMMANDS = {
  '/todays-workout': async (ctx) => ({
    role: 'assistant',
    content: "📋 Loading today's workout mission from your active plan!",
    suggestions: ['🚀 Start Mission', '📊 View Progress', '🔄 Change Today\'s Session'],
    structuredAction: { type: 'navigate', payload: { route: '/ai-trainer' } },
    sourceAttribution: { sourceType: 'system' }
  }),
  '/progress': async (ctx) => ({
    role: 'assistant',
    content: "📊 Here is your progress overview — streaks, completed sessions, and goal milestones.",
    suggestions: ['🏆 View Streaks', '📅 Full Calendar', '🎯 Goal Status'],
    structuredAction: { type: 'navigate', payload: { route: '/dashboard' } },
    sourceAttribution: { sourceType: 'system' }
  }),
  '/diet': async (ctx) => ({
    role: 'assistant',
    content: "🥗 Taking you to your Diet Plan. You can view meals, swap food items, and check your macros.",
    suggestions: ['📊 View Macros', '🔄 Swap a Food Item', '🛒 Shopping List'],
    structuredAction: { type: 'navigate', payload: { route: '/ai-trainer', query: { tab: 'diets' } } },
    sourceAttribution: { sourceType: 'system' }
  }),
  '/running': async (ctx) => ({
    role: 'assistant',
    content: "🏃 Opening your GPS Running Tracker! Your route will be plotted live and calories calculated using your weight.",
    suggestions: ['▶️ Start Run', '📊 Past Runs', '🗺️ View Route'],
    structuredAction: { type: 'navigate', payload: { route: '/running' } },
    sourceAttribution: { sourceType: 'system' }
  }),
  '/gym': async (ctx) => ({
    role: 'assistant',
    content: "🏟️ Opening your Gym dashboard — check-in history, trainer details, and membership status.",
    suggestions: ['📋 Check-In History', '👨‍🏫 My Trainer', '💳 Membership Status'],
    structuredAction: { type: 'navigate', payload: { route: '/your-gym' } },
    sourceAttribution: { sourceType: 'system' }
  }),
  '/goal': async (ctx) => ({
    role: 'assistant',
    content: "🎯 Opening your Goal dashboard — active goals, milestones, and progress.",
    suggestions: ['📊 Goal Progress', '🏆 Milestones', '➕ Add New Goal'],
    structuredAction: { type: 'navigate', payload: { route: '/dashboard', query: { tab: 'goals' } } },
    sourceAttribution: { sourceType: 'system' }
  }),
  '/checkin': async (ctx) => ({
    role: 'assistant',
    content: "📝 How are you feeling today? Your check-in helps me adapt tomorrow's workout for optimal recovery.\n\nPlease share:\n- 😴 **Sleep hours** (e.g. 7 hours)\n- ⚡ **Energy level** (1-5)\n- 💪 **Yesterday's RPE** (1-10)\n- 🤕 **Any pain or soreness?**",
    suggestions: ['😴 6-7 hours sleep, energy 4', '😴 5 hours sleep, very tired', '💪 Great sleep, feeling strong', '🤕 Sore legs from yesterday'],
    structuredAction: { type: 'CHECKIN_PROMPT' },
    sourceAttribution: { sourceType: 'system' }
  }),
  '/adjust': async (ctx) => ({
    role: 'assistant',
    content: "🔧 Let's adjust your current plan. What would you like to change?",
    suggestions: ['🔄 Swap an Exercise', '⏱️ Change Duration', '📅 Reschedule a Day', '📊 Adjust Intensity'],
    sourceAttribution: { sourceType: 'system' }
  }),
  '/swap': async (ctx) => ({
    role: 'assistant',
    content: "🔄 Tell me which exercise or food item you want to swap.\n\n**Workout**: e.g. *swap Squat for Leg Press*\n**Diet**: e.g. *swap Chicken for Paneer*",
    suggestions: ['🏋️ Swap Exercise', '🥗 Swap Food Item'],
    sourceAttribution: { sourceType: 'system' }
  }),
  '/report': async (ctx) => ({
    role: 'assistant',
    content: "🚨 What issue do you need to report?\n\n- **Form issue**: Couldn't do the exercise correctly\n- **Pain**: Felt pain during the exercise\n- **Equipment**: Equipment not available\n- **Incorrect completion**: Marked done by mistake",
    suggestions: ['🤕 Pain During Exercise', '📋 Form Issue', '🏋️ Equipment Not Available', '✏️ Incorrect Completion'],
    structuredAction: { type: 'REPORT_PROBLEM' },
    sourceAttribution: { sourceType: 'system' }
  })
};

function normalizeSlug(str) {
  return (str || '')
    .toLowerCase()
    .replace(/lost/g, 'loss') // normalize "weightlost" to "weightloss"
    .replace(/[^a-z0-9]/g, '');
}

export async function routeSlashCommand(rawMessage, ctx = {}) {
  const trimmed = rawMessage.trim();
  const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
  const commandSlug = normalizeSlug(firstWord.slice(1));
  const instructionPart = trimmed.slice(firstWord.length).trim();

  // 1. Check if command matches user's saved plans in DB
  if (ctx.userId && commandSlug.length > 2) {
    try {
      const userPlans = await SavedAIPlan.find({ userId: ctx.userId }).sort({ createdAt: -1 });
      
      const matchedPlan = userPlans.find(plan => {
        const planSlug = normalizeSlug(plan.title);
        const goalSlug = normalizeSlug(plan.goal);
        return (
          planSlug === commandSlug ||
          planSlug.includes(commandSlug) ||
          commandSlug.includes(planSlug) ||
          goalSlug === commandSlug
        );
      });

      if (matchedPlan) {
        const totalDays = matchedPlan.calendar?.length || matchedPlan.workout?.interactive_calendar?.length || 28;

        // If user gave instructions directly (e.g. "/weightlost swap squats for leg press" or "/weightlost 3 sets 12 reps")
        if (instructionPart.length > 0) {
          const editResult = applyPlanEdits(matchedPlan, instructionPart);
          matchedPlan.markModified('calendar');
          matchedPlan.markModified('workout');
          await matchedPlan.save();

          return {
            role: 'assistant',
            content: `✅ **Updated Plan: ${matchedPlan.title}**\n\n${editResult.summary}\n\nYour changes have been saved to the database. Your **Workout Hub** calendar is now updated!`,
            structuredAction: {
              type: 'PLAN_UPDATED',
              planId: matchedPlan._id,
              planTitle: matchedPlan.title,
              plan: matchedPlan
            },
            sourceAttribution: { sourceType: 'ai_plan_update' }
          };
        }

        // If user just typed "/<planname>", link it and offer edit options
        const planSuggestions = ['🔄 Swap an Exercise', '⚡ Change to 3 sets of 12', '🚀 Open in AI Trainer', '🔄 Create Another Plan'];
        return {
          role: 'assistant',
          content: `🎯 **Linked to your plan: ${matchedPlan.title}**\n\nI've pulled up your **${matchedPlan.title}** routine!\n- **Goal**: ${matchedPlan.goal || 'General Fitness'}\n- **Level**: ${matchedPlan.fitnessLevel || 'All Levels'}\n- **Schedule**: ${totalDays} Days\n\nHow would you like to edit this plan?\n• **Swap an exercise**: e.g., \`swap Squat for Leg Press\`\n• **Adjust sets & reps**: e.g., \`change to 3 sets of 12 reps\`\n• **Change frequency**: e.g., \`make it 4 days a week\`\n\nReply with what you'd like to change or choose an option below!`,
          suggestions: planSuggestions,
          structuredAction: {
            type: 'LINK_PLAN',
            planId: matchedPlan._id,
            planTitle: matchedPlan.title,
            plan: matchedPlan,
            suggestions: planSuggestions
          },
          sourceAttribution: { sourceType: 'ai_plan_link' }
        };
      }
    } catch (planLookupErr) {
      console.warn('Slash command plan lookup error:', planLookupErr.message);
    }
  }

  // 2. Static Commands
  if (STATIC_COMMANDS[firstWord]) {
    return STATIC_COMMANDS[firstWord](ctx);
  }

  // 3. Dynamic exercise shortcut, e.g. "/pushup" — PLAN-AWARE (PILLAR 11 / ACTION PIPELINE)
  // First check if this exercise is in the user's active plan, then resolve from there
  const specificExercise = firstWord.slice(1).replace(/-/g, ' ').trim();
  if (specificExercise.length > 2 && ctx.userId) {
    try {
      const userPlans = await SavedAIPlan.find({ userId: ctx.userId, isActive: true }).limit(1).lean();
      if (userPlans.length > 0) {
        const activePlan = userPlans[0];
        const calendar = activePlan.calendar || activePlan.workout?.interactive_calendar || [];
        
        // Find today's active workout day
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const completedDays = (activePlan.progress?.completedSessions || []).map(s => s.dayNumber);
        
        // Find the exercise in the plan's exercises
        let foundExercise = null;
        let foundDay = null;
        for (const day of calendar) {
          if (day.isRestDay || day.dayType === 'rest') continue;
          const dayExercises = day.exercises || day.mainWorkout || [];
          const matched = dayExercises.find(ex => 
            (ex.name || '').toLowerCase().replace(/[- ]/g, '') === specificExercise.replace(/[- ]/g, '')
          );
          if (matched) {
            foundExercise = matched;
            foundDay = day;
            break;
          }
        }

        if (foundExercise && foundDay) {
          const isCompleted = completedDays.includes(foundDay.dayNumber);
          const statusEmoji = isCompleted ? '✅' : '🟡';
          return {
            role: 'assistant',
            content: `${statusEmoji} **${foundExercise.name || specificExercise}** — from your **${activePlan.title}** plan\n\n📋 **Today's Target:**\n- Sets: **${foundExercise.sets || 3}**\n- Reps: **${foundExercise.reps || '10-12'}**\n- Rest: **${foundExercise.restSec || foundExercise.restSeconds || 60}s**\n- RPE Target: **${foundExercise.rpe || '7-8'}**\n${foundExercise.purpose ? `\n> 🧠 *Why this exercise: ${foundExercise.purpose}*` : ''}\n\n${isCompleted ? '✅ This session is already marked complete.' : 'Ready to start? Hit the **START** button below!'}`,
            suggestions: isCompleted ? ['🔄 Redo This Exercise', '📋 Next Exercise', '✏️ Adjust Completion'] : ['▶️ Start with AI Camera', '✅ Mark Complete', '🔄 Change Exercise', '🚨 Report Problem'],
            structuredAction: {
              type: isCompleted ? 'EXERCISE_ALREADY_DONE' : 'START_EXERCISE',
              exerciseName: foundExercise.name || specificExercise,
              sets: foundExercise.sets || 3,
              reps: foundExercise.reps || '10',
              restSec: foundExercise.restSec || foundExercise.restSeconds || 60,
              rpe: foundExercise.rpe || 7,
              planId: activePlan._id,
              dayNumber: foundDay.dayNumber,
              payload: {
                exerciseName: foundExercise.name || specificExercise,
                durationLimitMs: 600000,
                forceCamera: true
              }
            },
            sourceAttribution: { sourceType: 'ai_plan_link' }
          };
        }
      }
    } catch (planErr) {
      console.warn('Plan-aware exercise lookup error:', planErr.message);
    }

    // Fallback: generic exercise tracking (not in plan)
    return {
      role: 'assistant',
      content: `🏋️ **${specificExercise.replace(/\b\w/g, l => l.toUpperCase())}** — Ready to track!\n\nThis exercise isn't in your active plan today, but I can still track it for you.\n\nChoose how to proceed:`,
      suggestions: [`▶️ Start ${specificExercise} Tracker`, '📋 Add to Today\'s Session', '📖 View Exercise Guide'],
      structuredAction: {
        type: 'START_EXERCISE',
        exerciseName: specificExercise,
        payload: {
          exerciseName: specificExercise,
          durationLimitMs: 600000,
          forceCamera: true
        }
      },
      sourceAttribution: { sourceType: 'system' }
    };
  }

  // No userId — guest exercise shortcut
  if (specificExercise.length > 2) {
    return {
      role: 'assistant',
      content: `Setting up tracking for **${specificExercise}**...`,
      structuredAction: {
        type: 'START_EXERCISE',
        exerciseName: specificExercise,
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
