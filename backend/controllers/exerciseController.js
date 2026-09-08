import Exercise from '../models/Exercise.js';
import { fetchAllExercises, insertExercise } from '../services/supabaseService.js';
import { uploadToSupabaseStorage } from '../config/supabase.js';
import exerciseRegistry from '../services/workout/exerciseRegistry.js';
import { paginateQuery } from '../utils/pagination.js';
import { apiCache } from '../utils/cache.js';

// GET /api/exercises - Public / User fetch with search, filters and optional cursor pagination
export const getAllExercises = async (req, res) => {
  try {
    const { search, category, equipment, status, includeArchived, cursor, page, limit = 24, paginate } = req.query;

    const isPaginated = paginate === 'true' || Boolean(cursor) || Boolean(page);

    if (isPaginated) {
      let mongoQuery = {};
      if (search) {
        mongoQuery.$or = [
          { name: { $regex: search, $options: 'i' } },
          { targetMuscles: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
      if (category && category !== 'All' && category !== 'Favorites') {
        mongoQuery.targetMuscles = { $regex: category, $options: 'i' };
      }
      if (equipment && equipment !== 'All') {
        if (equipment === 'No Equipment') {
          mongoQuery.equipmentRequired = { $regex: 'bodyweight|none', $options: 'i' };
        }
      }
      if (status) {
        mongoQuery.status = status;
      } else if (includeArchived !== 'true' && includeArchived !== true) {
        mongoQuery.status = { $ne: 'archived' };
      }

      // Lightweight card DTO projection
      const cardProjection = '_id exerciseId name category targetMuscles equipmentRequired difficulty mediaUrl status isAiTrackable aiDetection';

      const paginatedResult = await paginateQuery(Exercise, mongoQuery, {
        cursor,
        page,
        limit: Number(limit) || 24,
        cursorField: '_id',
        direction: -1,
        select: cardProjection
      });

      return res.status(200).json(paginatedResult);
    }

    const exercises = await fetchAllExercises({
      search,
      category,
      equipment,
      status,
      includeArchived: includeArchived === 'true' || includeArchived === true
    });
    res.status(200).json(exercises);
  } catch (error) {
    console.error('getAllExercises Error:', error);
    res.status(500).json({ error: 'Failed to fetch exercises', message: error.message });
  }
};


// GET /api/exercises/:id
export const getExerciseById = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) return res.status(404).json({ error: 'Exercise not found' });
    res.status(200).json(exercise);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exercise', message: error.message });
  }
};

// Safe certified detector allowlist matching central detector registry
const SAFE_DETECTORS = {
  'pushup_v1': '1.0',
  'running_v1': '1.0'
};

