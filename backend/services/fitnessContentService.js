import PreMadePlan from '../models/PreMadePlan.js';
import Article from '../models/Article.js';
import Exercise from '../models/Exercise.js';

/**
 * fitnessContentService
 * Authoritative content retrieval layer connecting instructor-created exercises,
 * workout programs, diet templates, and educational articles to the AI Trainer (Qwen)
 * and trainee catalogues.
 */

// Helper to escape regex special characters
const escapeRegex = (str) => (str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * 1. Find relevant published workout programs
 */
export const findRelevantPrograms = async ({
  query = '',
  goal = '',
  difficulty = '',
  sport = '',
  equipment = '',
  limit = 4,
  onlyPublished = true
} = {}) => {
  try {
    const filter = { type: { $in: ['Workout', 'workout'] } };
    if (onlyPublished) {
      filter.status = 'published';
    }

    const conditions = [];

    if (goal && goal !== 'General' && goal !== 'General Fitness') {
      const gRegex = new RegExp(escapeRegex(goal), 'i');
      conditions.push({ $or: [{ goal: gRegex }, { category: gRegex }, { title: gRegex }] });
    }

    if (difficulty && difficulty !== 'All Levels') {
      conditions.push({ $or: [{ difficulty }, { difficulty: 'All Levels' }] });
    }

    if (sport) {
      const sRegex = new RegExp(escapeRegex(sport), 'i');
      conditions.push({ $or: [{ sportTags: sRegex }, { title: sRegex }, { description: sRegex }] });
    }

    if (equipment && equipment !== 'Full Gym') {
      const eRegex = new RegExp(escapeRegex(equipment), 'i');
      conditions.push({ $or: [{ equipmentRequired: eRegex }, { description: eRegex }] });
    }

    if (query && query.trim()) {
      const qClean = query.trim();
      const stopWords = /^(the|and|for|with|this|that|from|have|what|when|where|which|who|whom|whose|why|how|all|any|both|each|few|more|most|other|some|such|than|too|very|can|will|just|should|now|kal|aaj|hai|hain|mujhe|chahiye|mera|meri|karo|batao|bata|dena|karna|mein|par|koi|acha|kuch|give|need|want)$/i;
      const words = qClean.split(/[\s,?.!]+/).filter(w => w.length >= 3 && !stopWords.test(w));
      
      const queryOrBranches = [
        { title: new RegExp(escapeRegex(qClean), 'i') },
        { description: new RegExp(escapeRegex(qClean), 'i') }
      ];

      if (words.length > 0) {
        words.forEach(w => {
          const wRegex = new RegExp(escapeRegex(w), 'i');
          queryOrBranches.push(
            { title: wRegex },
            { description: wRegex },
            { goal: wRegex },
            { category: wRegex },
            { sportTags: wRegex }
          );
        });
      }

      conditions.push({ $or: queryOrBranches });
    }

    if (conditions.length > 0) {
      filter.$and = conditions;
    }

    const programs = await PreMadePlan.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 2) // Fetch candidate pool for scoring
      .lean();

    const mappedPrograms = programs.map(p => ({
      _id: p._id,
      id: p._id,
      title: p.title,
      sourceType: 'instructor_program',
      sourceId: p._id.toString(),
      sourceTitle: p.title,
      instructor: p.authorName || p.author || p.createdBy || 'Certified Instructor',
      sourceAttribution: {
        sourceType: 'instructor_program',
        sourceId: p._id.toString(),
        sourceTitle: p.title,
        instructor: p.authorName || p.author || p.createdBy || 'Certified Instructor'
      },
      goal: p.goal || p.category,
      difficulty: p.difficulty,
      durationWeeks: p.durationWeeks || 4,
      daysPerWeek: p.daysPerWeek || 4,
      description: p.description,
      weeks: p.weeks || [],
      sportTags: p.sportTags || [],
      equipmentRequired: p.equipmentRequired || [],
      version: p.version || 1
    }));

    // Rank candidate programs using multi-factor scoring
    return rankProgramCandidates(mappedPrograms, { query, goal, sport, equipment, fitnessLevel: difficulty }).slice(0, limit);
  } catch (error) {
    console.error('fitnessContentService.findRelevantPrograms Error:', error);
    return [];
  }
};

/**
 * Multi-factor Scoring Algorithm for Candidate Workout Programs:
 * - Goal match: +30
 * - Sport match: +30
 * - Match-day / primer match: +20
 * - Equipment match: +10
 * - Difficulty match: +5
 */
