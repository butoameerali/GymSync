import Exercise from '../models/Exercise.js';
import { fetchAllExercises, insertExercise } from '../services/supabaseService.js';
import exerciseRegistry from '../services/workout/exerciseRegistry.js';

// GET /api/exercises - Public / User fetch with search and filters (Supabase + MongoDB fallback)
export const getAllExercises = async (req, res) => {
  try {
    const { search, category, equipment, status, includeArchived } = req.query;
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

// POST /api/exercises (FitnessInstructor, Admin, SuperAdmin)
export const createExercise = async (req, res) => {
  try {
    const {
      exerciseId,
      name,
      category,
      targetMuscles,
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
      description,
      status,
      aiDetection
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
      name,
      category: category || 'Chest',
      targetMuscles: Array.isArray(targetMuscles) ? targetMuscles : (targetMuscles || '').split(',').map(s => s.trim()).filter(Boolean),
      equipmentRequired: equipmentRequired || 'Bodyweight',
      difficulty: difficulty || 'Beginner',
      defaultSets: Number(defaultSets) || 3,
      defaultReps: Number(defaultReps) || 10,
      defaultDuration: Number(defaultDuration) || 0,
      instructions: instructions || '',
      fitnessPaths: Array.isArray(fitnessPaths) ? fitnessPaths : (fitnessPaths || '').split(',').map(s => s.trim()).filter(Boolean),
      medicalAvoidIf: Array.isArray(medicalAvoidIf) ? medicalAvoidIf : (medicalAvoidIf || '').split(',').map(s => s.trim()).filter(Boolean),
      jointPainAvoidIf: Array.isArray(jointPainAvoidIf) ? jointPainAvoidIf : (jointPainAvoidIf || '').split(',').map(s => s.trim()).filter(Boolean),
      mediaUrl: mediaUrl || '',
      description: description || '',
      status: status === 'archived' ? 'archived' : 'active',
      aiDetection: parsedAiDetection,
      isAiTrackable: parsedAiDetection.enabled,
      createdBy: userIdentifier,
      updatedBy: userIdentifier
    };

    const exercise = await insertExercise(exercisePayload);
    // Auto-sync into in-memory AI exercise registry
    exerciseRegistry.syncDatabaseExercises().catch(e => console.warn('AI registry sync warning:', e.message));
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
      description,
      status,
      aiDetection
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (equipmentRequired !== undefined) updateData.equipmentRequired = equipmentRequired;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (defaultSets !== undefined) updateData.defaultSets = Number(defaultSets) || 3;
    if (defaultReps !== undefined) updateData.defaultReps = Number(defaultReps) || 10;
    if (defaultDuration !== undefined) updateData.defaultDuration = Number(defaultDuration) || 0;
    if (instructions !== undefined) updateData.instructions = instructions;
    if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;

    if (targetMuscles !== undefined) {
      updateData.targetMuscles = Array.isArray(targetMuscles) ? targetMuscles : String(targetMuscles).split(',').map(s => s.trim()).filter(Boolean);
    }
    if (fitnessPaths !== undefined) {
      updateData.fitnessPaths = Array.isArray(fitnessPaths) ? fitnessPaths : String(fitnessPaths).split(',').map(s => s.trim()).filter(Boolean);
    }
    if (medicalAvoidIf !== undefined) {
      updateData.medicalAvoidIf = Array.isArray(medicalAvoidIf) ? medicalAvoidIf : String(medicalAvoidIf).split(',').map(s => s.trim()).filter(Boolean);
    }
    if (jointPainAvoidIf !== undefined) {
      updateData.jointPainAvoidIf = Array.isArray(jointPainAvoidIf) ? jointPainAvoidIf : String(jointPainAvoidIf).split(',').map(s => s.trim()).filter(Boolean);
    }

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
    res.status(200).json({ message: 'Exercise deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete exercise', message: error.message });
  }
};
