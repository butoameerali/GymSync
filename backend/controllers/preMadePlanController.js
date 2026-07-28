import PreMadePlan from '../models/PreMadePlan.js';

// GET /api/plans/premade
export const getPreMadePlans = async (req, res) => {
  try {
    const plans = await PreMadePlan.find().sort({ createdAt: -1 });
    res.status(200).json(plans);
  } catch (error) {
    console.error('getPreMadePlans Error:', error);
    res.status(500).json({ error: 'Failed to fetch pre-made plans', message: error.message });
  }
};

// POST /api/plans/premade (Admin)
export const createPreMadePlan = async (req, res) => {
  try {
    const { title, type, category, description, details, createdBy } = req.body;

    if (!title || !type || !details) {
      return res.status(400).json({ error: 'Title, type, and plan details are required' });
    }

    const newPlan = await PreMadePlan.create({
      title,
      type,
      category: category || 'General Fitness',
      description: description || '',
      details,
      createdBy: createdBy || 'GymSync Admin'
    });

    res.status(201).json(newPlan);
  } catch (error) {
    console.error('createPreMadePlan Error:', error);
    res.status(500).json({ error: 'Failed to create pre-made plan', message: error.message });
  }
};

// DELETE /api/plans/premade/:id (Admin)
export const deletePreMadePlan = async (req, res) => {
  try {
    const deleted = await PreMadePlan.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Plan not found' });
    res.status(200).json({ message: 'Pre-made plan deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete pre-made plan', message: error.message });
  }
};