export const rankProgramCandidates = (programs, { query = '', goal = '', sport = '', equipment = '', fitnessLevel = '' } = {}) => {
  const lowerQuery = (query || '').toLowerCase();
  const lowerGoal = (goal || '').toLowerCase();
  const lowerSport = (sport || '').toLowerCase();
  const isMatchOrPrimer = /match|game|tournament|primer|activation|cricket|football|tennis/i.test(lowerQuery);

  return [...programs].map(prog => {
    let score = 0;
    const pTitle = (prog.title || '').toLowerCase();
    const pGoal = (prog.goal || '').toLowerCase();
    const pDesc = (prog.description || '').toLowerCase();
    const pTags = (prog.sportTags || []).map(t => t.toLowerCase());
    const pEquip = (prog.equipmentRequired || []).map(e => e.toLowerCase());

    // 1. Goal Match: +30
    if (lowerGoal && (pGoal.includes(lowerGoal) || pTitle.includes(lowerGoal))) {
      score += 30;
    }

    // 2. Sport Match: +30
    if (lowerSport && (pTags.some(t => t.includes(lowerSport)) || pTitle.includes(lowerSport) || pDesc.includes(lowerSport))) {
      score += 30;
    }

    // 3. Match-Day / Event Primer Match: +20
    if (isMatchOrPrimer) {
      const hasPrimer = (prog.weeks || []).some(w =>
        (w.days || []).some(d => /primer|agility|speed|match|activation/i.test(d.focus || d.title || ''))
      );
      if (hasPrimer || /match|primer|cricket|football|speed/i.test(pTitle)) {
        score += 20;
      }
    }

    // 4. Equipment Match: +10
    if (equipment && equipment !== 'Full Gym') {
      const lowerEq = equipment.toLowerCase();
      if (pEquip.some(e => lowerEq.includes(e)) || pDesc.includes(lowerEq)) {
        score += 10;
      }
    } else {
      score += 5;
    }

    // 5. Difficulty / Fitness Level Match: +5
    if (fitnessLevel && prog.difficulty && prog.difficulty.toLowerCase() === fitnessLevel.toLowerCase()) {
      score += 5;
    }

    return { ...prog, matchScore: score };
  }).sort((a, b) => b.matchScore - a.matchScore);
};

/**
 * 2. Find relevant published diet templates
 */
export const findRelevantDietTemplates = async ({
  query = '',
  goal = '',
  dietaryType = '',
  targetCalories = null,
  allergies = [],
  limit = 4,
  onlyPublished = true
} = {}) => {
  try {
    const filter = { type: { $in: ['Diet', 'diet'] } };
    if (onlyPublished) {
      filter.status = 'published';
    }

    const conditions = [];

    if (goal && goal !== 'General' && goal !== 'General Fitness') {
      const gRegex = new RegExp(escapeRegex(goal), 'i');
      conditions.push({ $or: [{ goal: gRegex }, { category: gRegex }, { title: gRegex }] });
    }

    if (dietaryType && dietaryType !== 'Balanced') {
      const dRegex = new RegExp(escapeRegex(dietaryType), 'i');
      conditions.push({ $or: [{ dietaryType: dRegex }, { title: dRegex }] });
    }

    if (query && query.trim()) {
      const qRegex = new RegExp(escapeRegex(query.trim()), 'i');
      conditions.push({
        $or: [
          { title: qRegex },
          { description: qRegex },
          { goal: qRegex },
          { category: qRegex }
        ]
      });
    }

    if (targetCalories && targetCalories > 500) {
      conditions.push({
        calories: {
          $gte: Math.round(targetCalories * 0.75),
          $lte: Math.round(targetCalories * 1.25)
        }
      });
    }

    if (allergies && allergies.length > 0) {
      // Exclude templates that contain user's allergies at template level OR food-item level
      const allergyRegexes = allergies.map(a => new RegExp(`^${escapeRegex(a)}$`, 'i'));
      conditions.push({
        allergies: { $nin: allergyRegexes },
        'meals.foodItems.allergens': { $nin: allergyRegexes }
      });
    }

    if (conditions.length > 0) {
      filter.$and = conditions;
    }

    const diets = await PreMadePlan.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();


    return diets.map(d => ({
      _id: d._id,
      id: d._id,
      title: d.title,
      sourceType: 'instructor_diet',
      sourceId: d._id.toString(),
      sourceTitle: d.title,
      instructor: d.authorName || d.author || d.createdBy || 'Certified Instructor',
      sourceAttribution: {
        sourceType: 'instructor_diet',
        sourceId: d._id.toString(),
        sourceTitle: d.title,
        instructor: d.authorName || d.author || d.createdBy || 'Certified Instructor'
      },
      goal: d.goal || d.category,
      calories: d.calories || d.targetCalories,
      protein: d.protein || d.macronutrients?.proteinGrams,
      carbs: d.carbs || d.macronutrients?.carbsGrams,
      fat: d.fat || d.macronutrients?.fatsGrams,
      dietaryType: d.dietaryType,
      description: d.description,
      meals: d.meals || [],
      allergies: d.allergies || [],
      dietaryRestrictions: d.dietaryRestrictions || [],
      version: d.version || 1
    }));
  } catch (error) {
    console.error('fitnessContentService.findRelevantDietTemplates Error:', error);
    return [];
  }
};

/**
 * 3. Find relevant published educational articles & guides
 */
