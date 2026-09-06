import InstructorRequest from '../models/InstructorRequest.js';

const INITIAL_REQUESTS = [
  {
    from: 'SuperAdmin',
    topic: 'Update Lower Body Exercise Demos',
    description: 'Please review and update video URLs and form cues for squats and Romanian deadlifts.',
    status: 'Pending',
    assignedTo: 'All'
  },
  {
    from: 'Admin',
    topic: 'Create 3-Day Home Dumbbell Routine',
    description: 'Members have requested a beginner-friendly 3-day dumbbell split for home workouts.',
    status: 'Completed',
    assignedTo: 'All',
    completedBy: 'Fitness Instructor',
    completedAt: new Date()
  }
];

// @desc    Get all instructor requests
// @route   GET /api/instructor-requests
// @access  Private / FitnessInstructor, Admin, SuperAdmin
export const getInstructorRequests = async (req, res) => {
  try {
    let requests = await InstructorRequest.find().sort({ createdAt: -1 });

    if (requests.length === 0) {
      try {
        requests = await InstructorRequest.insertMany(INITIAL_REQUESTS);
      } catch (e) {
        return res.json(INITIAL_REQUESTS);
      }
    }

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch instructor requests', error: error.message });
  }
};

// @desc    Create new task/request for instructors
// @route   POST /api/instructor-requests
// @access  Private / Admin, SuperAdmin
export const createInstructorRequest = async (req, res) => {
  try {
    const { topic, description, assignedTo } = req.body;
    const from = req.user?.name || 'Admin';

    if (!topic) {
      return res.status(400).json({ message: 'Request topic is required' });
    }

    const newRequest = await InstructorRequest.create({
      from,
      topic,
      description: description || '',
      assignedTo: assignedTo || 'All',
      status: 'Pending'
    });

    res.status(201).json(newRequest);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create request', error: error.message });
  }
};

// @desc    Update request status / Respond to request
// @route   PUT /api/instructor-requests/:id
// @access  Private / FitnessInstructor, Admin, SuperAdmin
export const updateInstructorRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, responseNotes } = req.body;

    const request = await InstructorRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (status) request.status = status;
    if (responseNotes !== undefined) request.responseNotes = responseNotes;

    if (status === 'Completed' && !request.completedAt) {
      request.completedBy = req.user?.name || 'Fitness Instructor';
      request.completedAt = new Date();
    } else if (status === 'Pending') {
      request.completedBy = null;
      request.completedAt = null;
    }

    await request.save();
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update request', error: error.message });
  }
};
