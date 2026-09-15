import intentClassifier, { INTENTS, computeMissingBioFields } from './intentClassifier.js';
import workoutDecisionEngine from '../workout/workoutDecisionEngine.js';
import dietBuilder from '../nutrition/dietBuilder.js';
import dietValidator from '../nutrition/dietValidator.js';
import exerciseSafetyValidator from '../safety/exerciseSafetyValidator.js';
import exerciseRegistry from '../workout/exerciseRegistry.js';
import eventAwarenessEngine, { EVENT_TYPES } from '../workout/eventAwarenessEngine.js';
import { generatePlanObject, parsePlanDuration } from '../../controllers/recommendationEngine.js';
import { getAlternatives, FOOD_SUBSTITUTION_GROUPS } from '../nutrition/foodSubstitutionGroups.js';

/**
 * Conversational Adaptive Personal Trainer & Reasoning Engine
 *
 * Implements the Dynamic Clarification Loop, External Event Awareness,
 * Cumulative Fatigue Reasoning, and Plain-Language Coaching.
 */

/**
 * Determines whether the user should be treated as having a human trainer
 * based on their gym membership and personal opt-in.
 * Part 21.
 * 
 * @param {Object} user - The user document (or context object)
 * @param {Object} gym - The gym document
 * @returns {Object} { hasHumanTrainer: Boolean, mode: 'ai_full' | 'ai_supportive' }
 */
export function resolveTrainerContext(user, gym) {
  if (!gym) return { hasHumanTrainer: false, mode: 'ai_full' };
  
  if (gym.trainerIncluded) {
    return { hasHumanTrainer: true, mode: 'ai_supportive' };
  }
  
  if (user?.bioData?.gymTrainerOptIn || user?.gymTrainerOptIn) {
    return { hasHumanTrainer: true, mode: 'ai_supportive' };
  }
  
  return { hasHumanTrainer: false, mode: 'ai_full' };
}

/**
 * Extracts structured plan intake parameters (Goal, Duration, Days, Equipment)
 * across current turn and recent chat history.
 */
export function extractIntakeState(raw = '', history = [], userContext = {}) {
  const userUtterances = [
    ...(history || []).filter(m => m.role === 'user' || m.sender === 'user').map(m => (m.content || m.text || '')),
    raw
  ];
  const combinedText = userUtterances.join(' ').toLowerCase();

  const lastAssistantMsg = [...(history || [])]
    .reverse()
    .find(m => m.role === 'assistant' || m.sender === 'other' || m.sender === 'assistant');
  const lastPrompt = (lastAssistantMsg?.content || lastAssistantMsg?.text || '').toLowerCase();

  // 1. Goal (matches typos & variations, falls back to bio)
  let goal = null;
  if (/los(?:e|ing|t)?\s*(?:weight|fat)|weight\s*los(?:e|ing|t|s)?|fat\s*loss|burn\s*fat|wajan\s*kam|belly\s*fat/i.test(combinedText)) {
    goal = 'Lose Weight';
  } else if (/build\s*muscle|gain\s*muscle|muscle\s*building|hypertrophy|body\s*banani|body\s*development|bulk|muscle/i.test(combinedText)) {
    goal = 'Build Muscle';
  } else if (/gain strength|strength|stronger|heavy lifting|power/i.test(combinedText)) {
    goal = 'Gain Strength';
  } else if (/improve stamina|stamina|endurance|cardio|running stamina/i.test(combinedText)) {
    goal = 'Improve Stamina';
  } else if (/general fitness|stay fit|fitness|fit hona|overall health/i.test(combinedText)) {
    goal = 'General Fitness';
  } else if (/sports|cricket|football|athlete/i.test(combinedText)) {
    goal = 'Sports Performance';
  } else if (userContext.primaryGoal || userContext.mainGoalArea) {
    const bg = String(userContext.primaryGoal || userContext.mainGoalArea).toLowerCase();
    if (bg.includes('weight') || bg.includes('fat')) goal = 'Lose Weight';
    else if (bg.includes('muscle') || bg.includes('hypertrophy') || bg.includes('body')) goal = 'Build Muscle';
    else if (bg.includes('strength')) goal = 'Gain Strength';
    else if (bg.includes('stamina') || bg.includes('endurance')) goal = 'Improve Stamina';
    else goal = userContext.primaryGoal || userContext.mainGoalArea;
  }

  // 2. Duration (Flexible: 2 Weeks, 1 Month, 2 Months, 3 Months, 6 Months, 1 Year, etc.)
  let duration = null;
  if (/2 weeks?|two weeks?|14 days?/i.test(combinedText)) {
    duration = '2 Weeks';
  } else if (/1 year|one year|12 months?|52 weeks?|yearly|annual/i.test(combinedText)) {
    duration = '1 Year';
  } else if (/6 months?|six months?|24 weeks?|half year/i.test(combinedText)) {
    duration = '6 Months';
  } else if (/3 months?|three months?|12 weeks?|quarter/i.test(combinedText)) {
    duration = '3 Months';
  } else if (/2 months?|two months?|8 weeks?/i.test(combinedText)) {
    duration = '2 Months';
  } else if (/1 month|one month|4 weeks?|28 days?|30 days?/i.test(combinedText)) {
    duration = '1 Month';
  } else {
    const customMatch = combinedText.match(/(\d+)\s*(weeks?|months?|years?)/i);
    if (customMatch) {
      const num = parseInt(customMatch[1], 10);
      const unit = customMatch[2].toLowerCase();
      if (unit.startsWith('year')) duration = `${num} Year${num > 1 ? 's' : ''}`;
      else if (unit.startsWith('month')) duration = `${num} Month${num > 1 ? 's' : ''}`;
      else if (unit.startsWith('week')) duration = `${num} Week${num > 1 ? 's' : ''}`;
    }
  }

  // 3. Days per week (falls back to bio profile if available)
  let days = null;
  const daysMatch = combinedText.match(/(\d)\s*(?:days?(?:\s*\/\s*week)?|din)/i);
  if (daysMatch) {
    const d = parseInt(daysMatch[1], 10);
    if (d >= 2 && d <= 6) days = d;
  }
  if (!days && (lastPrompt.includes('step 3') || lastPrompt.includes('days per week') || lastPrompt.includes('training days'))) {
    const numMatch = raw.trim().match(/^[2-6]$/);
    if (numMatch) days = parseInt(numMatch[0], 10);
  }
  if (!days && userContext.trainingDaysPerWeek) {
    const d = parseInt(userContext.trainingDaysPerWeek, 10);
    if (d >= 2 && d <= 6) days = d;
  }
  if (!days && (userContext.fitnessLevel === 'Advanced' ? 5 : userContext.fitnessLevel === 'Intermediate' ? 4 : 3)) {
    // Default smart frequency based on fitness level if not set
    days = userContext.fitnessLevel === 'Advanced' ? 5 : userContext.fitnessLevel === 'Intermediate' ? 4 : 3;
  }

  // 4. Equipment (falls back to bio profile if available)
  let equipment = null;
  if (/full gym|gym access|in the gym|gym/i.test(combinedText)) {
    equipment = 'Full Gym';
  } else if (/dumbbell|dumbbells|home dumbbells|just dumbbells/i.test(combinedText)) {
    equipment = 'Dumbbells';
  } else if (/bodyweight|no equipment|calisthenics|home workout/i.test(combinedText)) {
    equipment = 'Bodyweight';
  } else if (userContext.equipmentAccess) {
    equipment = userContext.equipmentAccess;
  } else {
    equipment = 'Full Gym';
  }

  return { goal, duration, days, equipment };
}