export const findRelevantArticles = async ({
  query = '',
  tags = [],
  topic = '',
  topics = [],
  category = '',
  relatedExercise = '',
  exerciseId = '',
  goal = '',
  sport = '',
  limit = 4,
  onlyPublished = true
} = {}) => {
  try {
    const filter = {};
    if (onlyPublished) {
      filter.status = 'published';
    }

    const conditions = [];

    if (topic || (topics && topics.length > 0)) {
      const allTopics = [topic, ...(Array.isArray(topics) ? topics : [topics])].filter(Boolean);
      conditions.push({
        $or: [
          { topics: { $in: allTopics.map(t => new RegExp(escapeRegex(t), 'i')) } },
          { tags: { $in: allTopics.map(t => new RegExp(escapeRegex(t), 'i')) } }
        ]
      });
    }

    if (exerciseId) {
      conditions.push({
        relatedExerciseIds: exerciseId
      });
    }

    if (category && category !== 'All' && category !== 'General') {
      conditions.push({ category: new RegExp(escapeRegex(category), 'i') });
    }

    if (relatedExercise) {
      const exRegex = new RegExp(escapeRegex(relatedExercise), 'i');
      conditions.push({
        $or: [
          { title: exRegex },
          { content: exRegex },
          { relatedExerciseIds: exRegex },
          { tags: exRegex }
        ]
      });
    }

    if (tags && tags.length > 0) {
      conditions.push({
        tags: { $in: tags.map(t => new RegExp(escapeRegex(t), 'i')) }
      });
    }

    if (query && query.trim()) {
      const qRegex = new RegExp(escapeRegex(query.trim()), 'i');
      conditions.push({
        $or: [
          { title: qRegex },
          { content: qRegex },
          { tags: qRegex },
          { topics: qRegex }
        ]
      });
    }

    if (conditions.length > 0) {
      filter.$and = conditions;
    }

    const articles = await Article.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return articles.map(a => ({
      _id: a._id,
      id: a._id,
      title: a.title,
      sourceType: 'instructor_article',
      sourceId: a._id.toString(),
      sourceTitle: a.title,
      instructor: a.authorName || a.author || 'Certified Instructor',
      sourceAttribution: {
        sourceType: 'instructor_article',
        sourceId: a._id.toString(),
        sourceTitle: a.title,
        instructor: a.authorName || a.author || 'Certified Instructor'
      },
      authorRole: a.authorRole,
      category: a.category,
      readTime: a.readTime,
      tags: a.tags || [],
      topics: a.topics || [],
      contentSnippet: a.content ? a.content.substring(0, 300) + '...' : '',
      content: a.content,
      relatedExerciseIds: a.relatedExerciseIds || [],
      relatedProgramIds: a.relatedProgramIds || []
    }));
  } catch (error) {
    console.error('fitnessContentService.findRelevantArticles Error:', error);
    return [];
  }
};

/**
 * 4. Find relevant exercises from the Exercise Knowledge Base
 */
export const findRelevantExercises = async ({
  query = '',
  category = '',
  goal = '',
  equipment = '',
  sport = '',
  contraindications = [],
  limit = 8
} = {}) => {
  try {
    const filter = {
      status: 'active',
      reviewStatus: 'approved'
    };

    const conditions = [];

    if (category && category !== 'All') {
      conditions.push({ category: new RegExp(escapeRegex(category), 'i') });
    }

    if (equipment && equipment !== 'All' && equipment !== 'Full Gym') {
      conditions.push({ equipmentRequired: new RegExp(escapeRegex(equipment), 'i') });
    }

    if (sport) {
      conditions.push({ sportTags: new RegExp(escapeRegex(sport), 'i') });
    }

    if (contraindications && contraindications.length > 0) {
      // Exclude exercises contraindicated for user injuries/pain
      conditions.push({
        contraindications: { $nin: contraindications.map(c => new RegExp(escapeRegex(c), 'i')) }
      });
    }

    if (query && query.trim()) {
      const qRegex = new RegExp(escapeRegex(query.trim()), 'i');
      conditions.push({
        $or: [
          { name: qRegex },
          { targetMuscles: qRegex },
          { trainingGoals: qRegex },
          { movementPatterns: qRegex },
          { aliases: qRegex }
        ]
      });
    }

    if (conditions.length > 0) {
      filter.$and = conditions;
    }

    const exercises = await Exercise.find(filter)
      .limit(limit)
      .lean();

    return exercises.map(ex => ({
      sourceType: 'instructor_exercise',
      sourceId: ex.exerciseId,
      sourceTitle: ex.name,
      category: ex.category,
      targetMuscles: ex.targetMuscles,
      equipmentRequired: ex.equipmentRequired,
      difficulty: ex.difficulty,
      programming: ex.programming,
      coachingCues: ex.coachingCues,
      commonMistakes: ex.commonMistakes,
      regressions: ex.regressions,
      progressions: ex.progressions
    }));
  } catch (error) {
    console.error('fitnessContentService.findRelevantExercises Error:', error);
    return [];
  }
};

export const fitnessContentService = {
  findRelevantPrograms,
  findRelevantDietTemplates,
  findRelevantArticles,
  findRelevantExercises
};

export default fitnessContentService;
