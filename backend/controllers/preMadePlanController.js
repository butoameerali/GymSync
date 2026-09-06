import PreMadePlan from '../models/PreMadePlan.js';

const INITIAL_PLANS = [
  {
    title: 'Hypertrophy 4-Week Mass Split',
    type: 'Workout',
    category: 'Muscle Building',
    description: '4-day upper/lower hypertrophy program focusing on mechanical tension and progressive overload.',
    details: { days: 4, level: 'Intermediate', target: 'Hypertrophy' },
    createdBy: 'Fitness Instructor'
  },
  {
    title: 'Fat Loss & Core Shred',
    type: 'Workout',
    category: 'Weight Loss',
    description: '5-day high-density conditioning and resistance routine designed for metabolic elevation.',
    details: { days: 5, level: 'Beginner', target: 'Fat Loss' },
    createdBy: 'Fitness Instructor'
  },
  {
    title: 'High Protein Clean Bulk',
    type: 'Diet',
    category: 'Muscle Gain',
    description: 'Nutrient-dense macro distribution targeting 2,800 kcal with 200g protein.',
    details: { calories: '2800 kcal', goal: 'Muscle Gain', protein: '200g', carbs: '320g', fat: '75g' },
    createdBy: 'Fitness Instructor'
  },
  {
    title: 'Keto Low-Carb Shred',
    type: 'Diet',
    category: 'Fat Loss',
    description: 'Strict ketogenic meal protocol designed for rapid glycogen depletion and ketone adaptation.',
    details: { calories: '1900 kcal', goal: 'Fat Loss', protein: '140g', carbs: '25g', fat: '135g' },
    createdBy: 'Fitness Instructor'
  }
];

// GET /api/plans/premade
export const getPreMadePlans = async (req, res) => {
  try {
    const { type } = req.query;
    let query = {};
    if (type) {
      query.type = type;
    }

    let plans = await PreMadePlan.find(query).sort({ createdAt: -1 });

    if (plans.length === 0 && !type) {
      try {
        plans = await PreMadePlan.insertMany(INITIAL_PLANS);
      } catch (e) {
        return res.json(INITIAL_PLANS);
      }
    }

    res.status(200).json(plans);
  } catch (error) {
    console.error('getPreMadePlans Error:', error);
    res.status(500).json({ error: 'Failed to fetch pre-made plans', message: error.message });
  }
};

// POST /api/plans/premade
export const createPreMadePlan = async (req, res) => {
  try {
    const { title, type, category, description, details } = req.body;
    const createdBy = req.user?.name || 'Fitness Instructor';

    if (!title || !type) {
      return res.status(400).json({ error: 'Title and type are required' });
    }

    const newPlan = await PreMadePlan.create({
      title,
      type,
      category: category || 'General Fitness',
      description: description || '',
      details: details || {},
      createdBy
    });

    res.status(201).json(newPlan);
  } catch (error) {
    console.error('createPreMadePlan Error:', error);
    res.status(500).json({ error: 'Failed to create pre-made plan', message: error.message });
  }
};

// PUT /api/plans/premade/:id
export const updatePreMadePlan = async (req, res) => {
  try {
    const { title, category, description, details, type } = req.body;
    const plan = await PreMadePlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    if (title) plan.title = title;
    if (type) plan.type = type;
    if (category) plan.category = category;
    if (description !== undefined) plan.description = description;
    if (details) plan.details = details;

    await plan.save();
    res.status(200).json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update plan', message: error.message });
  }
};

// DELETE /api/plans/premade/:id
export const deletePreMadePlan = async (req, res) => {
  try {
    const deleted = await PreMadePlan.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Plan not found' });
    res.status(200).json({ message: 'Pre-made plan deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete pre-made plan', message: error.message });
  }
};
