import Exercise from '../models/Exercise.js';

// GET /api/exercises - Public / User fetch with search and filters
export const getAllExercises = async (req, res) => {
  try {
    const { search, category, equipment } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { targetMuscles: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && category !== 'All' && category !== 'Favorites') {
      query.targetMuscles = { $regex: category, $options: 'i' };
    }

    if (equipment && equipment !== 'All') {
      if (equipment === 'No Equipment') {
        query.equipmentRequired = { $regex: 'bodyweight|none', $options: 'i' };
      } else if (equipment === 'With Equipment') {
        query.equipmentRequired = { $not: { $regex: 'bodyweight|none', $options: 'i' } };
      }
    }

    const exercises = await Exercise.find(query).sort({ name: 1 }).limit(800);
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

// Safe registered detector allowlist
const SAFE_DETECTORS = {
  'pushup_v1': '1.0',
  'squat_v1': '1.0',
  'plank_v1': '1.0',
  'jumping_jack_v1': '1.0'
};

// POST /api/exercises (Admin)
export const createExercise = async (req, res) => {
  try {
    const { exerciseId, name, targetMuscles, equipmentRequired, difficulty, fitnessPaths, medicalAvoidIf, jointPainAvoidIf, mediaUrl, description, aiDetection } = req.body;

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

    const exercise = await Exercise.create({
      exerciseId: newId,
      name,
      targetMuscles: Array.isArray(targetMuscles) ? targetMuscles : (targetMuscles || '').split(',').map(s => s.trim()).filter(Boolean),
      equipmentRequired: equipmentRequired || 'Bodyweight',
      difficulty: difficulty || 'Beginner',
      fitnessPaths: Array.isArray(fitnessPaths) ? fitnessPaths : (fitnessPaths || '').split(',').map(s => s.trim()).filter(Boolean),
      medicalAvoidIf: Array.isArray(medicalAvoidIf) ? medicalAvoidIf : (medicalAvoidIf || '').split(',').map(s => s.trim()).filter(Boolean),
      jointPainAvoidIf: Array.isArray(jointPainAvoidIf) ? jointPainAvoidIf : (jointPainAvoidIf || '').split(',').map(s => s.trim()).filter(Boolean),
      mediaUrl: mediaUrl || '',
      description: description || '',
      aiDetection: parsedAiDetection,
      isAiTrackable: parsedAiDetection.enabled
    });

    res.status(201).json(exercise);
  } catch (error) {
    console.error('createExercise Error:', error);
    res.status(500).json({ error: 'Failed to create exercise', message: error.message });
  }
};

// PUT /api/exercises/:id (Admin)
export const updateExercise = async (req, res) => {
  try {
    const { name, targetMuscles, equipmentRequired, difficulty, fitnessPaths, medicalAvoidIf, jointPainAvoidIf, mediaUrl, description, aiDetection } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (equipmentRequired !== undefined) updateData.equipmentRequired = equipmentRequired;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl;
    if (description !== undefined) updateData.description = description;

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

    const updated = await Exercise.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ error: 'Exercise not found' });

    res.status(200).json(updated);
  } catch (error) {
    console.error('updateExercise Error:', error);
    res.status(500).json({ error: 'Failed to update exercise', message: error.message });
  }
};

// DELETE /api/exercises/:id (Admin)
export const deleteExercise = async (req, res) => {
  try {
    const deleted = await Exercise.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Exercise not found' });
    res.status(200).json({ message: 'Exercise deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete exercise', message: error.message });
  }
};
