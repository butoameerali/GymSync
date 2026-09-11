import eventAwarenessEngine, { EVENT_TYPES } from '../workout/eventAwarenessEngine.js';
import { getMissingFields } from './userKnowledgeState.js';

/**
 * NLP Intent Classifier & Entity Extractor for GymSync AI Coach
 * Parses incoming user messages, context, and conversation history into structured actions
 * and parameters for the deterministic engines.
 */

export const INTENTS = {
  GENERATE_WORKOUT: 'generate_workout',
  MODIFY_WORKOUT: 'modify_workout',
  GENERATE_DIET: 'generate_diet',
  MODIFY_DIET: 'modify_diet',
  EXERCISE_EXPLANATION: 'exercise_explanation',
  RECOVERY_ADVICE: 'recovery_advice',
  INJURY_SAFETY: 'injury_safety',
  PROGRESS_REVIEW: 'progress_review',
  TODAY_WORKOUT: 'today_workout',
  SPORT_SPECIFIC_TRAINING: 'sport_specific_training',
  EVENT_WORKLOAD: 'event_workload',
  VAGUE_GOAL: 'vague_goal',
  WEIGHT_MANAGEMENT: 'weight_management',
  WORKLOAD_CONFLICT: 'workload_conflict',
  CLARIFICATION_RESPONSE: 'clarification_response',
  FITNESS_QUESTION: 'fitness_question',
  HOME_ALTERNATIVE: 'home_alternative'
};

export function computeMissingBioFields(bio) {
  const allBioKeys = ['height', 'weight', 'gender', 'jointPain', 'medicalConditions', 'injuries', 'limitations', 'foodPreferences', 'trainingDaysPerWeek', 'equipmentAccess'];
  return getMissingFields({ bioData: bio }, allBioKeys);
}

