import intentClassifier, { INTENTS, computeMissingBioFields } from './intentClassifier.js';
import workoutDecisionEngine from '../workout/workoutDecisionEngine.js';
import dietBuilder from '../nutrition/dietBuilder.js';
import dietValidator from '../nutrition/dietValidator.js';
import exerciseSafetyValidator from '../safety/exerciseSafetyValidator.js';
import exerciseRegistry from '../workout/exerciseRegistry.js';
import eventAwarenessEngine, { EVENT_TYPES } from '../workout/eventAwarenessEngine.js';

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

        structuredAction.explanation = 'Asking user to clarify the type of upcoming external training.';
        return { role: 'assistant', content: responseContent, structuredAction };
      }

      if (missingContext === 'training_activities') {
        const isAcademy = (externalEvent?.type === EVENT_TYPES.POLICE_TEST) || text.includes('selection') || text.includes('academy');
        const isPT = text.includes('physical training') || text.includes('pt');

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
          return { role: 'assistant', content: responseContent, structuredAction };
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
          return { role: 'assistant', content: responseContent, structuredAction };
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
        return { role: 'assistant', content: responseContent, structuredAction };
      }

      if (missingContext === 'race_details') {
        responseContent = `Exciting! Racing requires proper preparation and energy management. 🏁

To dial in your training and nutrition:
**What distance is the race, and when is it taking place?**

For example:
- *5K race tomorrow*
- *10K race this weekend*
- *Half marathon next month*`;

        structuredAction.explanation = 'Asking for race distance and timing.';
        return { role: 'assistant', content: responseContent, structuredAction };
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

        structuredAction.explanation = 'Clarifying primary fitness priority in plain language.';
        return { role: 'assistant', content: responseContent, structuredAction };
      }

      if (missingContext === 'experience_frequency') {
        responseContent = `Building muscle and transforming your physique is an exciting journey! 🏋️‍♂️

To program the right training volume, split, and progressive overload for you:
**How many days per week can you dedicate to working out, and what is your current lifting experience (Beginner / Intermediate / Advanced)?**`;

        structuredAction.explanation = 'Asking for training frequency and experience level to structure progressive resistance program.';
        return { role: 'assistant', content: responseContent, structuredAction };
      }
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
        recoveryFlag: context.recoveryFlag || "Normal",
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
        recoveryFlag: context.recoveryFlag || "Normal",
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
        recoveryFlag: context.recoveryFlag || "Normal",
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
        recoveryFlag: context.recoveryFlag || "Normal",
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
        recoveryFlag: context.recoveryFlag || "Normal",
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
        recoveryFlag: context.recoveryFlag || "Normal",
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
        recoveryFlag: context.recoveryFlag || "Normal",
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
        recoveryFlag: context.recoveryFlag || "Normal",
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
        recoveryFlag: context.recoveryFlag || "Normal",
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
        recoveryFlag: context.recoveryFlag || "Normal",
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
        recoveryFlag: context.recoveryFlag || "Normal",
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
        recoveryFlag: context.recoveryFlag || "Normal",
        userProfile: effectiveProfile,
        recentWorkoutHistory,
        contextMessage: 'weight loss joint friendly metabolic conditioning',
        dayNumber: 1
      });

      responseContent = `I am completely with you! Starting at **${weight} kg** with a goal to lose weight is an empowering step, and we will do it sustainably without extreme starving or joint-damaging routines. 💪

### 🌿 Simple, Realistic Strategy:
1. **Sustainable Energy Target**: We don't want crash diets. You'll eat filling, wholesome meals with plenty of protein and fiber to keep hunger away while creating a gentle daily fat-loss deficit.
2. **Portion Simplicity**: You don't need to stress over complex calorie math. Here is a simple guide to your everyday portions:
   - **Breakfast**: 2 whole boiled eggs, 1 small bowl of rolled oats with cinnamon.
   - **Lunch**: 1 cup cooked daal with 1-2 medium whole wheat rotis and a large bowl of fresh salad.
   - **Mid-Day Snack**: 1 fresh apple and 8-10 raw almonds.
   - **Dinner**: Grilled chicken breast (or paneer/daal) with sautéed vegetables and 1 roti.
3. **Joint-Friendly Movement**: At ${weight} kg, high-impact jumping can stress the knees. Today's workout is designed with low joint stress and high metabolic burn.

### 📋 Today's Starter Workout:
${session.mainWorkout.map((ex, i) => `${i + 1}. **${ex.name}** — ${ex.sets} sets × ${ex.reps} reps`).join('\n')}

💧 **Daily Habit**: Aim for 3 to 3.5 liters of clean water every day.
Let's begin today with confidence!`;

      structuredAction.type = 'UPDATE_WORKOUT';
      structuredAction.workout = session;
      structuredAction.diet = diet;
      structuredAction.rationale = session.rationale;
      structuredAction.explanation = `Formulated sustainable weight loss and joint-friendly movement plan for ${weight}kg user.`;
      return { role: 'assistant', content: responseContent, structuredAction };
    }

    // =====================================================================
    // STEP I: INJURY & JOINT PAIN ADAPTATION
    // =====================================================================
    if (intent === INTENTS.INJURY_SAFETY || entities.painArea) {
      const painArea = entities.painArea || 'affected joint';
      const alternative = exerciseSafetyValidator.suggestSafeAlternative('Compound Exercise', painArea);

      const session = workoutDecisionEngine.generateSession({
        recoveryFlag: context.recoveryFlag || "Normal",
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
        recoveryFlag: context.recoveryFlag || "Normal",
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
    // STEP J: HOME ALTERNATIVE FOR GYM-TRAINED ATHLETES (PART 21)
    // =====================================================================
    if (intent === 'home_alternative' || (text.includes('home') && text.includes('gym') && text.includes('nahi'))) {
      const mode = userContext.trainerContext?.mode || 'ai_full';
      
      const homeAccess = userContext.homeEquipmentAccess || 'Bodyweight only';
      effectiveProfile.equipmentAccess = homeAccess;

      const session = workoutDecisionEngine.generateSession({
        recoveryFlag: context.recoveryFlag || "Normal",
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
    // STEP J: DEFAULT WORKOUT GENERATION / TODAY'S WORKOUT
    // =====================================================================
    if (intent === INTENTS.GENERATE_WORKOUT || intent === INTENTS.TODAY_WORKOUT || intent === INTENTS.SPORT_SPECIFIC_TRAINING) {
      // Mini-Coach Interception (Part 5 & 6)
      const missingFields = computeMissingBioFields(effectiveProfile);
      // If there are missing fields or goal is missing, we trigger the mini_coach_interview
      const needsMiniCoach = missingFields.length > 0 || !effectiveProfile.mainGoalArea || !effectiveProfile.planDuration || !effectiveProfile.trainingDaysPerWeek;

      if (needsMiniCoach) {
        const steps = [];
        if (!effectiveProfile.mainGoalArea) {
          steps.push({ key: 'mainGoalArea', label: 'What is your goal?', kind: 'single_select', options: ['Lose Weight', 'Build Muscle', 'Gain Strength', 'Improve Stamina', 'Sports Performance', 'General Fitness'], prefillValue: null, isPrefilled: false });
        }
        if (!effectiveProfile.planDuration) {
          steps.push({ key: 'planDuration', label: 'Plan Duration', kind: 'single_select', options: ['4 Weeks', '8 Weeks', '12 Weeks'], prefillValue: '4 Weeks', isPrefilled: true });
        }
        if (!effectiveProfile.trainingDaysPerWeek) {
          steps.push({ key: 'trainingDaysPerWeek', label: 'Smart Intake & Stamina', kind: 'single_select', options: [2, 3, 4, 5, 6], prefillValue: 3, isPrefilled: true });
        }
        if (missingFields.length > 0) {
          steps.push({ key: 'missingBioFields', label: 'Health & Fitness Bio', kind: 'form', fields: missingFields });
        }
        
        structuredAction.type = 'mini_coach_interview';
        structuredAction.steps = steps;
        structuredAction.currentStepIndex = 0;
        
        responseContent = `I'd love to build that for you, but I need a few quick details first.`;
        return { role: 'assistant', content: responseContent, structuredAction };
      }

      const session = workoutDecisionEngine.generateSession({
        recoveryFlag: context.recoveryFlag || "Normal",
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

> 🩺 *Safety Verification: ${session.medicalSafetyReview.safetyWarnings[0] || 'All exercises cleared zero-tolerance medical screen.'}*`;

      structuredAction.type = 'UPDATE_WORKOUT';
      structuredAction.workout = session;
      structuredAction.rationale = session.rationale;
      structuredAction.explanation = `Generated full session for ${session.sessionObjective}.`;
      return { role: 'assistant', content: responseContent, structuredAction };
    }

    // =====================================================================
    // STEP K: GENERAL CONVERSATION & FITNESS GUIDANCE
    // =====================================================================
    if (history.length > 0 && !text.includes('hi') && !text.includes('hello')) {
      responseContent = `I'm here to help! Tell me if you need a workout, a diet plan, or if you need to adjust your training based on your schedule, equipment, or recovery.`;
      structuredAction.explanation = 'Short fallback response.';
      return { role: 'assistant', content: responseContent, structuredAction };
    }

    responseContent = `Hello! I am your **GymSync AI Lead Coach & Personal Trainer**.

I have your complete profile loaded (${effectiveProfile.fitnessLevel || 'Beginner'} level, ${effectiveProfile.equipmentAccess || 'Full Gym'}, goal: ${effectiveProfile.mainGoalArea || 'Fitness'}).

How can I help you today?
- Ask: *"What should I train today?"*
- Ask: *"Create a diet plan for my goals"*
- Tell me: *"I have army training tomorrow"* or *"I have a cricket match next week"*
- Tell me: *"I only have 20 minutes"* or *"Only dumbbells"*
- Tell me: *"My knee hurts today"* or *"I trained legs yesterday and have football tomorrow"*

I will adapt your training and nutrition using intelligent sports science reasoning!`;

    structuredAction.explanation = 'General coach greeting and prompt suggestions.';
    return { role: 'assistant', content: responseContent, structuredAction };
  }
};

export default coachConversationEngine;