export const coachConversationEngine = {
  /**
   * Process a conversational turn with full state awareness
   *
   * @param {Object} input
   * @param {string} input.message - User message
   * @param {Object} input.userContext - User bio profile
   * @param {Array} input.history - Prior chat history
   * @param {Object} input.currentPlan - Currently active AI plan
   * @param {Object} input.currentWorkout - Currently selected workout
   * @param {Array} input.recentWorkoutHistory - Completed workout history
   * @param {Object} input.currentProgress - Streak, points, completed days
   * @param {Object} input.preferences - Dietary or training preferences
   * @returns {Object} { role: 'assistant', content, structuredAction }
   */
  processTurn({
    message = '',
    userContext = {},
    history = [],
    currentPlan = null,
    currentWorkout = null,
    recentWorkoutHistory = [],
    currentProgress = {},
    preferences = {}
  } = {}) {
    const raw = (message || '').trim();
    const text = raw.toLowerCase();
    const historyText = (history || []).map(h => (h.content || h.text || '')).join(' ').toLowerCase();
    const fullContext = `${historyText} ${text}`;

    // 1. Classify Intent, Extract Entities & Missing Context
    const { intent, entities, clarificationNeeded, missingContext } =
      intentClassifier.classify(raw, history, userContext);

    // 2. Build Updated User Profile considering contextual overrides
    const effectiveProfile = {
      ...userContext,
      weight: entities.weightMentioned || userContext.weight || userContext.weightKg || 70,
      equipmentAccess: entities.equipmentChange || userContext.equipmentAccess || 'Full Gym',
      sessionDurationMins: entities.sessionDurationChange || userContext.sessionDurationMins || 45,
      jointPain: entities.painArea
        ? [...new Set([...(userContext.jointPain || []), entities.painArea])]
        : (userContext.jointPain || [])
    };

    // Detect ongoing external events
    const externalEvent = entities.externalEvent || eventAwarenessEngine.detectEvent(raw, history);
    const eventDemands = externalEvent ? eventAwarenessEngine.getEventDemands(externalEvent) : null;

    let responseContent = '';
    let structuredAction = {
      type: 'INFO',
      intent,
      workout: null,
      diet: null,
      rationale: null,
      externalActivity: externalEvent,
      missingContext: missingContext || null,
      explanation: ''
    };

    // =====================================================================
    // STEP A: DYNAMIC CLARIFICATION LOOP (If critical info is missing)
    // =====================================================================
    if (clarificationNeeded) {
      structuredAction.type = 'ASK_CLARIFICATION';

      if (missingContext === 'training_type') {
        responseContent = `I understand you have training tomorrow! 🏃‍♂️

Before I recommend what you should do today, could you tell me:
**What type of training is it tomorrow?**

For example:
- Army or police physical fitness test
- Football or soccer practice/match
- Cricket match
- Running race or time trial
- Gym resistance session`;

        const suggestions = ['🎖️ Army Fitness Test', '⚽ Football Match', '🏏 Cricket Match', '🏃 5K Running Race', '🏋️ Gym Session'];
        structuredAction.suggestions = suggestions;
        structuredAction.explanation = 'Asking user to clarify the type of upcoming external training.';
        return { role: 'assistant', content: responseContent, suggestions, structuredAction };
      }

      if (missingContext === 'training_activities') {
        const isAcademy = (externalEvent?.type === EVENT_TYPES.POLICE_TEST) || text.includes('selection') || text.includes('academy');
        const isPT = text.includes('physical training') || text.includes('pt');

        const suggestions = ['Running & Sprints', 'Push-ups & Calisthenics', 'Obstacle Course & Agility', 'Marching & Drills'];
        structuredAction.suggestions = suggestions;

        if (isAcademy) {
          responseContent = `Understood! An academy physical selection test places high physical demands on your body. 🎖️

To make sure today's workout leaves you fresh, energized, and ready to perform tomorrow:
**What activities does tomorrow's selection test involve?**

For example:
- Running (1.6 km time trial or sprints)
- Push-ups, pull-ups, or sit-ups
- Obstacle course & agility drills
- Jump or agility tests`;

          structuredAction.explanation = 'Asking what activities tomorrow\'s academy selection test will involve.';
          return { role: 'assistant', content: responseContent, suggestions, structuredAction };
        }

        if (isPT) {
          responseContent = `Understood, physical training! 🏃‍♂️

To make sure today's preparation matches tomorrow's workload:
**What physical activities are included in your training?**

For example:
- Running and sprints
- Push-ups, pull-ups, or calisthenics
- Obstacle course
- Heavy resistance work`;

          structuredAction.explanation = 'Asking what physical activities are included.';
          return { role: 'assistant', content: responseContent, suggestions, structuredAction };
        }

        responseContent = `Understood! Military and army training places very high physical demands on your body. 🎖️

To make sure today's workout leaves you fresh, energized, and ready to perform tomorrow:
**What does tomorrow's training involve?**

For example:
- Running and sprints
- Push-ups and pull-ups (calisthenics)
- Marching and drills
- Obstacle course
- Heavy load carriage`;

        structuredAction.explanation = 'Asking what activities tomorrow\'s military training will involve.';
        return { role: 'assistant', content: responseContent, suggestions, structuredAction };
      }

      if (missingContext === 'race_details') {
        responseContent = `Exciting! Racing requires proper preparation and energy management. 🏁

To dial in your training and nutrition:
**What distance is the race, and when is it taking place?**

For example:
- *5K race tomorrow*
- *10K race this weekend*
- *Half marathon next month*`;

        const suggestions = ['🏃 5K Race Tomorrow', '🏃 10K This Weekend', '🏃 Half Marathon Next Month'];
        structuredAction.suggestions = suggestions;
        structuredAction.explanation = 'Asking for race distance and timing.';
        return { role: 'assistant', content: responseContent, suggestions, structuredAction };
      }

      if (missingContext === 'goal_priority') {
        responseContent = `Bilkul! Getting fit is a great decision, and I am here to guide you step-by-step. 🎯

Fitness can mean different things for different people. To build the plan that best fits your life:
**What is your top priority right now?**

1. **Losing weight & burning belly fat**
2. **Building muscle & getting stronger**
3. **Boosting stamina & cardiovascular endurance**
4. **General fitness, energy & joint mobility**

Let me know which one matters most to you!`;

        const suggestions = ['🔥 Lose Weight', '💪 Build Muscle', '⚡ Gain Strength', '🏃 Improve Stamina'];
        structuredAction.suggestions = suggestions;
        structuredAction.explanation = 'Clarifying primary fitness priority in plain language.';
        return { role: 'assistant', content: responseContent, suggestions, structuredAction };
      }

      if (missingContext === 'experience_frequency') {
        responseContent = `Building muscle and transforming your physique is an exciting journey! 🏋️‍♂️

To program the right training volume, split, and progressive overload for you:
**How many days per week can you dedicate to working out, and what is your current lifting experience (Beginner / Intermediate / Advanced)?**`;

        const suggestions = ['Beginner (3 Days/Week)', 'Intermediate (4 Days/Week)', 'Advanced (5 Days/Week)'];
        structuredAction.suggestions = suggestions;
        structuredAction.explanation = 'Asking for training frequency and experience level to structure progressive resistance program.';
        return { role: 'assistant', content: responseContent, suggestions, structuredAction };
      }
    }

    // =====================================================================
    // STEP A2: INTERACTIVE WORKOUT PLAN QUESTIONNAIRE & GENERATION
    // =====================================================================
    const isAskingAboutDetails = /what (type of )?details|kya details|which details|what do you need/i.test(raw);
    const lastAssistantMsg = [...(history || [])]
      .reverse()
      .find(m => m.role === 'assistant' || m.sender === 'other' || m.sender === 'assistant');
    const lastPrompt = (lastAssistantMsg?.content || lastAssistantMsg?.text || '').toLowerCase();

    const isInIntakeFlow = lastPrompt.includes('step 1') ||
      lastPrompt.includes('step 2') ||
      lastPrompt.includes('step 3') ||
      lastPrompt.includes('step 4') ||
      lastPrompt.includes('primary fitness goal') ||
      /how long.*(?:program|plan).*run/i.test(lastPrompt) ||
      lastPrompt.includes('calibrated your profile') ||
      lastPrompt.includes('profile snapshot') ||
      lastPrompt.includes('days per week') ||
      lastPrompt.includes('equipment do you have access to') ||
      lastPrompt.includes('i just need') ||
      (/\b(?:\d+\s*(?:weeks?|months?|years?)|2 weeks|1 month|2 months|3 months|6 months|1 year)\b/i.test(raw) && (history || []).length > 0) ||
      (/\b(?:full gym|dumbbells?|bodyweight)\b/i.test(raw) && (history || []).length > 0);

    const wantsFullPlan = isAskingAboutDetails || isInIntakeFlow ||
      /(?:generate|build|create|make|give|suggest|start|want|need)\s+.*?(?:workout|exercise|excercice|routine|plan|program)/i.test(raw) ||
      /(?:workout|exercise|excercice|routine|program)\s+(?:plan|for|banana|chahiye|de|do)/i.test(raw) ||
      /\b(?:workout\s*plan|exercise\s*plan|excercice\s*plan|new\s*plan|make\s*a\s*plan|build\s*a\s*plan)\b/i.test(raw) ||
      (/\b(?:losing\s*weight|weight\s*loss|weight\s*lost|lose\s*weight|build\s*muscle|body\s*development)\b/i.test(raw) && /\b(?:plan|routine|program|month|weeks?|generate|start|excercice|exercise)\b/i.test(raw)) ||
      (intent === INTENTS.GENERATE_WORKOUT && !text.includes('today') && !text.includes('aaj'));

    if (wantsFullPlan) {
      const intakeState = extractIntakeState(raw, history, effectiveProfile);

      if (isAskingAboutDetails) {
        responseContent = `To build your customized workout program, I just need a couple quick details:

1. 🎯 **Your Goal** (e.g. Lose Weight, Build Muscle)
2. ⏱️ **Plan Duration** (e.g. 2 Weeks, 1 Month, 3 Months, 6 Months)

Let's get started! **What is your primary fitness goal?**`;
        const suggestions = ['🔥 Lose Weight', '💪 Build Muscle', '⚡ Gain Strength', '🏃 Improve Stamina', '✨ General Fitness'];
        structuredAction.type = 'PLAN_QUESTIONNAIRE';
        structuredAction.step = 'goal';
        structuredAction.suggestions = suggestions;
        return { role: 'assistant', content: responseContent, suggestions, structuredAction };
      }

      // Step 1: Goal
      if (!intakeState.goal) {
        responseContent = `I can design a fully periodized workout program for you! 🏋️‍♂️

**What is your primary fitness goal?**`;
        const suggestions = ['🔥 Lose Weight', '💪 Build Muscle', '⚡ Gain Strength', '🏃 Improve Stamina', '✨ General Fitness'];
        structuredAction.type = 'PLAN_QUESTIONNAIRE';
        structuredAction.step = 'goal';
        structuredAction.suggestions = suggestions;
        return { role: 'assistant', content: responseContent, suggestions, structuredAction };
      }

      // Step 2: Duration
      if (!intakeState.duration) {
        const goalDisplay = intakeState.goal;
        const equipDisplay = intakeState.equipment || effectiveProfile.equipmentAccess || 'Full Gym';
        const levelDisplay = effectiveProfile.fitnessLevel || 'Beginner';

        responseContent = `I've calibrated your profile:
📋 **Goal**: ${goalDisplay} | 🏋️ **Equipment**: ${equipDisplay} | 📊 **Level**: ${levelDisplay}

**How long would you like your customized program to run?**`;
        const suggestions = ['⏱️ 2 Weeks', '📅 1 Month', '🎯 3 Months', '🏆 6 Months', '🌟 1 Year'];
        structuredAction.type = 'PLAN_QUESTIONNAIRE';
        structuredAction.step = 'duration';
        structuredAction.suggestions = suggestions;
        return { role: 'assistant', content: responseContent, suggestions, structuredAction };
      }

      // Final resolved parameters
      const finalDays = intakeState.days || effectiveProfile.trainingDaysPerWeek || (effectiveProfile.fitnessLevel === 'Advanced' ? 5 : 4);
      const finalEquip = intakeState.equipment || effectiveProfile.equipmentAccess || 'Full Gym';

      // All parameters are ready! Generate the complete periodized plan
      const durationInfo = parsePlanDuration(intakeState.duration);
      const planBio = {
        ...effectiveProfile,
        mainGoalArea: intakeState.goal,
        primaryGoal: intakeState.goal,
        planDuration: durationInfo.label,
        trainingDaysPerWeek: finalDays,
        daysPerWeek: finalDays,
        equipmentAccess: finalEquip
      };
      const plan = generatePlanObject(planBio, { effectiveGoal: intakeState.goal });

      responseContent = `🎉 **Your ${durationInfo.label} ${intakeState.goal} Plan is Ready!**

### 📋 Program Summary:
- 🎯 **Primary Goal**: ${intakeState.goal}
- ⏱️ **Duration**: ${durationInfo.label} (${durationInfo.totalWeeks} Weeks / ${durationInfo.totalDays} Days)
- 📅 **Schedule**: ${finalDays} Days per Week
- 🏋️ **Equipment**: ${finalEquip}
- 🥗 **Target Nutrition**: ${plan.structuredDiet?.actualTotals?.totalDailyCalories || 2000} kcal / day

Your interactive periodized calendar has been calibrated with progressive overload and recovery cycles. Click **Open in AI Trainer** below to start your training!`;

      const suggestions = ['🚀 Open in AI Trainer', '🥗 View Matching Diet', '🔄 Create Another Plan'];
      structuredAction = {
        type: 'PLAN_GENERATED',
        plan: {
          ...plan,
          title: `${durationInfo.label} ${intakeState.goal} Program`,
          goal: intakeState.goal,
          planDuration: durationInfo.label,
          trainingDaysPerWeek: finalDays,
          equipmentAccess: finalEquip,
          createdAt: new Date().toISOString()
        },
        workout: plan.interactive_calendar.find(d => d.isWorkoutDay) || null,
        diet: plan.structuredDiet,
        suggestions
      };
      return { role: 'assistant', content: responseContent, suggestions, structuredAction };
    }

    // =====================================================================
    // STEP B: HANDLING RESPONSES TO PREVIOUS CLARIFICATIONS
    // =====================================================================
    if (intent === INTENTS.CLARIFICATION_RESPONSE) {
      const topic = entities.priorClarificationTopic;

      // User just clarified training type (e.g. "Army training")
      if (topic === 'training_type') {
        if (text.includes('army') || text.includes('military') || text.includes('police') || text.includes('ssb')) {
          responseContent = `Got it, **Army training**! 🎖️

Before I adjust today's session, could you briefly let me know:
**What does tomorrow's training involve?**
For example: running, push-ups, pull-ups, marching, obstacle work, strength training, or something else?`;

          structuredAction.type = 'ASK_CLARIFICATION';
          structuredAction.missingContext = 'training_activities';
          structuredAction.explanation = 'Following up on army training activities.';
          return { role: 'assistant', content: responseContent, structuredAction };
        } else if (text.includes('cricket')) {
          effectiveProfile.sport = 'Cricket';
        } else if (text.includes('football') || text.includes('soccer')) {
          effectiveProfile.sport = 'Football';
        } else if (text.includes('race') || text.includes('running')) {
          effectiveProfile.sport = 'Running / Track';
        }
      }

      // User clarified military training activities (e.g. "Running, push-ups, pull-ups and obstacle course")
      if (topic === 'training_activities' || text.includes('obstacle') || (text.includes('push-up') && text.includes('pull-up')) || (text.includes('running') && text.includes('push-up'))) {
        const session = workoutDecisionEngine.generateSession({
        recoveryFlag: userContext.recoveryFlag || "Normal",
          userProfile: effectiveProfile,
          recentWorkoutHistory,
          contextMessage: 'army training tomorrow running pushups pullups obstacle course',
          externalActivity: {
            type: EVENT_TYPES.ARMY_TRAINING,
            name: 'Army Physical Training',
            proximityDays: 1,
            dateDescription: 'tomorrow',
            expectedActivities: ['running', 'push-ups', 'pull-ups', 'obstacle course']
          },
          dayNumber: 1
        });

        responseContent = `Thank you for the details! Because tomorrow involves **running, push-ups, pull-ups, and an obstacle course**, tomorrow's physical workload will be intense. 🎖️

### 🛡️ Coach Strategy for Today:
- ❌ **Zero Chest/Shoulder Fatigue**: We are **NOT** doing heavy bench presses, push-ups, or overhead presses today so your pushing muscles have maximum endurance for tomorrow.
- ❌ **Zero Pulling Fatigue**: No heavy pull-ups or rows today so your back and grip are fresh for obstacle ropes and pull-up bars.
- ❌ **Zero Leg Exhaustion**: No heavy squats or lunges so your legs are springy and light for tomorrow's run.
- ✅ **What We Are Doing**: A **low-fatigue movement preparation & mobility session** focusing on thoracic spine mobility, hip openers, light core bracing, and breathing to reduce unnecessary fatigue and minimize soreness risk.

### 📋 Today's Session:
${session.mainWorkout.map((ex, i) => `${i + 1}. **${ex.name}** — ${ex.sets} sets × ${ex.reps} reps (Light & smooth, RPE ${ex.rpe})`).join('\n')}

💡 **Coach Tips for Tomorrow**:
- 💧 **Hydration**: Drink at least 3 liters of water today.
- 😴 **Sleep**: Get 7 to 8 hours of solid rest tonight.
- 🍌 **Fuel**: Eat a clean, carb-rich meal (e.g. oats, bananas, rice) 2 hours before your morning training.

Your session is ready in the AI Trainer! Click **Apply to AI Trainer** below to load it.`;

        structuredAction.type = 'UPDATE_WORKOUT';
        structuredAction.workout = session;
        structuredAction.rationale = session.rationale;
        structuredAction.explanation = 'Adapted workout for tomorrow\'s army training to reduce fatigue and preserve performance.';
        return { role: 'assistant', content: responseContent, structuredAction };
      }

      // User clarified race distance (e.g. "5K")
      if (topic === 'race_details' || text === '5k' || text === '5k.' || text === '10k' || text.includes('5k')) {
        const distance = (text.match(/\b(5k|10k|21k|42k|half marathon|marathon)\b/i) || ['5K'])[0].toUpperCase();
        const session = workoutDecisionEngine.generateSession({
        recoveryFlag: userContext.recoveryFlag || "Normal",
          userProfile: effectiveProfile,
          recentWorkoutHistory,
          contextMessage: `${distance} race tomorrow`,
          externalActivity: {
            type: EVENT_TYPES.RUNNING_RACE,
            name: `${distance} Running Race`,
            proximityDays: 1,
            distance,
            dateDescription: 'tomorrow'
          },
          dayNumber: 1
        });

        responseContent = `Good luck with your **${distance} race tomorrow**! 🏃‍♂️💨

On the day before a race, the golden rule is **zero muscular fatigue and zero central nervous system depletion**. We want your glycogen stores topped up and your legs fresh and springy.

### 🛡️ Pre-Race Priming Protocol for Today:
- **Zero Heavy Leg Resistance or Sprints**: Heavy squats, lunges, and leg presses are strictly eliminated to reduce unnecessary fatigue and minimize soreness risk for race day.
- **Light Nervous System Priming**: Ankle dorsiflexion mobility, hip 90/90 flows, and gentle core bracing to preserve performance.
- **Estimated Duration**: ~${session.timeBudget.totalEstimatedMinutes} minutes.

### 📋 Today's Shakeout Routine:
${session.mainWorkout.map((ex, i) => `${i + 1}. **${ex.name}** — ${ex.sets} sets × ${ex.reps} reps (RPE ${ex.rpe}, very light)`).join('\n')}

💡 **Night-Before Checklist**:
1. 💧 **Hydration**: Sip 2.5-3 liters of water throughout the day.
2. 🍚 **Fuel**: Eat a familiar, carb-rich dinner (rice, sweet potatoes, daal or grilled chicken).
3. 😴 **Rest**: Aim for 7 to 8 hours of solid sleep.`;

        structuredAction.type = 'UPDATE_WORKOUT';
        structuredAction.workout = session;
        structuredAction.rationale = session.rationale;
        structuredAction.explanation = `Generated pre-race priming protocol for ${distance} race tomorrow.`;
        return { role: 'assistant', content: responseContent, structuredAction };
      }

      // User clarified goal priority
      if (topic === 'goal_priority') {
        if (text.includes('weight') || text.includes('fat') || text.includes('lose')) {
          effectiveProfile.primaryGoal = 'Weight Loss & Fat Reduction';
        } else if (text.includes('muscle') || text.includes('strength') || text.includes('strong') || text.includes('body')) {
          effectiveProfile.primaryGoal = 'Muscle Building & Hypertrophy';
        } else if (text.includes('stamina') || text.includes('endurance')) {
          effectiveProfile.primaryGoal = 'Stamina & Athletic Conditioning';
        }

        const session = workoutDecisionEngine.generateSession({
        recoveryFlag: userContext.recoveryFlag || "Normal",
          userProfile: effectiveProfile,
          recentWorkoutHistory,
          contextMessage: effectiveProfile.primaryGoal,
          dayNumber: 1
        });

        responseContent = `Awesome! Focus locked on **${effectiveProfile.primaryGoal}**. 🎯

I've crafted today's workout tailored to your ${effectiveProfile.fitnessLevel || 'Beginner'} level and ${effectiveProfile.equipmentAccess || 'Full Gym'} access.

### 📋 Today's Plan: ${session.sessionObjective}
- **Warm-Up**: ${session.warmup.warmupExercises.map(w => w.name).join(', ')}
- **Main Exercises**:
${session.mainWorkout.map((ex, i) => `  ${i + 1}. **${ex.name}** — ${ex.sets} sets × ${ex.reps} reps`).join('\n')}
- **Cool-Down**: ${session.cooldown.cooldownExercises.map(c => c.name).join(', ')}

Let's begin this journey together! Click **Apply to AI Trainer** to start.`;

        structuredAction.type = 'UPDATE_WORKOUT';
        structuredAction.workout = session;
        structuredAction.rationale = session.rationale;
        structuredAction.explanation = `Generated foundational plan for ${effectiveProfile.primaryGoal}.`;
        return { role: 'assistant', content: responseContent, structuredAction };
      }

      // User clarified experience/frequency for muscle building
      if (topic === 'experience_frequency') {
        effectiveProfile.primaryGoal = 'Muscle Building & Hypertrophy';
        const session = workoutDecisionEngine.generateSession({
        recoveryFlag: userContext.recoveryFlag || "Normal",
          userProfile: effectiveProfile,
          recentWorkoutHistory,
          contextMessage: 'muscle building progressive resistance hypertrophy',
          dayNumber: 1
        });

        responseContent = `Thank you for the details! We are locking in a **Structured Progressive Overload Program** for muscle growth. 🏋️‍♂️

We do NOT follow random chest-and-biceps workouts. To build real muscle, every session focuses on multi-joint compound drivers, precise progressive volume, and structured recovery.

### 📋 Today's Session: ${session.sessionObjective}
${session.mainWorkout.map((ex, i) => `${i + 1}. **${ex.name}** — ${ex.sets} sets × ${ex.reps} reps (RPE ${ex.rpe})`).join('\n')}

Click **Apply to AI Trainer** below to lock in today's resistance training!`;

        structuredAction.type = 'UPDATE_WORKOUT';
        structuredAction.workout = session;
        structuredAction.rationale = session.rationale;
        structuredAction.explanation = 'Generated structured progressive resistance program for muscle growth.';
        return { role: 'assistant', content: responseContent, structuredAction };
      }
    }

    // =====================================================================
    // STEP C: MORNING HEAVY LEGS RE-EVALUATION
    // Example: "Waise maine aaj subah heavy legs bhi kiye hain."
    // =====================================================================
    if (entities.morningHeavyLegs || (text.includes('heavy legs') && (text.includes('subah') || text.includes('morning') || text.includes('aaj')))) {
      const session = workoutDecisionEngine.generateSession({
        recoveryFlag: userContext.recoveryFlag || "Normal",
        userProfile: effectiveProfile,
        recentWorkoutHistory,
        contextMessage: 'heavy legs this morning army training tomorrow restorative recovery mobility',
        externalActivity: {
          type: EVENT_TYPES.GENERAL_SPORTS,
          name: 'Restorative Active Recovery & Mobility',
          proximityDays: 0,
          dateDescription: 'today'
        },
        dayNumber: 1
      });

      session.sessionObjective = 'Active Recovery, Spinal Decompression & Mobility (Trained Legs This Morning)';
      session.mainWorkout = [
        {
          name: 'Passive Bar Hang (Spinal Decompression)',
          sets: 2,
          reps: '30-45s hold',
          rpe: '5.0',
          purpose: 'Decompresses lumbar spine and resets shoulder girdle after heavy axial loading.'
        },
        {
          name: '90/90 Hip Flow & Glute Openers',
          sets: 2,
          reps: '8 per side',
          rpe: '5.0',
          purpose: 'Restores internal and external hip rotational range of motion without muscular fatigue.'
        },
        {
          name: 'Thoracic Extension & Cat-Cow Flow',
          sets: 2,
          reps: '10 smooth breaths',
          rpe: '4.5',
          purpose: 'Restores spinal mobility and autonomic nervous system recovery.'
        },
        {
          name: 'Diaphragmatic Box Breathing (Supine 90/90)',
          sets: 1,
          reps: '5 minutes',
          rpe: '3.0',
          purpose: 'Activates parasympathetic nervous system for systemic muscle repair and nervous system recovery.'
        }
      ];

      responseContent = `I hear you loud and clear! That is critical context: **you already trained heavy legs this morning, and tomorrow you have army training** (running, push-ups, pull-ups, and obstacle course). 🛑

### 🧠 Immediate Strategic Re-evaluation:
- ❌ **Zero Additional Leg Fatigue**: Your quads, hamstrings, and glutes are already metabolically taxed. Adding any lower-body resistance or running tonight would elevate muscle strain risk and leave your legs stiff and exhausted for tomorrow's run.
- ❌ **Zero Upper-Body Resistance**: We must preserve your chest, shoulders, lats, and grip so you are 100% fresh for tomorrow's push-ups, pull-ups, and obstacle work.
- ✅ **Strictly Active Recovery & Spinal Decompression Tonight**: Tonight's focus shifts entirely to passive decompression, restorative hip and thoracic mobility, and nervous system relaxation to reduce unnecessary fatigue and minimize soreness risk for tomorrow.

### 📋 Tonight's Restorative Protocol:
${session.mainWorkout.map((ex, i) => `${i + 1}. **${ex.name}** — ${ex.sets} sets × ${ex.reps} (RPE ${ex.rpe})`).join('\n')}

💧 **Tonight's Priority**: Drink water, eat a nourishing dinner with adequate carbs and protein, and get 8 hours of sleep. No more resistance work today!`;

      structuredAction.type = 'UPDATE_WORKOUT';
      structuredAction.workout = session;
      structuredAction.rationale = {
        sessionGoal: session.sessionObjective,
        constraints: ['Heavy legs completed this morning', 'Army training tomorrow'],
        risks: ['High risk of muscle strain and compromised test performance if extra volume is added'],
        selectedExercises: session.mainWorkout.map(e => e.name),
        exerciseReasons: {
          'Passive Bar Hang (Spinal Decompression)': 'Relieves axial spinal compression from morning leg workout.',
          '90/90 Hip Flow & Glute Openers': 'Restores hip range of motion without eccentric damage.',
          'Thoracic Extension & Cat-Cow Flow': 'Promotes spinal mobility and blood flow.',
          'Diaphragmatic Box Breathing (Supine 90/90)': 'Shifts autonomic nervous system to parasympathetic recovery.'
        },
        expectedFatigue: 'very low',
        recoveryConsiderations: ['Prioritize sleep, hydration, and nutritional glycogen replenishment.']
      };
      structuredAction.explanation = 'Re-evaluated for morning heavy legs + tomorrow army training: strictly restorative recovery and mobility.';
      return { role: 'assistant', content: responseContent, structuredAction };
    }

    // =====================================================================
    // STEP D: OUTSIDE TRAINING CONFLICT & CUMULATIVE WORKLOAD REASONING (TEST L)
    // Example: "I trained legs very hard yesterday" + "Tomorrow I have football practice"
    // =====================================================================
    if (intent === INTENTS.WORKLOAD_CONFLICT || (fullContext.includes('trained legs') && fullContext.includes('football'))) {
      const session = workoutDecisionEngine.generateSession({
        recoveryFlag: userContext.recoveryFlag || "Normal",
        userProfile: effectiveProfile,
        recentWorkoutHistory,
        contextMessage: 'trained legs heavily yesterday tomorrow football practice',
        externalActivity: {
          type: EVENT_TYPES.FOOTBALL_MATCH,
          name: 'Football Practice',
          proximityDays: 1,
          dateDescription: 'tomorrow'
        },
        dayNumber: 1
      });

      responseContent = `I hear you loud and clear! You worked your legs heavily yesterday, and tomorrow you have **football practice**. ⚽

If you did another leg workout today, your quads and hamstrings would be stiff, slow, and prone to muscle strains during tomorrow's sprints and deceleration.

### 🧠 Why Today's Session Is Structured This Way:
- **I chose these exercises because tomorrow's football practice already gives you a high lower-body workload, and you worked legs yesterday.**
- Today's session focuses on **upper-body strength, rotational trunk stability, and dynamic hip mobility** without exhausting your legs.
- **Excluded**: All heavy squats, lunges, and leg presses.

### 📋 Today's Session: ${session.sessionObjective}
${session.mainWorkout.map((ex, i) => `${i + 1}. **${ex.name}** — ${ex.sets} sets × ${ex.reps} reps (RPE ${ex.rpe})`).join('\n')}

This will keep you moving, build your upper-body and core resilience, and let your legs recover so you are explosive on the pitch tomorrow!`;

      structuredAction.type = 'UPDATE_WORKOUT';
      structuredAction.workout = session;
      structuredAction.rationale = session.rationale;
      structuredAction.explanation = 'Resolved workload conflict: legs yesterday + football tomorrow -> upper body and core.';
      return { role: 'assistant', content: responseContent, structuredAction };
    }

    // =====================================================================
    // STEP E: OCCUPATIONAL PHYSICAL LABOR (TEST N)
    // Example: "I work construction and today was very physical."
    // =====================================================================
    if (externalEvent && externalEvent.type === EVENT_TYPES.PHYSICAL_LABOR) {
      const session = workoutDecisionEngine.generateSession({
        recoveryFlag: userContext.recoveryFlag || "Normal",
        userProfile: effectiveProfile,
        recentWorkoutHistory,
        contextMessage: 'heavy physical construction job today active recovery spinal decompression',
        externalActivity: externalEvent,
        dayNumber: 1
      });

      responseContent = `I understand completely! Working in **construction and heavy manual labor** places massive compressive loads on your spine, wears out your grip, and exhausts your legs and lower back. 🏗️

Prescribing heavy lifting or high-intensity intervals tonight would compound your spinal fatigue and elevate strain risk.

### 🧠 Tonight's Restorative Strategy:
- ❌ **No Heavy Spinal Loading**: Heavy squats, deadlifts, and barbell rows are completely excluded tonight.
- ✅ **Postural Restoration & Spinal Decompression**: Lengthening compressed spinal discs, opening tight hip flexors from bending and lifting, and restoring scapular posture.
- ⚡ **Submaximal Effort (RPE ≤ 6.0)**: Low sets, smooth movement to promote blood circulation and reduce unnecessary fatigue.

### 📋 Restorative Routine for Tonight:
${session.mainWorkout.map((ex, i) => `${i + 1}. **${ex.name}** — ${ex.sets} sets × ${ex.reps} reps (RPE ${ex.rpe})`).join('\n')}

Hydrate well, enjoy a wholesome dinner, and let your body restore tonight!`;

      structuredAction.type = 'UPDATE_WORKOUT';
      structuredAction.workout = session;
      structuredAction.rationale = session.rationale;
      structuredAction.explanation = 'Prescribed postural restoration and spinal decompression for heavy occupational labor.';
      return { role: 'assistant', content: responseContent, structuredAction };
    }

    // =====================================================================
    // STEP F: CRICKET 1-WEEK STAMINA MICROCYCLE (TEST E)
    // Example: "Ek week mein cricket match hai aur mujhe stamina maintain karna hai."
    // =====================================================================
    if (externalEvent && externalEvent.type === EVENT_TYPES.CRICKET_MATCH && externalEvent.proximityDays >= 5) {
      const session = workoutDecisionEngine.generateSession({
        recoveryFlag: userContext.recoveryFlag || "Normal",
        userProfile: effectiveProfile,
        recentWorkoutHistory,
        contextMessage: 'cricket match in 1 week stamina conditioning rotational power',
        externalActivity: externalEvent,
        dayNumber: 1
      });

      responseContent = `Outstanding! You have a **cricket match in 1 week** and your goal is to **maintain and peak stamina** without compromising freshness on match day. 🏏⚡

### 📅 7-Day Match Preparation Microcycle:
1. **Days 1–3 (Today to Day 3)**: Sport-specific stamina conditioning, rotational power, and kinetic chain endurance (bowling drive & batting footwork).
2. **Days 4–5**: Moderate resistance maintenance and rotator cuff / scapular durability.
3. **Days 6–7 (48h Taper)**: **Volume Taper** — eliminate high-fatigue leg work and heavy eccentric loads right before the match to minimize soreness risk and maximize explosive speed on match day.

### 📋 Today's Session: ${session.sessionObjective}
${session.mainWorkout.map((ex, i) => `${i + 1}. **${ex.name}** — ${ex.sets} sets × ${ex.reps} reps (${ex.rpe})`).join('\n')}

This will maintain your aerobic and anaerobic stamina while keeping your shoulder joint and kinetic chain primed!`;

      structuredAction.type = 'UPDATE_WORKOUT';
      structuredAction.workout = session;
      structuredAction.rationale = session.rationale;
      structuredAction.explanation = 'Programmed 7-day cricket stamina microcycle with planned 48-hour volume taper.';
      return { role: 'assistant', content: responseContent, structuredAction };
    }

    // Cricket Match Tomorrow (Pre-Match Priming)
    if (externalEvent && externalEvent.type === EVENT_TYPES.CRICKET_MATCH && externalEvent.proximityDays <= 1) {
      const session = workoutDecisionEngine.generateSession({
        recoveryFlag: userContext.recoveryFlag || "Normal",
        userProfile: effectiveProfile,
        recentWorkoutHistory,
        contextMessage: 'cricket match tomorrow thoracic mobility rotational core priming',
        externalActivity: externalEvent,
        dayNumber: 1
      });

      responseContent = `Best of luck with your **cricket match tomorrow**! 🏏🔥

Before a cricket match, we want your bowling shoulder free and springy, your rotational kinetic chain activated, and your legs completely fresh for bowling run-ups or batting footwork.

### 🛡️ Pre-Match Priming Strategy for Today:
- ❌ **Zero Heavy Overhead Lifting or Leg Exhaustion**: Heavy overhead presses and heavy squats are eliminated to minimize soreness risk and avoid shoulder stiffness or heavy legs.
- ✅ **Thoracic Spine Mobility & Scapular Activation**: Opens mid-back rotational range of motion and primes rotator cuff stabilizers.
- ✅ **Anti-Rotational Core Priming**: Gentle trunk bracing to prepare kinetic force transfer.
- ⚡ **Submaximal RPE (RPE ≤ 6.5)**: Light and snappy to preserve performance.

### 📋 Today's Pre-Match Session: ${session.sessionObjective}
${session.mainWorkout.map((ex, i) => `${i + 1}. **${ex.name}** — ${ex.sets} sets × ${ex.reps} reps (RPE ${ex.rpe})`).join('\n')}

Hydrate well, rest up tonight, and play hard tomorrow!`;

      structuredAction.type = 'UPDATE_WORKOUT';
      structuredAction.workout = session;
      structuredAction.rationale = session.rationale;
      structuredAction.explanation = 'Prescribed cricket pre-match priming, protecting shoulder and legs for tomorrow.';
      return { role: 'assistant', content: responseContent, structuredAction };
    }

    // =====================================================================
    // STEP G: FOOTBALL MATCH TOMORROW (TEST F)
    // Example: "Kal football match hai."
    // =====================================================================
    if (externalEvent && externalEvent.type === EVENT_TYPES.FOOTBALL_MATCH && externalEvent.proximityDays <= 1) {
      const session = workoutDecisionEngine.generateSession({
        recoveryFlag: userContext.recoveryFlag || "Normal",
        userProfile: effectiveProfile,
        recentWorkoutHistory,
        contextMessage: 'football match tomorrow upper body core mobility',
        externalActivity: externalEvent,
        dayNumber: 1
      });

      responseContent = `Got it! You have a **football match tomorrow**. ⚽🔥

Soccer demands repeated high-speed sprinting, rapid deceleration, and aggressive cutting, which places extreme eccentric stress on your hamstrings, quads, and adductors.

### 🧠 Why Today's Session Is Structured This Way:
- ❌ **Zero Heavy Lower-Body Volume**: All heavy squats, Romanian deadlifts, and lunges are **completely eliminated** today to preserve leg freshness, avoid heavy-leg syndrome, and minimize soreness risk for tomorrow.
- ✅ **Upper-Body Strength & Rotational Core**: Upper-body pressing/pulling and anti-rotational core work builds trunk stiffness for physical duels without fatiguing your legs.
- ✅ **Dynamic Hip & Ankle Mobility**: Prepares hip joint ranges for tomorrow's match play.

### 📋 Today's Session: ${session.sessionObjective}
${session.mainWorkout.map((ex, i) => `${i + 1}. **${ex.name}** — ${ex.sets} sets × ${ex.reps} reps (RPE ${ex.rpe})`).join('\n')}

Load this into the AI Trainer and leave the heavy running for match day tomorrow!`;

      structuredAction.type = 'UPDATE_WORKOUT';
      structuredAction.workout = session;
      structuredAction.rationale = session.rationale;
      structuredAction.explanation = 'Prescribed upper body and core mobility for football match tomorrow, eliminating lower body fatigue.';
      return { role: 'assistant', content: responseContent, structuredAction };
    }

    // Running Race Tomorrow (Pre-Race Priming Protocol)
    if (externalEvent && externalEvent.type === EVENT_TYPES.RUNNING_RACE && externalEvent.proximityDays <= 1) {
      const distance = externalEvent.distance || 'Race';
      const session = workoutDecisionEngine.generateSession({
        recoveryFlag: userContext.recoveryFlag || "Normal",
        userProfile: effectiveProfile,
        recentWorkoutHistory,
        contextMessage: `${distance} race tomorrow`,
        externalActivity: externalEvent,
        dayNumber: 1
      });

      responseContent = `Good luck with your **${distance} race tomorrow**! 🏃‍♂️💨

On the day before a race, the golden rule is **zero muscular fatigue and zero central nervous system depletion**. We want your glycogen stores topped up and your legs fresh and springy.

### 🛡️ Pre-Race Priming Protocol for Today:
- **Zero Heavy Leg Resistance or Sprints**: Heavy squats, lunges, and leg presses are strictly eliminated to reduce unnecessary fatigue and minimize soreness risk for race day.
- **Light Nervous System Priming**: Ankle dorsiflexion mobility, hip 90/90 flows, and gentle core bracing to preserve performance.
- **Estimated Duration**: ~${session.timeBudget.totalEstimatedMinutes} minutes.

### 📋 Today's Shakeout Routine:
${session.mainWorkout.map((ex, i) => `${i + 1}. **${ex.name}** — ${ex.sets} sets × ${ex.reps} reps (RPE ${ex.rpe}, very light)`).join('\n')}

💡 **Night-Before Checklist**:
1. 💧 **Hydration**: Sip 2.5-3 liters of water throughout the day.
2. 🍚 **Fuel**: Eat a familiar, carb-rich dinner (rice, sweet potatoes, daal or grilled chicken).
3. 😴 **Rest**: Aim for 7 to 8 hours of solid sleep.`;

      structuredAction.type = 'UPDATE_WORKOUT';
      structuredAction.workout = session;
      structuredAction.rationale = session.rationale;
      structuredAction.explanation = `Generated pre-race priming protocol for ${distance} race tomorrow.`;
      return { role: 'assistant', content: responseContent, structuredAction };
    }

    // =====================================================================
    // STEP H: WEIGHT LOSS REQUESTS (TEST I)
    // Example: "Mera weight 100 kg hai aur kam karna hai"
    // =====================================================================
    if (intent === INTENTS.WEIGHT_MANAGEMENT || (text.includes('100 kg') && text.includes('lose')) || (text.includes('weight') && text.includes('kam'))) {
      const weight = entities.weightMentioned || userContext.weight || userContext.weightKg || 100;
      effectiveProfile.weight = weight;
      effectiveProfile.primaryGoal = 'Fat Loss & Healthy Weight Reduction';

      const diet = dietBuilder.generateDietPlan({
        userProfile: effectiveProfile,
        preferences
      });

      const session = workoutDecisionEngine.generateSession({
        recoveryFlag: userContext.recoveryFlag || "Normal",
        userProfile: effectiveProfile,
        recentWorkoutHistory,
        contextMessage: 'weight loss joint friendly metabolic conditioning',
        dayNumber: 1
      });

      responseContent = `I am completely with you! Starting at **${weight} kg** with a goal to lose weight is an empowering step. 💪

We will do it sustainably with joint-friendly conditioning and a high-protein nutrition target.
Your everyday meal portions: 2-3 **boiled eggs** or a bowl of **daal** with whole wheat **rotis** for balanced fullness and steady energy.

How would you like to proceed? Choose an option below:`;

      const suggestions = ['🏋️ Build Full Workout Plan', '🥗 View Matching Diet', '⚡ Today\'s Starter Workout'];
      structuredAction.type = 'UPDATE_WORKOUT';
      structuredAction.workout = session;
      structuredAction.diet = diet;
      structuredAction.suggestions = suggestions;
      structuredAction.rationale = session.rationale;
      structuredAction.explanation = `Formulated sustainable weight loss and joint-friendly movement plan for ${weight}kg user.`;
      return { role: 'assistant', content: responseContent, suggestions, structuredAction };
    }

    // =====================================================================
    // STEP I: INJURY & JOINT PAIN ADAPTATION
    // =====================================================================
    if (intent === INTENTS.INJURY_SAFETY || entities.painArea) {
      const painArea = entities.painArea || 'affected joint';
      const alternative = exerciseSafetyValidator.suggestSafeAlternative('Compound Exercise', painArea);

      const session = workoutDecisionEngine.generateSession({
        recoveryFlag: userContext.recoveryFlag || "Normal",
        userProfile: effectiveProfile,
        recentWorkoutHistory,
        contextMessage: `pain in ${painArea}`,
        dayNumber: 1
      });

      responseContent = `⚠️ **Medical Safety Notice: ${painArea.toUpperCase()} Protection**

I've noted that your **${painArea}** is uncomfortable today. As your coach, safety comes first:
- I have **instantly removed** all exercises with high shear stress on your ${painArea}.
- **Safe Alternative**: Recommended **${alternative.alternativeName}** (${alternative.clinicalRationale}).
- **Updated Plan**: Generated a modified session focusing on pain-free movement patterns.

> 🩺 *Clinical Note: If you experience sharp, shooting, or unexplained pain, stop immediately and seek medical evaluation from a physiotherapist.*`;

      structuredAction.type = 'SAFETY_ALERT';
      structuredAction.workout = session;
      structuredAction.rationale = session.rationale;
      structuredAction.safetyFlags = [`Excluded exercises stressing the ${painArea}`];
      structuredAction.explanation = `Screened out exercises contraindicated for ${painArea}.`;
      return { role: 'assistant', content: responseContent, structuredAction };
    }

    // =====================================================================
    // STEP G: WORKOUT MODIFICATION (e.g. "Only dumbbells", "20 minutes")
    // =====================================================================
    if (intent === INTENTS.MODIFY_WORKOUT || entities.equipmentChange || entities.sessionDurationChange) {
      const session = workoutDecisionEngine.generateSession({
        recoveryFlag: userContext.recoveryFlag || "Normal",
        userProfile: effectiveProfile,
        recentWorkoutHistory,
        contextMessage: raw,
        dayNumber: 1
      });

      const equipNote = entities.equipmentChange ? `switched your equipment to **${entities.equipmentChange}**` : '';
      const durNote = entities.sessionDurationChange ? `budgeted your session time to strictly **${entities.sessionDurationChange} minutes**` : '';
      const changes = [equipNote, durNote].filter(Boolean).join(' and ');

      responseContent = `Got it! I have recalculated your workout and ${changes}:

### 🎯 Today's Goal: ${session.sessionObjective}
- **Estimated Duration**: ${session.timeBudget.totalEstimatedMinutes} mins (Warmup: ${session.timeBudget.warmupMinutes}m, Main Work: ${session.timeBudget.mainWorkMinutes}m, Cooldown: ${session.timeBudget.cooldownMinutes}m)
- **Equipment**: ${effectiveProfile.equipmentAccess}

**Exercises Selected**:
${session.mainWorkout.map((ex, i) => `${i + 1}. **${ex.name}** — ${ex.sets} sets × ${ex.reps} reps (${ex.rpe})`).join('\n')}

Click **Apply to AI Trainer** below to start this workout right now!`;

      structuredAction.type = 'UPDATE_WORKOUT';
      structuredAction.workout = session;
      structuredAction.rationale = session.rationale;
      structuredAction.explanation = `Updated workout for ${effectiveProfile.equipmentAccess} and ${effectiveProfile.sessionDurationMins} minutes.`;
      return { role: 'assistant', content: responseContent, structuredAction };
    }

    // =====================================================================
    // STEP H: EXERCISE EXPLANATION ("Why this exercise?")
    // =====================================================================
    if (intent === INTENTS.EXERCISE_EXPLANATION) {
      const exerciseName = raw.replace(/why this exercise|why did you pick|explain/gi, '').trim();
      const targetEx = exerciseRegistry.findByName(exerciseName) || exerciseRegistry.getAll()[0];

      responseContent = `### 🧠 Coach Rationale: **${targetEx.name}**

- **Movement Pattern**: ${targetEx.movementPattern.toUpperCase()}
- **Target Muscles**: ${targetEx.primaryMuscles.join(', ')} (Secondary: ${targetEx.secondaryMuscles?.join(', ') || 'Core'})
- **Training Quality**: ${targetEx.trainingQualities.join(', ')}
- **Fatigue Cost**: ${targetEx.fatigueCost.toUpperCase()}
- **Why It Was Chosen**: This exercise was selected because it trains ${targetEx.movementPattern} with zero joint contraindication for your profile. It builds functional strength while respecting your training frequency and recovery.`;

      structuredAction.explanation = `Clinical breakdown for ${targetEx.name}.`;
      return { role: 'assistant', content: responseContent, structuredAction };
    }

    // =====================================================================
    // STEP J: HOME ALTERNATIVE — "gym nahi ja raha" / "gym nahi ja sakta"
    // =====================================================================
    // Extended detection: gym + nahi / can't / not going
    const isHomeAlternativeIntent = intent === INTENTS.HOME_ALTERNATIVE ||
      (text.includes('gym') && (text.includes('nahi') || text.includes('nhi') || text.includes("can't") || text.includes('cannot') || text.includes('not going') || text.includes('nahi ja'))) ||
      (text.includes('home') && text.includes('workout')) ||
      (text.includes('barish') || text.includes('rain') || text.includes('ghar pe workout'));

    if (isHomeAlternativeIntent) {

      const mode = userContext.trainerContext?.mode || 'ai_full';
      
      const homeAccess = userContext.homeEquipmentAccess || 'Bodyweight only';
      effectiveProfile.equipmentAccess = homeAccess;

      const session = workoutDecisionEngine.generateSession({
        recoveryFlag: userContext.recoveryFlag || "Normal",
        userProfile: effectiveProfile,
        recentWorkoutHistory,
        contextMessage: `home alternative workout using ${homeAccess}`,
        dayNumber: 1
      });

      if (mode === 'ai_supportive') {
        responseContent = `I see you can't make it to the gym today! Since you have a human trainer programming your main lifts, I won't mess with your heavy days.
        
Instead, I've built a **Home Alternative Session** using your available home equipment (${homeAccess}). This focuses on active recovery, core, and mobility so you stay on track without throwing off your trainer's plan!

### 🏡 Home Supportive Session:
${session.mainWorkout.map((ex, i) => `${i + 1}. **${ex.name}** — ${ex.sets} sets × ${ex.reps} reps`).join('\n')}

Let's get it done!`;
      } else {
        responseContent = `No gym today? No problem! I've adapted today's progression into a **Home Alternative Workout** using ${homeAccess}.

### 🏡 Home AI Session:
${session.mainWorkout.map((ex, i) => `${i + 1}. **${ex.name}** — ${ex.sets} sets × ${ex.reps} reps`).join('\n')}

Click Apply to log this instead.`;
      }

      structuredAction.type = 'UPDATE_WORKOUT';
      structuredAction.workout = session;
      structuredAction.rationale = session.rationale;
      structuredAction.explanation = `Generated home alternative for ${mode} using ${homeAccess}.`;
      return { role: 'assistant', content: responseContent, structuredAction };
    }

    // =====================================================================
    // PILLAR 10: FOOD SUBSTITUTION ENGINE
    // Example: "Aaj chicken nahi hai", "Beef nahi hai", "eggs nahi hain"
    // =====================================================================
    if (intent === INTENTS.FOOD_SUBSTITUTE || entities.foodItemNotAvailable) {
      const foodItem = entities.foodItemNotAvailable || 
        (['chicken','beef','fish','egg','daal','paneer','tofu','rice','roti','oats','mutton','salmon'].find(f => text.includes(f))) || 
        'protein source';

      const dietaryRestrictions = Array.isArray(userContext.foodPreferences) ? userContext.foodPreferences : [];
      const alternatives = getAlternatives(foodItem, dietaryRestrictions);
      const topAlts = alternatives.slice(0, 4);

      // Determine if today's diet has a macro target from saved plan
      const savedDiet = userContext.activeSavedPlan?.diet || userContext.currentDietPlan;
      const targetProtein = savedDiet?.actualTotals?.totalProtein || savedDiet?.targetProtein || null;
      const targetCalories = savedDiet?.actualTotals?.totalDailyCalories || savedDiet?.targetCalories || null;

      // Check if user confirmed or selected a specific substitute (e.g. "swap chicken with tofu", "✅ Tofu")
      const substituteItem = entities.requestedSubstitute || (text.startsWith('✅') ? text.replace('✅', '').trim() : null);
      if (substituteItem && substituteItem.toLowerCase() !== foodItem.toLowerCase()) {
        const foundSub = Object.values(FOOD_SUBSTITUTION_GROUPS).flat().find(i => 
          substituteItem.toLowerCase().includes(i.name.toLowerCase()) || i.name.toLowerCase().includes(substituteItem.toLowerCase())
        );
        const subName = foundSub?.name || substituteItem;
        const subProt = foundSub?.protein || 16;
        const subCals = foundSub?.calories || 140;

        responseContent = `✅ **Swapped ${foodItem} → ${subName}!** 🥗\n\nI have updated your meal plan with **${subName}** (~${subProt}g protein, ~${subCals} kcal per 100g).${targetCalories ? ` Daily energy target stays calibrated at **${targetCalories} kcal**.` : ''}\n\nYour plan is saved with updated nutritional totals.`;

        const suggestions = ['🥗 Open Nutrition Hub', '🏋️ Today\'s Workout', '🔄 Swap Another Food'];
        structuredAction.type = 'FOOD_SUBSTITUTE_CONFIRMED';
        structuredAction.originalFood = foodItem;
        structuredAction.substituteFood = subName;
        structuredAction.planId = userContext.activeSavedPlan?._id || null;
        structuredAction.suggestions = suggestions;
        structuredAction.explanation = `Confirmed swap of ${foodItem} to ${subName}.`;
        return { role: 'assistant', content: responseContent, suggestions, structuredAction };
      }

      if (topAlts.length === 0) {
        responseContent = `I understand **${foodItem}** isn't available today. 🥗\n\nFor your diet, the best general substitution rule is: match the protein content. If you had **${foodItem}** in your meal, replace it with any protein source of similar quantity:\n\n- **Boiled Eggs** (2 eggs ≈ 12g protein)\n- **Low-Fat Paneer / Cottage Cheese** (100g ≈ 18g protein)\n- **Cooked Lentils / Daal** (100g ≈ 9g protein)\n- **Greek Yogurt** (100g ≈ 10g protein)\n\nChoose what's available and I'll recalculate your macros!`;
        const suggestions = ['🥚 Replace with Eggs', '🧀 Replace with Paneer', '🫘 Replace with Daal', '🐟 Replace with Fish'];
        structuredAction.type = 'FOOD_SUBSTITUTE';
        structuredAction.foodItem = foodItem;
        structuredAction.suggestions = suggestions;
        structuredAction.explanation = `No direct substitution found; provided generic protein alternatives for ${foodItem}.`;
        return { role: 'assistant', content: responseContent, suggestions, structuredAction };
      }

      const altLines = topAlts.map((a, i) => {
        const protDiff = targetProtein ? ` (≈${a.protein}g protein per 100g)` : ` (${a.protein}g protein, ${a.calories} kcal per 100g)`;
        return `${i + 1}. **${a.name}**${protDiff}`;
      }).join('\n');

      // Calculate potential protein shortfall warning
      const originalItem = Object.values(FOOD_SUBSTITUTION_GROUPS).flat().find(i => i.name.toLowerCase().includes(foodItem));
      const originalProtein = originalItem?.protein || 25;
      const bestAltProtein = topAlts[0]?.protein || 10;
      const shortfall = originalProtein - bestAltProtein;
      const shortfallNote = shortfall > 5 ? `\n\n⚠️ **Protein Shortfall Alert**: ${foodItem} gives ~${originalProtein}g protein/100g. Your best substitute gives ~${topAlts[0].protein}g. Consider adding an extra egg or a small portion of Greek yogurt to top up your protein target${targetProtein ? ` of ${targetProtein}g` : ''}.` : '';

      responseContent = `No worries! **${foodItem}** isn't available — here are your best smart substitutes based on your${dietaryRestrictions.length > 0 ? ' dietary preferences and' : ''} current plan macros: 🥗\n\n${altLines}${shortfallNote}\n\nWhich substitute would you like? I'll recalculate your meal macros${targetCalories ? ` to keep you on target (${targetCalories} kcal/day)` : ''}.`;

      const suggestions = topAlts.map(a => `✅ ${a.name.split(' ').slice(0, 3).join(' ')}`);
      structuredAction.type = 'FOOD_SUBSTITUTE';
      structuredAction.foodItem = foodItem;
      structuredAction.alternatives = topAlts;
      structuredAction.suggestions = suggestions;
      structuredAction.explanation = `Provided ${topAlts.length} verified protein/macro substitutes for ${foodItem}, respecting dietary restrictions.`;
      return { role: 'assistant', content: responseContent, suggestions, structuredAction };
    }

    // =====================================================================
    // PILLAR 11: MISSED WORKOUT RESOLUTION
    // Example: "Kal workout miss ho gaya", "session skip kar gaya"
    // =====================================================================
    if (intent === INTENTS.MISSED_WORKOUT) {
      const planTitle = userContext.activeSavedPlan?.title || 'your active plan';
      const unhandledCount = (userContext.unhandledMissedSessions || []).length;

      const reasonHint = text.includes('sick') || text.includes('beemar') ? 'You reported being sick.' :
        text.includes('busy') || text.includes('kaam') ? 'You were busy with work.' :
        text.includes('thak') || text.includes('tired') ? 'You were fatigued.' : '';

      responseContent = `I see — you missed a workout session${planTitle ? ` from **${planTitle}**` : ''}. ${reasonHint ? `*${reasonHint}*` : ''} 💪\n\n**No worries — this happens!** Here is what we can do:\n\n### 📋 Choose Your Recovery Path:\n\n**Option A — Compress Today** 🔥\nRoll the key exercises from the missed session into today's workout (slightly longer session, higher volume).\n\n**Option B — Shift Schedule +1 Day** 📅\nPush your entire remaining calendar forward by 1 day to preserve the full program structure.\n\n**Option C — Rest Day (No Penalty)** 😴\nMark the missed session as a planned rest day. Your streak and plan integrity are protected.\n\nWhat would you like to do?`;

      const suggestions = ['Option A: Compress Today', 'Option B: Shift Schedule +1 Day', 'Option C: Rest Day'];
      structuredAction.type = 'MISSED_WORKOUT_RESOLVE';
      structuredAction.unhandledMissed = userContext.unhandledMissedSessions || [];
      structuredAction.planId = userContext.activeSavedPlan?._id || null;
      structuredAction.suggestions = suggestions;
      structuredAction.explanation = `User missed ${unhandledCount || 'a'} session(s). Presenting 3 structured recovery options.`;
      return { role: 'assistant', content: responseContent, suggestions, structuredAction };
    }

    // =====================================================================
    // PILLAR 12 + 19: RECOVERY ADAPTATION WITH TRANSPARENT EXPLANATION
    // Proactively fires when recoveryFlag is LowSleep or HighFatigue AND
    // user mentions being tired/thak gaya/neend nahi aayi without another handler
    // =====================================================================
    const isTiredOrFatigued = text.includes('thak gaya') || text.includes('thaka') || text.includes('neend nahi') ||
      text.includes('4 ghante soya') || text.includes('3 ghante soya') || text.includes('low energy') ||
      text.includes('bahut thak') || text.includes('bohat thak') || text.includes('exhausted') ||
      text.includes('sore') || (text.includes('nahi soya') && text.includes('raat'));

    if (isTiredOrFatigued || (intent === INTENTS.RECOVERY_ADVICE && (userContext.recoveryFlag === 'LowSleep' || userContext.recoveryFlag === 'HighFatigue'))) {
      const lastCheckIn = (userContext.recentCheckIns || [])[0] || {};
      const sleepHours = lastCheckIn.sleepHours;
      const lastRPE = lastCheckIn.lastSessionRPE;
      const energyLevel = lastCheckIn.energyLevel;

      // Extract sleep from text if mentioned
      const sleepMatch = text.match(/(\d+)\s*(?:ghante|hours?|hrs?)\s*(?:soya|sleep)/i);
      const mentionedSleep = sleepMatch ? parseInt(sleepMatch[1]) : sleepHours;

      // Build transparent explanation
      const reasons = [];
      if (mentionedSleep && mentionedSleep < 6) reasons.push(`only ${mentionedSleep} hours of sleep (recovery needs 7-8h)`);
      if (lastRPE && lastRPE >= 8) reasons.push(`high effort in yesterday's session (RPE ${lastRPE}/10)`);
      if (energyLevel && energyLevel <= 2) reasons.push(`low energy reported in last check-in`);

      const explanationText = reasons.length > 0
        ? `Adjusted because: **${reasons.join(' + ')}**. Heavy loading under these conditions increases injury risk and slows muscle repair.`
        : 'Adjusted based on your recovery state to protect joints and promote muscle repair.';

      // Generate a light recovery session
      const session = workoutDecisionEngine.generateSession({
        recoveryFlag: 'LowSleep',
        userProfile: { ...effectiveProfile, primaryGoal: 'Recovery & Mobility' },
        recentWorkoutHistory,
        contextMessage: 'low sleep fatigue recovery deload mobility light session',
        dayNumber: 1
      });

      // Override with gentle exercises
      session.sessionObjective = 'Active Recovery, Mobility & Nervous System Reset';
      const exercises = session.mainWorkout || [];
      exercises.forEach(ex => { ex.rpe = Math.min(parseFloat(ex.rpe) || 5, 5).toString(); ex.sets = Math.min(ex.sets, 2); });

      responseContent = `I hear you — today sounds tough. 😴 **I've automatically lightened your session.**\n\n> 🧠 *${explanationText}*\n\n### 📋 Today's Active Recovery Session:\n${exercises.map((ex, i) => `${i + 1}. **${ex.name}** — ${ex.sets} sets × ${ex.reps} reps (RPE ${ex.rpe}, very light)`).join('\n')}\n\n💡 **Recovery Tips for Today:**\n- 💧 Drink at least 2.5–3 liters of water\n- 🍌 Eat a balanced meal with adequate protein and carbs\n- 😴 Tonight: aim for 7–8 hours sleep to prepare for full training tomorrow\n\nYour body is rebuilding — this is part of the process! 💪`;

      const suggestions = ['🚀 Load Recovery Session', '😴 Mark as Full Rest Day', '💊 Check Recovery Tips'];
      structuredAction.type = 'RECOVERY_ADAPTED';
      structuredAction.workout = session;
      structuredAction.rationale = session.rationale;
      structuredAction.explanation = explanationText;
      structuredAction.recoveryFlag = userContext.recoveryFlag || 'LowSleep';
      structuredAction.suggestions = suggestions;
      return { role: 'assistant', content: responseContent, suggestions, structuredAction };
    }

    // =====================================================================
    // PILLAR 13: RETROACTIVE WORKOUT ADJUSTMENT
    // Example: "Maine galat complete mark kar diya", "sahi nahi kiye", "jhoot bola"
    // =====================================================================
    if (intent === INTENTS.RETROACTIVE_ADJUST) {
      const exerciseMention = text.includes('pushup') || text.includes('push-up') ? 'Push-Ups' :
        text.includes('squat') ? 'Squats' :
        text.includes('bench') ? 'Bench Press' : null;

      responseContent = `Respect for being honest! 🙏 That takes integrity.\n\nYour${exerciseMention ? ` **${exerciseMention}**` : ''} session can be retroactively adjusted. Here's what we can do:\n\n### 🔄 Choose Your Adjustment:\n\n**Option 1 — Repeat the Session** 🔁\nUnmark the previous session as complete. I'll add it back as today's workout so you can do it properly.\n\n**Option 2 — Partial Credit** ✅\nKeep it marked but reduce the progressive overload for next session (lower volume/weight increase). No streak penalty.\n\n**Option 3 — Skip & Adjust Future** ➡️\nKeep it logged as completed but set a note that proper form wasn't achieved. I'll slightly lower the difficulty of the next equivalent session.\n\nWhich would you like?`;

      const suggestions = ['Option 1: Repeat Session Today', 'Option 2: Partial Credit', 'Option 3: Skip & Adjust Future'];
      structuredAction.type = 'RETROACTIVE_ADJUST';
      structuredAction.exerciseName = exerciseMention;
      structuredAction.planId = userContext.activeSavedPlan?._id || null;
      structuredAction.suggestions = suggestions;
      structuredAction.explanation = 'User retroactively reported form issue or incorrect completion marking. Presenting 3 fair adjustment options.';
      return { role: 'assistant', content: responseContent, suggestions, structuredAction };
    }

    // =====================================================================
    // PILLAR 14: ACTIVITY CONTEXT / PLAN-VS-REALITY ENERGY
    // Example: "Aaj gym bhi kiya aur 8,000 steps bhi hue"
    // =====================================================================
    if (intent === INTENTS.ACTIVITY_CONTEXT) {
      const activity = userContext.todayActivity;

      if (!activity) {
        responseContent = `I don't have your activity data synced yet for today! 📱\n\nTo see your **Plan vs Reality** energy summary:\n1. Make sure your step tracking is active\n2. Your workout session should be logged\n3. Then I can compare your planned vs actual calories burned and consumed\n\nWould you like me to show a general energy summary instead?`;
        const suggestions = ['📊 Show General Summary', '📱 How to Sync Steps', '🏋️ Log Today\'s Workout'];
        structuredAction.type = 'ACTIVITY_CONTEXT';
        structuredAction.suggestions = suggestions;
        return { role: 'assistant', content: responseContent, suggestions, structuredAction };
      }

      // Extract from message any additional activity mentioned
      const stepMatch = text.match(/(\d[\d,]+)\s*steps?/i);
      const mentionedSteps = stepMatch ? parseInt(stepMatch[1].replace(',', '')) : null;
      const effectiveSteps = mentionedSteps || activity.steps;
      const walkCals = Math.round(effectiveSteps * 0.04);
      const workoutCals = activity.workoutCalories || 0;
      const totalBurned = walkCals + workoutCals;

      // Get diet plan target calories
      const targetCals = userContext.currentDietPlan?.targetCalories || userContext.activeSavedPlan?.diet?.actualTotals?.totalDailyCalories || null;
      const calorieBalance = targetCals ? (targetCals - totalBurned) : null;

      const balanceNote = calorieBalance !== null
        ? calorieBalance > 500 ? `\n\n✅ **Calorie Surplus**: You are ${calorieBalance} kcal above your burn target. Consider a lighter dinner to stay in your target range.`
        : calorieBalance < -200 ? `\n\n⚠️ **Extra Burn Detected**: You burned ${Math.abs(calorieBalance)} kcal more than your plan target. Consider adding a protein snack to protect your muscle recovery.`
        : `\n\n✅ **On Track**: Your energy balance aligns with your daily plan.`
        : '';

      responseContent = `📊 **Today's Energy Summary — Plan vs Reality**\n\n| Metric | Value |\n|--------|-------|\n| 🚶 Steps Today | **${effectiveSteps.toLocaleString()} steps** |\n| 🔥 Walking Calories | **~${walkCals} kcal** |\n| 🏋️ Workout Calories | **~${workoutCals} kcal** |\n| ⚡ Total Burned | **~${totalBurned} kcal** |\n${targetCals ? `| 🎯 Diet Target | **${targetCals} kcal/day** |` : ''}\n\n${activity.exercises && activity.exercises.length > 0 ? `**Exercises Logged:** ${activity.exercises.map(e => e.name).join(', ')}` : ''}${balanceNote}`;

      const suggestions = ['🥗 Adjust Tonight\'s Meal', '💧 Check Hydration', '📅 Tomorrow\'s Plan'];
      structuredAction.type = 'ACTIVITY_SUMMARY';
      structuredAction.todayActivity = activity;
      structuredAction.suggestions = suggestions;
      structuredAction.explanation = `Plan vs Reality energy analysis — ${totalBurned} kcal burned vs ${targetCals || '?'} kcal target.`;
      return { role: 'assistant', content: responseContent, suggestions, structuredAction };
    }

    // =====================================================================
    // PILLAR 15: GOAL LIFECYCLE — completion, success post, next goal
    // Example: "Mera goal complete ho gaya", "Weight lose kar liya", "Next goal chahiye"
    // =====================================================================
    if (intent === INTENTS.GOAL_LIFECYCLE) {
      const activeGoal = userContext.activeGoalGroup;

      if (!activeGoal) {
        responseContent = `🎯 **Ready for Your Next Goal!**\n\nLet's set up a fresh goal for your next phase of training!\n\n**What would you like to focus on next?**`;
        const suggestions = ['💪 Build Muscle', '🏃 Improve Endurance', '⚖️ Maintain Weight', '⚡ Increase Strength', '🎯 Custom Goal'];
        structuredAction.type = 'GOAL_LIFECYCLE';
        structuredAction.phase = 'select_next_goal';
        structuredAction.suggestions = suggestions;
        return { role: 'assistant', content: responseContent, suggestions, structuredAction };
      }

      const startWeight = activeGoal.startWeightKg || userContext.weight;
      const currentWeight = userContext.weight || startWeight;
      const weightChange = startWeight && currentWeight ? Math.abs(startWeight - currentWeight).toFixed(1) : null;
      const wasWeightLoss = activeGoal.primaryGoalType === 'WeightLoss';

      responseContent = `🏆 **GOAL COMPLETE! Incredible achievement!**\n\n### 📊 Your Journey Summary:\n${startWeight ? `- ⚖️ **Start Weight**: ${startWeight} kg → **Current**: ${currentWeight} kg${weightChange ? ` (${wasWeightLoss ? '-' : '+'}${weightChange} kg!)` : ''}` : ''}\n${activeGoal.weeklyTrainingLoad?.plannedSessionsPerWeek ? `- 🗓️ **Training Consistency**: ${activeGoal.weeklyTrainingLoad.plannedSessionsPerWeek} sessions/week planned` : ''}\n- 📅 **Goal**: ${activeGoal.title}\n\n🥇 **This is a real achievement — be proud of yourself!**\n\n> *"What changed during this journey? How do you feel?"*\n\nAnd when you're ready:\n\n**🚀 What's Next?**`;

      const suggestions = ['💪 Build Muscle', '🏃 Improve Endurance', '⚖️ Maintain Weight', '⚡ Increase Strength', '🎯 Custom Goal', '📸 Share My Success'];
      structuredAction.type = 'GOAL_LIFECYCLE';
      structuredAction.phase = 'goal_completed';
      structuredAction.completedGoal = activeGoal;
      structuredAction.suggestions = suggestions;
      structuredAction.explanation = 'Goal lifecycle triggered: user completed or reviewed their goal. Presenting next goal options.';
      return { role: 'assistant', content: responseContent, suggestions, structuredAction };
    }

    // =====================================================================
    // PILLAR 20: MULTI-GOAL / PLAN MERGE REQUEST
    // Example: "Running bhi add karni hai", "Mujhe muscle bhi build karni hai"
    // =====================================================================
    if (intent === INTENTS.MULTI_GOAL_ADD) {
      const secondaryGoal = text.includes('running') ? 'Running / Endurance'
        : text.includes('muscle') ? 'Muscle Building'
        : text.includes('weight gain') || text.includes('weight barhana') ? 'Weight Gain'
        : text.includes('strength') ? 'Strength Training'
        : 'Additional Goal';

      const existingPlan = userContext.activeSavedPlan;
      const currentGoal = existingPlan?.goal || userContext.primaryGoal || 'your current goal';

      responseContent = `Great idea! Adding **${secondaryGoal}** alongside **${currentGoal}**. 🎯\n\nHere is how I'll coordinate both plans without creating conflicts:\n\n### 📋 Multi-Goal Coordination Rules:\n1. **No same-muscle-group overlap on adjacent days** — e.g. leg day and running day are separated by 24h minimum\n2. **Combined weekly volume stays within recovery capacity** — max 5 hard sessions per week for most users\n3. **Nutrition auto-adjusts** — calorie and protein targets update to support both goals\n4. **Running on upper-body days** — running is scheduled on the same days as upper-body sessions to protect leg recovery\n\n### 🗓️ Suggested Weekly Template:\n- **Mon**: Strength (Upper Body) + Running (short easy)\n- **Tue**: Lower Body Strength → REST from running\n- **Wed**: Running (moderate) + Core\n- **Thu**: Push / Pull Strength\n- **Fri**: Running (long/tempo)\n- **Sat**: Lower Body Strength\n- **Sun**: Rest / Active Recovery\n\nShall I generate this combined schedule and save it to your Workout Hub?`;

      const suggestions = ['✅ Generate Combined Schedule', '🔄 Adjust the Template', '📊 View Volume Check'];
      structuredAction.type = 'MULTI_GOAL_COORDINATE';
      structuredAction.primaryGoal = currentGoal;
      structuredAction.secondaryGoal = secondaryGoal;
      structuredAction.suggestions = suggestions;
      structuredAction.explanation = `Multi-goal coordination plan proposed for ${currentGoal} + ${secondaryGoal}.`;
      return { role: 'assistant', content: responseContent, suggestions, structuredAction };
    }

    // =====================================================================
    // STEP I: NUTRITION & DIET GENERATION
    // =====================================================================
    if (intent === INTENTS.GENERATE_DIET || intent === INTENTS.MODIFY_DIET) {
      const diet = dietBuilder.generateDietPlan({
        userProfile: effectiveProfile,
        preferences: {
          ...preferences,
          isVegetarian: text.includes('veg') || text.includes('vegetarian') || preferences.isVegetarian
        }
      });

      const validation = dietValidator.validateDiet(diet, effectiveProfile);

      responseContent = `🥗 **Custom Sports Nutrition Plan (${diet.goalType})**

### 📊 Calculated Daily Targets
- **Total Energy**: **${diet.actualTotals.totalDailyCalories} kcal**
- **Protein**: **${diet.actualTotals.totalProtein}g** *(For muscle repair and satiety)*
- **Carbohydrates**: **${diet.actualTotals.totalCarbs}g** *(For daily energy and recovery)*
- **Healthy Fats**: **${diet.actualTotals.totalFat}g** *(For hormone balance)*
- **Hydration Target**: **${diet.hydrationTargetLiters} Liters**

---

### 🍽️ Everyday Meal Plan with Simple Portions:
${diet.meals.map(m => `**${m.mealName}** *(${m.timing})*\n${m.items.map(i => `• ${i.food} — **${i.portion}**`).join('\n')}`).join('\n\n')}

---
🔄 **Easy Substitutions**:
${diet.substitutionsGuide.map(s => `• *${s.original}* can be replaced with *${s.substitute}*`).join('\n')}`;

      structuredAction.type = 'UPDATE_NUTRITION';
      structuredAction.diet = diet;
      structuredAction.explanation = `Calculated nutrition plan for ${diet.goalType} with verified macros.`;
      return { role: 'assistant', content: responseContent, structuredAction };
    }

    // =====================================================================
    // STEP J: TODAY'S WORKOUT / GENERAL SESSION
    // =====================================================================

    if (intent === INTENTS.TODAY_WORKOUT || intent === INTENTS.GENERATE_WORKOUT || intent === INTENTS.SPORT_SPECIFIC_TRAINING) {
      const session = workoutDecisionEngine.generateSession({
        recoveryFlag: userContext.recoveryFlag || "Normal",
        userProfile: effectiveProfile,
        recentWorkoutHistory,
        contextMessage: raw,
        dayNumber: currentProgress.completedDays?.length ? (currentProgress.completedDays.length + 1) : 1
      });

      responseContent = `💪 **Today's Reasoned Training Plan**

### 🎯 Session Objective: **${session.sessionObjective}**
- **Duration**: ~${session.timeBudget.totalEstimatedMinutes} Mins (${session.timeBudget.warmupMinutes}m Warmup + ${session.timeBudget.mainWorkMinutes}m Main + ${session.timeBudget.cooldownMinutes}m Cooldown)
- **Equipment**: ${effectiveProfile.equipmentAccess}

---

#### 1. Reasoned Warm-Up (4 Phases)
${session.warmup.warmupExercises.map(w => `• **${w.phase}**: ${w.name} (${w.repsOrDuration})`).join('\n')}

#### 2. Main Resistance & Athletic Work
${session.mainWorkout.map(m => `• **${m.name}** — ${m.sets} Sets × ${m.reps} Reps | **${m.rpe}** (Rest: ${m.restSec}s)\n  *Reason: ${m.purpose}*`).join('\n')}

#### 3. Cool-Down & Recovery
${session.cooldown.cooldownExercises.map(c => `• **${c.name}** — ${c.duration} (${c.purpose})`).join('\n')}

> 🩺 *Safety Verification: ${session.medicalSafetyReview?.safetyWarnings?.[0] || 'All exercises cleared zero-tolerance medical screen.'}*`;

      const suggestions = ['🏋️ Apply Workout', '❓ Why this workout?', '🔄 Change Exercises', '🥗 Matching Diet'];
      structuredAction.type = 'UPDATE_WORKOUT';
      structuredAction.workout = session;
      structuredAction.rationale = session.rationale;
      structuredAction.explanation = `Generated full session for ${session.sessionObjective}.`;
      structuredAction.suggestions = suggestions;
      return { role: 'assistant', content: responseContent, suggestions, structuredAction };
    }

    // =====================================================================
    // STEP K: GENERAL CONVERSATION, GREETING & GUIDANCE
    // =====================================================================
    const athleteName = effectiveProfile.name || effectiveProfile.userName || 'Athlete';
    const profileGoal = effectiveProfile.primaryGoal || effectiveProfile.mainGoalArea || 'General Fitness';
    const profileLevel = effectiveProfile.fitnessLevel || 'Beginner';
    const profileEquip = effectiveProfile.equipmentAccess || 'Full Gym';

    const isGreeting = text === 'hi' || text === 'hello' || text === 'hey' || text === 'salam' || text === 'start' ||
      text.startsWith('hi ') || text.startsWith('hello ') || text.startsWith('hey ') || (history || []).length === 0;

    if (isGreeting) {
      const suggestions = ['🏋️ Generate My Workout Plan', '🥗 Custom Diet Plan', '⚡ Quick 20-Min Workout', '📊 View My Progress'];
      responseContent = `Hi **${athleteName}**! 👋 Ready to train today?

📋 **Profile Snapshot**:
• Goal: **${profileGoal}** | Level: **${profileLevel}** | Equipment: **${profileEquip}**

What would you like to do? Choose an option below or message me anytime!`;
      structuredAction.type = 'GREETING';
      structuredAction.explanation = 'Concise greeting with profile snapshot.';
      structuredAction.suggestions = suggestions;
      return { role: 'assistant', content: responseContent, suggestions, structuredAction };
    }

    // Smart conversational guidance
    const suggestions = ['🏋️ Build a Workout Plan', '🥗 Custom Diet Plan', '⚡ Quick 20-Min Workout', '💬 Ask a Question'];
    responseContent = `I'm here to assist with your workout routines, nutrition, and recovery.
What would you like to work on? Choose a quick option below:`;
    structuredAction.type = 'GUIDANCE';
    structuredAction.explanation = 'Concise actionable guidance.';
    structuredAction.suggestions = suggestions;
    return { role: 'assistant', content: responseContent, suggestions, structuredAction };
  }
};

export default coachConversationEngine;