export const intentClassifier = {
  /**
   * Classify intent and extract entities from message, history, and user context
   *
   * @param {string} message - Current user message
   * @param {Array} history - Previous conversation messages
   * @param {Object} userContext - Bio data and preferences
   * @returns {Object} { intent, entities, clarificationNeeded, missingContext }
   */
  classify(message = '', history = [], userContext = {}) {
    const raw = (message || '').trim();
    const text = raw.toLowerCase();

    // Check last assistant message in history to detect ongoing clarification loops
    const lastAssistantMsg = [...(history || [])]
      .reverse()
      .find(m => m.role === 'assistant' || m.sender === 'other' || m.sender === 'assistant');
    const lastPrompt = (lastAssistantMsg?.content || lastAssistantMsg?.text || '').toLowerCase();

    // 1. Detect External Event
    const detectedEvent = eventAwarenessEngine.detectEvent(raw, history);

    // Check conversation history for match or event memory and prior parameters
    const historyText = (history || []).map(h => (h.content || h.text || '')).join(' ').toLowerCase();
    const fullContext = `${historyText} ${text}`;

    // Extract Entities
    const entities = {
      equipmentChange: null,
      sessionDurationChange: null,
      painArea: null,
      hasMatchTomorrow: false,
      requestedExercise: null,
      wantsDiet: false,
      wantsWorkout: false,
      isLegFocus: false,
      isUpperFocus: false,
      externalEvent: detectedEvent,
      weightMentioned: null,
      morningHeavyLegs: false,
      priorClarificationTopic: null
    };

    // Check prior assistant question context
    if (lastPrompt.includes('what type of training is it') || lastPrompt.includes('kis tarah ki training')) {
      entities.priorClarificationTopic = 'training_type';
    } else if (lastPrompt.includes('what does tomorrow\'s training involve') ||
               lastPrompt.includes('what does tomorrow\'s session involve') ||
               lastPrompt.includes('what activities does tomorrow\'s selection test involve') ||
               lastPrompt.includes('what does the physical training involve') ||
               lastPrompt.includes('kya kya shamil hai')) {
      entities.priorClarificationTopic = 'training_activities';
    } else if (lastPrompt.includes('what distance is the race') || lastPrompt.includes('when is it')) {
      entities.priorClarificationTopic = 'race_details';
    } else if (lastPrompt.includes('sabse zyada kis cheez ko improve') ||
               lastPrompt.includes('what is your top priority right now') ||
               lastPrompt.includes('prioritize right now') ||
               lastPrompt.includes('which one matters most')) {
      entities.priorClarificationTopic = 'goal_priority';
    } else if (lastPrompt.includes('how many days per week') || lastPrompt.includes('training experience')) {
      entities.priorClarificationTopic = 'experience_frequency';
    }

    // Weight extraction (e.g., "100 kg", "95kg", "80 kgs", "mera weight 100 kg hai")
    const weightMatch = text.match(/(\d{2,3})\s*(kg|kgs|kilos|kilo)?/i);
    if (weightMatch && (text.includes('weight') || text.includes('vajan') || text.includes('weigh') || text.includes('kg'))) {
      const num = parseInt(weightMatch[1], 10);
      if (num >= 40 && num <= 250) {
        entities.weightMentioned = num;
      }
    }

    if (fullContext.includes('match tomorrow') || fullContext.includes('game tomorrow') || fullContext.includes('tournament tomorrow')) {
      entities.hasMatchTomorrow = true;
    }

    // Equipment extraction (Current turn, fallback to history)
    if (text.includes('dumbbell only') || text.includes('only have dumbbells') || text.includes('just dumbbells') || text.includes('with dumbbells') || text.includes('only dumbbells')) {
      entities.equipmentChange = 'Dumbbells';
    } else if (text.includes('no equipment') || text.includes('bodyweight only') || text.includes('at home without weights')) {
      entities.equipmentChange = 'Bodyweight';
    } else if (text.includes('full gym') || text.includes('in the gym') || text.includes('access to gym')) {
      entities.equipmentChange = 'Full Gym';
    } else {
      // Retain from history across conversational turns
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].sender === 'other' || history[i].role === 'ai' || history[i].role === 'assistant') continue;
        const msg = (history[i].content || history[i].text || '').toLowerCase();
        if (msg.includes('dumbbell only') || msg.includes('only dumbbells') || msg.includes('just dumbbells') || msg.includes('with dumbbells') || msg.includes('only have dumbbells')) {
          entities.equipmentChange = 'Dumbbells';
          break;
        } else if (msg.includes('no equipment') || msg.includes('bodyweight only') || msg.includes('at home without weights')) {
          entities.equipmentChange = 'Bodyweight';
          break;
        } else if (msg.includes('full gym') || msg.includes('in the gym')) {
          entities.equipmentChange = 'Full Gym';
          break;
        }
      }
    }

    // Duration extraction (Current turn, fallback to history)
    const minMatch = text.match(/(\d+)\s*(mins?|minutes?)/i);
    if (minMatch) {
      entities.sessionDurationChange = parseInt(minMatch[1], 10);
    } else if (text.includes('half an hour') || text.includes('half hour')) {
      entities.sessionDurationChange = 30;
    } else {
      // Retain from history across conversational turns
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].sender === 'other' || history[i].role === 'ai' || history[i].role === 'assistant') continue;
        const msg = (history[i].content || history[i].text || '').toLowerCase();
        const mMatch = msg.match(/(\d+)\s*(mins?|minutes?)/i);
        if (mMatch) {
          entities.sessionDurationChange = parseInt(mMatch[1], 10);
          break;
        } else if (msg.includes('half an hour') || msg.includes('half hour')) {
          entities.sessionDurationChange = 30;
          break;
        }
      }
    }

    // Joint Pain / Injury extraction (Accumulate current turn and history)
    const jointKeywords = ['knee', 'knees', 'shoulder', 'shoulders', 'lower back', 'lowerback', 'back', 'neck', 'wrist', 'wrists', 'ankle', 'ankles', 'hip', 'hips'];
    for (const joint of jointKeywords) {
      if (text.includes(joint) && (text.includes('pain') || text.includes('hurt') || text.includes('hurts') || text.includes('ache') || text.includes('sore') || text.includes('injury') || text.includes('uncomfortable') || text.includes('discomfort'))) {
        entities.painArea = joint.replace(/\s+/g, '');
        break;
      }
    }

    // Focus area
    if (text.includes('leg') || text.includes('legs') || text.includes('squat')) {
      entities.isLegFocus = true;
    }
    if (text.includes('upper') || text.includes('chest') || text.includes('arm') || text.includes('shoulder')) {
      entities.isUpperFocus = true;
    }

    // Check for Today Morning Heavy Legs (e.g. "Waise maine aaj subah heavy legs bhi kiye hain")
    const mentionsMorningHeavyLegs = text.includes('aaj subah heavy legs') ||
      text.includes('subah heavy legs') ||
      text.includes('heavy legs this morning') ||
      text.includes('heavy legs today') ||
      (text.includes('subah') && (text.includes('heavy legs') || text.includes('leg'))) ||
      (text.includes('morning') && (text.includes('heavy legs') || (text.includes('trained') && text.includes('legs'))));

    if (mentionsMorningHeavyLegs) {
      entities.morningHeavyLegs = true;
    }

    // 2. Classify Intent
    let intent = INTENTS.FITNESS_QUESTION;
    let clarificationNeeded = false;
    let missingContext = null;

    // Morning heavy legs workload update
    if (mentionsMorningHeavyLegs) {
      intent = INTENTS.WORKLOAD_CONFLICT;
      return { intent, entities, clarificationNeeded: false, missingContext: null };
    }

    // Check for multi-turn workload conflict (e.g. yesterday legs in turn 1, tomorrow football in turn 2)
    const mentionsTrainedYesterday = fullContext.includes('trained legs very hard yesterday') ||
      fullContext.includes('trained legs heavily yesterday') ||
      fullContext.includes('heavy legs yesterday') ||
      (fullContext.includes('yesterday') && (fullContext.includes('leg') || fullContext.includes('legs') || fullContext.includes('squat') || fullContext.includes('squats')));
    const mentionsTomorrowWorkload = fullContext.includes('football practice') ||
      fullContext.includes('football match') ||
      (fullContext.includes('tomorrow') && (fullContext.includes('football') || fullContext.includes('match') || fullContext.includes('race') || fullContext.includes('training') || fullContext.includes('practice')));

    if (mentionsTrainedYesterday && mentionsTomorrowWorkload) {
      intent = INTENTS.WORKLOAD_CONFLICT;
      return { intent, entities, clarificationNeeded: false, missingContext: null };
    }

    // If answering previous coach clarification prompt
    if (entities.priorClarificationTopic) {
      intent = INTENTS.CLARIFICATION_RESPONSE;
      return { intent, entities, clarificationNeeded: false, missingContext: null };
    }

    // Injury / Pain always takes top priority
    if (entities.painArea) {
      intent = INTENTS.INJURY_SAFETY;
      return { intent, entities, clarificationNeeded: false, missingContext: null };
    }

    // Check for Vague Training announcement (e.g. "Kal meri training hai", "I have training tomorrow")
    const isVagueTraining = (
      text === 'kal meri training hai' || text === 'kal meri training hai.' ||
      text.includes('kal meri training hai') || text.includes('meri training hai') ||
      text === 'i have training tomorrow' || text === 'i have training tomorrow.' ||
      text.startsWith('i have training tomorrow') || text.includes('have training tomorrow')
    ) && !text.includes('army') && !text.includes('cricket') && !text.includes('football') &&
       !text.includes('running') && !text.includes('race') && !text.includes('selection') &&
       !text.includes('academy') && !text.includes('police') && !text.includes('gym');

    if (isVagueTraining) {
      intent = INTENTS.EVENT_WORKLOAD;
      clarificationNeeded = true;
      missingContext = 'training_type';
      return { intent, entities, clarificationNeeded, missingContext };
    }

    // Check for Vague Physical Training (e.g. "Bas physical training", "Physical training")
    const isVaguePT = text === 'bas physical training' || text === 'bas physical training.' ||
      text === 'physical training' || text === 'physical training.' ||
      text === 'just physical training' || text === 'only physical training';

    if (isVaguePT) {
      intent = INTENTS.EVENT_WORKLOAD;
      clarificationNeeded = true;
      missingContext = 'training_activities';
      return { intent, entities, clarificationNeeded, missingContext };
    }

    // Check for Vague Race announcement (e.g. "Kal race hai", "I have a race" without distance)
    const isRaceMentioned = text.includes('race') || text.includes('marathon');
    const hasRaceDistance = Boolean(text.match(/\b(5k|10k|21k|42k|half marathon|marathon|100m|200m|400m|800m|1600m|1 mile)\b/i));
    if (isRaceMentioned && !hasRaceDistance) {
      intent = INTENTS.EVENT_WORKLOAD;
      clarificationNeeded = true;
      missingContext = 'race_details';
      return { intent, entities, clarificationNeeded, missingContext };
    }

    // Check for Vague Goals (e.g. "Mujhe fit hona hai", "I want to get fit", "I need stamina")
    const isVagueGoal = text === 'mujhe fit hona hai' || text === 'mujhe fit hona hai.' ||
      text === 'fit hona hai' || text === 'fit hona hai.' || text === 'fit rehna hai' ||
      text === 'fitness chahiye' ||
      text === 'i want to get fit' || text === 'i want to get fit.' ||
      text === 'i need to get fit' || text === 'i need stamina' ||
      text === 'i want stamina' || text === 'mujhe stamina chahiye' || text === 'get fit';

    if (isVagueGoal) {
      intent = INTENTS.VAGUE_GOAL;
      clarificationNeeded = true;
      missingContext = 'goal_priority';
      return { intent, entities, clarificationNeeded, missingContext };
    }

    // Check for Muscle Building Goal (e.g. "Mujhe body banani hai", "I want to build my body")
    const isMuscleGoal = text === 'mujhe body banani hai' || text === 'mujhe body banani hai.' ||
      text === 'body banani hai' || text === 'body banani hai.' ||
      text === 'i want to build my body' || text === 'i want to build my body.' ||
      text === 'i want to build muscle' || text === 'build my body';

    if (isMuscleGoal) {
      // If user profile has experience and days, we can generate a structured program;
      // If not, ask for training frequency and experience
      const hasExperience = Boolean(userContext.fitnessLevel && userContext.trainingDaysPerWeek);
      if (!hasExperience) {
        intent = INTENTS.VAGUE_GOAL;
        clarificationNeeded = true;
        missingContext = 'experience_frequency';
        return { intent, entities, clarificationNeeded, missingContext };
      }
      intent = INTENTS.GENERATE_WORKOUT;
      return { intent, entities, clarificationNeeded: false, missingContext: null };
    }

    // Weight loss statement with or without weight
    if (entities.weightMentioned || (text.includes('lose') && (text.includes('weight') || text.includes('fat') || text.includes('it'))) ||
        (text.includes('weight') && (text.includes('kam') || text.includes('ghatana') || text.includes('reduce')))) {
      intent = INTENTS.WEIGHT_MANAGEMENT;
      return { intent, entities, clarificationNeeded: false, missingContext: null };
    }

    // External Event Workload (Cricket, Football, 5K race, Army, Academy Selection, Construction, etc.)
    if (detectedEvent) {
      // Physical Job is occupational fatigue today, not pre-event tomorrow
      if (detectedEvent.type === EVENT_TYPES.PHYSICAL_LABOR) {
        intent = INTENTS.EVENT_WORKLOAD;
        return { intent, entities, clarificationNeeded: false, missingContext: null };
      }

      // If army/police/academy selection test announced, check if activities are known
      if ((detectedEvent.type === EVENT_TYPES.ARMY_TRAINING || detectedEvent.type === EVENT_TYPES.POLICE_TEST) &&
          detectedEvent.expectedActivities.length === 0) {
        intent = INTENTS.EVENT_WORKLOAD;
        clarificationNeeded = true;
        missingContext = 'training_activities';
        return { intent, entities, clarificationNeeded, missingContext };
      }

      // If race without distance
      if (detectedEvent.type === EVENT_TYPES.RUNNING_RACE && !detectedEvent.distance) {
        intent = INTENTS.EVENT_WORKLOAD;
        clarificationNeeded = true;
        missingContext = 'race_details';
        return { intent, entities, clarificationNeeded, missingContext };
      }

      // If general training without type
      if (detectedEvent.type === EVENT_TYPES.GENERAL_SPORTS && detectedEvent.expectedActivities.length === 0) {
        intent = INTENTS.EVENT_WORKLOAD;
        clarificationNeeded = true;
        missingContext = 'training_type';
        return { intent, entities, clarificationNeeded, missingContext };
      }

      intent = INTENTS.EVENT_WORKLOAD;
      return { intent, entities, clarificationNeeded: false, missingContext: null };
    }

    // Exercise explanation
    if (text.includes('why this exercise') || text.includes('why did you pick') || text.includes('why was this selected') || text.includes('explain this exercise')) {
      intent = INTENTS.EXERCISE_EXPLANATION;
      return { intent, entities, clarificationNeeded: false, missingContext: null };
    }

    // Modify workout (equipment/time changes)
    if (text.includes('replace this') || text.includes('change exercise') || text.includes('swap exercise') ||
        (entities.equipmentChange && (text.includes('dumbbell') || text.includes('bodyweight') || text.includes('gym'))) ||
        (entities.sessionDurationChange && (text.includes('min') || text.includes('hour')))) {
      intent = INTENTS.MODIFY_WORKOUT;
      return { intent, entities, clarificationNeeded: false, missingContext: null };
    }

    // Diet generation / modification
    if (text.includes('diet') || text.includes('meal') || text.includes('food') || text.includes('calorie') || text.includes('what should i eat') || text.includes('nutrition')) {
      if (text.includes('modify') || text.includes('replace') || text.includes('substitute') || text.includes('vegetarian')) {
        intent = INTENTS.MODIFY_DIET;
      } else {
        intent = INTENTS.GENERATE_DIET;
      }
      return { intent, entities, clarificationNeeded: false, missingContext: null };
    }

    // Sport-specific request
    if (text.includes('cricket') || text.includes('football') || text.includes('running') || text.includes('marathon') || text.includes('boxer') || text.includes('boxing')) {
      intent = INTENTS.SPORT_SPECIFIC_TRAINING;
      return { intent, entities, clarificationNeeded: false, missingContext: null };
    }

    // Today's workout
    if (text.includes('today') && (text.includes('workout') || text.includes('train') || text.includes('what should i do'))) {
      intent = INTENTS.TODAY_WORKOUT;
      return { intent, entities, clarificationNeeded: false, missingContext: null };
    }

    // General workout request
    if (text.includes('workout') || text.includes('routine') || text.includes('schedule') || text.includes('plan') || text.includes('train')) {
      intent = INTENTS.GENERATE_WORKOUT;
      return { intent, entities, clarificationNeeded: false, missingContext: null };
    }

    // Recovery advice
    if (text.includes('recovery') || text.includes('rest') || text.includes('sore') || text.includes('tired') || text.includes('fatigue')) {
      intent = INTENTS.RECOVERY_ADVICE;
      return { intent, entities, clarificationNeeded: false, missingContext: null };
    }

    // Progress review
    if (text.includes('progress') || text.includes('streak') || text.includes('how am i doing')) {
      intent = INTENTS.PROGRESS_REVIEW;
      return { intent, entities, clarificationNeeded: false, missingContext: null };
    }

    return {
      intent,
      entities,
      clarificationNeeded: false,
      missingContext: null
    };
  }
};

export default intentClassifier;