const parseArrayField = (val) => {
  if (Array.isArray(val)) return val.map(v => typeof v === 'string' ? v.trim() : v).filter(Boolean);
  if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

// POST /api/exercises (FitnessInstructor, Admin, SuperAdmin)
export const createExercise = async (req, res) => {
  try {
    const {
      exerciseId,
      name,
      category,
      targetMuscles,
      secondaryMuscles,
      equipmentRequired,
      difficulty,
      defaultSets,
      defaultReps,
      defaultDuration,
      instructions,
      fitnessPaths,
      medicalAvoidIf,
      jointPainAvoidIf,
      mediaUrl,
      thumbnailUrl,
      videoUrl,
      gifUrl,
      description,
      status,
      aiDetection,
      aliases,
      tags,
      movementPatterns,
      trainingGoals,
      trainingQualities,
      sportTags,
      experienceLevels,
      primaryPurpose,
      secondaryPurpose,
      recommendedFor,
      notRecommendedFor,
      contraindications,
      precautions,
      commonMistakes,
      regressions,
      progressions,
      alternatives,
      coachingCues,
      breathing,
      setup,
      executionSteps,
      programming,
      calorieEstimation,
      aiGeneratedMetadata,
      instructorApproved,
      reviewStatus
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Exercise name is required' });

    let parsedAiDetection = { enabled: false, detectorId: null, detectorVersion: null };
    if (aiDetection && aiDetection.enabled) {
      const detId = aiDetection.detectorId;
      if (!detId || !SAFE_DETECTORS[detId]) {
        return res.status(400).json({ error: `Invalid or unregistered detectorId '${detId}'` });
      }
      parsedAiDetection = {
        enabled: true,
        detectorId: detId,
        detectorVersion: aiDetection.detectorVersion || SAFE_DETECTORS[detId]
      };
    }

    const newId = exerciseId || `EX-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const userIdentifier = req.user?.name || req.user?.email || 'FitnessInstructor';

    const exercisePayload = {
      exerciseId: newId,
      name: name.trim(),
      category: category || 'Chest',
      targetMuscles: parseArrayField(targetMuscles),
      secondaryMuscles: parseArrayField(secondaryMuscles),
      equipmentRequired: equipmentRequired || 'Bodyweight',
      difficulty: difficulty || 'Beginner',
      defaultSets: Number(defaultSets) || 3,
      defaultReps: Number(defaultReps) || 10,
      defaultDuration: Number(defaultDuration) || 0,
      instructions: instructions || description || '',
      description: description || instructions || '',
      fitnessPaths: parseArrayField(fitnessPaths),
      medicalAvoidIf: parseArrayField(medicalAvoidIf),
      jointPainAvoidIf: parseArrayField(jointPainAvoidIf),
      mediaUrl: mediaUrl || '',
      thumbnailUrl: thumbnailUrl || '',
      videoUrl: videoUrl || '',
      gifUrl: gifUrl || '',
      aliases: parseArrayField(aliases),
      tags: parseArrayField(tags),
      movementPatterns: parseArrayField(movementPatterns),
      trainingGoals: parseArrayField(trainingGoals),
      trainingQualities: parseArrayField(trainingQualities),
      sportTags: parseArrayField(sportTags),
      experienceLevels: parseArrayField(experienceLevels),
      primaryPurpose: primaryPurpose || '',
      secondaryPurpose: secondaryPurpose || '',
      recommendedFor: parseArrayField(recommendedFor),
      notRecommendedFor: parseArrayField(notRecommendedFor),
      contraindications: parseArrayField(contraindications),
      precautions: parseArrayField(precautions),
      commonMistakes: parseArrayField(commonMistakes),
      regressions: parseArrayField(regressions),
      progressions: parseArrayField(progressions),
      alternatives: parseArrayField(alternatives),
      coachingCues: parseArrayField(coachingCues),
      breathing: breathing || '',
      setup: setup || '',
      executionSteps: parseArrayField(executionSteps),
      programming: programming || undefined,
      calorieEstimation: calorieEstimation || undefined,
      aiGeneratedMetadata: Boolean(aiGeneratedMetadata),
      instructorApproved: instructorApproved !== undefined ? Boolean(instructorApproved) : true,
      reviewStatus: reviewStatus || 'approved',
      status: status === 'archived' ? 'archived' : 'active',
      aiDetection: parsedAiDetection,
      isAiTrackable: parsedAiDetection.enabled,
      createdBy: userIdentifier,
      updatedBy: userIdentifier
    };

    const exercise = await insertExercise(exercisePayload);
    // Auto-sync into in-memory AI exercise registry
    exerciseRegistry.syncDatabaseExercises().catch(e => console.warn('AI registry sync warning:', e.message));
    apiCache.invalidatePattern('exercises:*');
    res.status(201).json(exercise);
  } catch (error) {
    console.error('createExercise Error:', error);
    res.status(500).json({ error: 'Failed to create exercise', message: error.message });
  }
};


// PUT /api/exercises/:id (FitnessInstructor, Admin, SuperAdmin)
export const updateExercise = async (req, res) => {
  try {
    const {
      name,
      category,
      targetMuscles,
      secondaryMuscles,
      equipmentRequired,
      difficulty,
      defaultSets,
      defaultReps,
      defaultDuration,
      instructions,
      fitnessPaths,
      medicalAvoidIf,
      jointPainAvoidIf,
      mediaUrl,
      thumbnailUrl,
      videoUrl,
      gifUrl,
      description,
      status,
      aiDetection,
      aliases,
      tags,
      movementPatterns,
      trainingGoals,
      trainingQualities,
      sportTags,
      experienceLevels,
      primaryPurpose,
      secondaryPurpose,
      recommendedFor,
      notRecommendedFor,
      contraindications,
      precautions,
      commonMistakes,
      regressions,
      progressions,
      alternatives,
      coachingCues,
      breathing,
      setup,
      executionSteps,
      programming,
      calorieEstimation,
      aiGeneratedMetadata,
      instructorApproved,
      reviewStatus
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (category !== undefined) updateData.category = category;
    if (equipmentRequired !== undefined) updateData.equipmentRequired = equipmentRequired;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (defaultSets !== undefined) updateData.defaultSets = Number(defaultSets) || 3;
    if (defaultReps !== undefined) updateData.defaultReps = Number(defaultReps) || 10;
    if (defaultDuration !== undefined) updateData.defaultDuration = Number(defaultDuration) || 0;
    if (instructions !== undefined) updateData.instructions = instructions;
    if (description !== undefined) updateData.description = description;
    if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl;
    if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;
    if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
    if (gifUrl !== undefined) updateData.gifUrl = gifUrl;
    if (status !== undefined) updateData.status = status;

    if (targetMuscles !== undefined) updateData.targetMuscles = parseArrayField(targetMuscles);
    if (secondaryMuscles !== undefined) updateData.secondaryMuscles = parseArrayField(secondaryMuscles);
    if (fitnessPaths !== undefined) updateData.fitnessPaths = parseArrayField(fitnessPaths);
    if (medicalAvoidIf !== undefined) updateData.medicalAvoidIf = parseArrayField(medicalAvoidIf);
    if (jointPainAvoidIf !== undefined) updateData.jointPainAvoidIf = parseArrayField(jointPainAvoidIf);

    if (aliases !== undefined) updateData.aliases = parseArrayField(aliases);
    if (tags !== undefined) updateData.tags = parseArrayField(tags);
    if (movementPatterns !== undefined) updateData.movementPatterns = parseArrayField(movementPatterns);
    if (trainingGoals !== undefined) updateData.trainingGoals = parseArrayField(trainingGoals);
    if (trainingQualities !== undefined) updateData.trainingQualities = parseArrayField(trainingQualities);
    if (sportTags !== undefined) updateData.sportTags = parseArrayField(sportTags);
    if (experienceLevels !== undefined) updateData.experienceLevels = parseArrayField(experienceLevels);

    if (primaryPurpose !== undefined) updateData.primaryPurpose = primaryPurpose;
    if (secondaryPurpose !== undefined) updateData.secondaryPurpose = secondaryPurpose;
    if (recommendedFor !== undefined) updateData.recommendedFor = parseArrayField(recommendedFor);
    if (notRecommendedFor !== undefined) updateData.notRecommendedFor = parseArrayField(notRecommendedFor);
    if (contraindications !== undefined) updateData.contraindications = parseArrayField(contraindications);
    if (precautions !== undefined) updateData.precautions = parseArrayField(precautions);
    if (commonMistakes !== undefined) updateData.commonMistakes = parseArrayField(commonMistakes);
    if (regressions !== undefined) updateData.regressions = parseArrayField(regressions);
    if (progressions !== undefined) updateData.progressions = parseArrayField(progressions);
    if (alternatives !== undefined) updateData.alternatives = parseArrayField(alternatives);
    if (coachingCues !== undefined) updateData.coachingCues = parseArrayField(coachingCues);
    if (breathing !== undefined) updateData.breathing = breathing;
    if (setup !== undefined) updateData.setup = setup;
    if (executionSteps !== undefined) updateData.executionSteps = parseArrayField(executionSteps);

    if (programming !== undefined) updateData.programming = programming;
    if (calorieEstimation !== undefined) updateData.calorieEstimation = calorieEstimation;
    if (aiGeneratedMetadata !== undefined) updateData.aiGeneratedMetadata = Boolean(aiGeneratedMetadata);
    if (instructorApproved !== undefined) updateData.instructorApproved = Boolean(instructorApproved);
    if (reviewStatus !== undefined) updateData.reviewStatus = reviewStatus;

    if (aiDetection !== undefined) {
      if (aiDetection && aiDetection.enabled) {
        const detId = aiDetection.detectorId;
        if (!detId || !SAFE_DETECTORS[detId]) {
          return res.status(400).json({ error: `Invalid or unregistered detectorId '${detId}'` });
        }
        updateData.aiDetection = {
          enabled: true,
          detectorId: detId,
          detectorVersion: aiDetection.detectorVersion || SAFE_DETECTORS[detId]
        };
        updateData.isAiTrackable = true;
      } else {
        updateData.aiDetection = { enabled: false, detectorId: null, detectorVersion: null };
        updateData.isAiTrackable = false;
      }
    }

    updateData.updatedBy = req.user?.name || req.user?.email || 'System';

    const updated = await Exercise.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ error: 'Exercise not found' });

    // Auto-sync into in-memory AI exercise registry
    exerciseRegistry.syncDatabaseExercises().catch(e => console.warn('AI registry sync warning:', e.message));
    apiCache.invalidatePattern('exercises:*');

    res.status(200).json(updated);
  } catch (error) {
    console.error('updateExercise Error:', error);
    res.status(500).json({ error: 'Failed to update exercise', message: error.message });
  }
};

// PUT /api/exercises/:id/archive (FitnessInstructor, Admin, SuperAdmin)
export const archiveExercise = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) return res.status(404).json({ error: 'Exercise not found' });

    const newStatus = req.body.status || (exercise.status === 'archived' ? 'active' : 'archived');
    exercise.status = newStatus;
    exercise.updatedBy = req.user?.name || req.user?.email || 'System';
    await exercise.save();

    exerciseRegistry.syncDatabaseExercises().catch(e => console.warn('AI registry sync warning:', e.message));
    apiCache.invalidatePattern('exercises:*');

    res.status(200).json({
      message: `Exercise successfully ${newStatus === 'archived' ? 'archived' : 'restored'}`,
      exercise
    });
  } catch (error) {
    console.error('archiveExercise Error:', error);
    res.status(500).json({ error: 'Failed to archive/restore exercise', message: error.message });
  }
};

// DELETE /api/exercises/:id (Admin, SuperAdmin only)
export const deleteExercise = async (req, res) => {
  try {
    const deleted = await Exercise.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Exercise not found' });

    exerciseRegistry.syncDatabaseExercises().catch(e => console.warn('AI registry sync warning:', e.message));
    apiCache.invalidatePattern('exercises:*');

    res.status(200).json({ message: 'Exercise deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete exercise', message: error.message });
  }
};


// POST /api/exercises/ai-assist (FitnessInstructor, Admin, SuperAdmin)
export const aiAssistExercise = async (req, res) => {
  try {
    const { name = '', category = 'Chest', equipmentRequired = 'Bodyweight', difficulty = 'Beginner' } = req.body;
    if (!name.trim()) {
      return res.status(400).json({ error: 'Exercise name is required for AI analysis' });
    }

    let aiDraft = null;

    // 1. Try local Ollama Qwen if enabled
    if (process.env.ENABLE_OLLAMA === 'true') {
      try {
        const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434/api/chat';
        const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5:0.5b';

        const prompt = `You are a certified sports science & biomechanics specialist.
Analyze this exercise:
Name: "${name}"
Category: "${category}"
Equipment: "${equipmentRequired}"
Difficulty: "${difficulty}"

Respond ONLY with a valid raw JSON object (no markdown, no backticks, no text) containing:
{
  "movementPatterns": ["squat"|"hinge"|"lunge"|"horizontal push"|"vertical push"|"horizontal pull"|"vertical pull"|"rotation"|"anti-rotation"|"anti-extension"|"carry"|"locomotion"|"sprinting"|"jumping"|"mobility"|"activation"|"conditioning"],
  "targetMuscles": ["string", "string"],
  "secondaryMuscles": ["string", "string"],
  "tags": ["compound"|"isolation", "hypertrophy"|"strength"|"endurance"|"power"],
  "trainingGoals": ["strength", "hypertrophy"],
  "sportTags": ["cricket", "football", "running", "combat", "general"],
  "primaryPurpose": "One concise sentence on what this exercise builds.",
  "secondaryPurpose": "One concise sentence on secondary athletic/rehab benefit.",
  "coachingCues": ["cue 1", "cue 2", "cue 3"],
  "commonMistakes": ["mistake 1", "mistake 2"],
  "regressions": ["easier variation 1"],
  "progressions": ["harder variation 1"],
  "contraindications": ["joint or injury caution e.g. acute shoulder impingement"],
  "precautions": ["technique precaution"],
  "metValue": 5.0,
  "instructions": "Step-by-step setup and execution instructions."
}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        const aiRes = await fetch(ollamaHost, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            model: ollamaModel,
            messages: [
              { role: 'system', content: 'You are an elite sports scientist. Output valid JSON only.' },
              { role: 'user', content: prompt }
            ],
            stream: false
          })
        });
        clearTimeout(timeout);

        if (aiRes.ok) {
          const data = await aiRes.json();
          let rawText = data.message?.content?.trim() || '';
          rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(rawText);
          if (parsed && typeof parsed === 'object') {
            aiDraft = parsed;
          }
        }
      } catch (ollamaErr) {
        console.warn('Ollama AI Assist fallback triggered:', ollamaErr.message);
      }
    }

    // 2. Deterministic sports-science heuristic fallback
    if (!aiDraft) {
      const lowerName = name.toLowerCase();
      const isPush = lowerName.includes('press') || lowerName.includes('push');
      const isPull = lowerName.includes('pull') || lowerName.includes('row') || lowerName.includes('chin');
      const isLeg = lowerName.includes('squat') || lowerName.includes('lunge') || lowerName.includes('leg') || lowerName.includes('deadlift');
      const isCardio = lowerName.includes('run') || lowerName.includes('jump') || lowerName.includes('burpee') || category === 'Cardio';

      let movementPattern = 'horizontal push';
      let primaryMuscles = ['Chest'];
      let secondaryMuscles = ['Triceps', 'Shoulders'];
      let met = 5.0;

      if (isCardio) {
        movementPattern = lowerName.includes('sprint') ? 'sprinting' : 'locomotion';
        primaryMuscles = ['Cardiovascular System', 'Quadriceps', 'Calves'];
        secondaryMuscles = ['Hamstrings', 'Core'];
        met = 8.5;
      } else if (isLeg) {
        movementPattern = lowerName.includes('deadlift') ? 'hinge' : lowerName.includes('lunge') ? 'lunge' : 'squat';
        primaryMuscles = ['Quadriceps', 'Glutes'];
        secondaryMuscles = ['Hamstrings', 'Calves', 'Core'];
        met = 6.0;
      } else if (isPull) {
        movementPattern = lowerName.includes('pulldown') || lowerName.includes('pull-up') ? 'vertical pull' : 'horizontal pull';
        primaryMuscles = ['Latissimus Dorsi', 'Upper Back'];
        secondaryMuscles = ['Biceps', 'Rear Deltoids'];
        met = 5.0;
      } else if (category === 'Shoulders' || lowerName.includes('overhead')) {
        movementPattern = 'vertical push';
        primaryMuscles = ['Anterior Deltoid', 'Lateral Deltoid'];
        secondaryMuscles = ['Triceps', 'Upper Trapezius'];
        met = 4.5;
      } else if (category === 'Core' || lowerName.includes('plank')) {
        movementPattern = 'anti-extension';
        primaryMuscles = ['Rectus Abdominis', 'Transverse Abdominis'];
        secondaryMuscles = ['Obliques', 'Glutes'];
        met = 4.0;
      }

      aiDraft = {
        movementPatterns: [movementPattern],
        targetMuscles: primaryMuscles,
        secondaryMuscles: secondaryMuscles,
        tags: [equipmentRequired === 'Bodyweight' ? 'bodyweight' : 'hypertrophy', 'strength'],
        trainingGoals: ['strength', 'hypertrophy'],
        sportTags: ['general', 'cricket', 'football'],
        primaryPurpose: `Targeted ${primaryMuscles.join(', ')} activation and progressive mechanical tension.`,
        secondaryPurpose: `Strengthen structural joint integrity and motor pattern coordination.`,
        coachingCues: [
          'Maintain a braced core with neutral spine alignment',
          'Control the eccentric (lowering) phase for 2-3 seconds',
          'Drive forcefully through the full active range of motion'
        ],
        commonMistakes: [
          'Cutting range of motion short',
          'Using excessive momentum or jerking the weight'
        ],
        regressions: equipmentRequired === 'Bodyweight' ? ['Assisted variation', 'Reduced range of motion'] : ['Dumbbell Floor Press', 'Push-ups'],
        progressions: ['Pause at sticking point', 'Increased loading'],
        contraindications: ['Acute local joint pain or active inflammation'],
        precautions: ['Perform dynamic joint mobility prior to heavy loading'],
        metValue: met,
        instructions: `Set up with stable posture. Inhale on the eccentric descent, hold stability briefly, and exhale forcefully through concentric exertion.`
      };
    }

    return res.status(200).json({
      success: true,
      draft: {
        ...aiDraft,
        name,
        category,
        equipmentRequired,
        difficulty,
        aiGeneratedMetadata: true,
        instructorApproved: false,
        reviewStatus: 'draft'
      }
    });
  } catch (err) {
    console.error('aiAssistExercise error:', err);
    res.status(500).json({ error: 'AI exercise analysis failed', message: err.message });
  }
};

// POST /api/exercises/upload-media (FitnessInstructor, Admin, SuperAdmin)
export const uploadExerciseMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No media file provided' });
    }

    let mediaUrl = '';
    if (req.file.buffer) {
      const supaUrl = await uploadToSupabaseStorage({
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
        folder: 'exercises'
      });
      if (supaUrl) {
        mediaUrl = supaUrl;
      } else {
        mediaUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      }
    } else if (req.file.filename) {
      mediaUrl = `/uploads/${req.file.filename}`;
    }

    return res.status(200).json({
      success: true,
      mediaUrl,
      fileName: req.file.originalname || req.file.filename
    });
  } catch (err) {
    console.error('uploadExerciseMedia error:', err);
    res.status(500).json({ error: 'Media upload failed', message: err.message });
  }
};
