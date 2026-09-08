import InstructorRequest from '../models/InstructorRequest.js';

// @desc    Get all instructor requests
// @route   GET /api/instructor-requests
// @access  Private / FitnessInstructor, Admin, SuperAdmin
export const getInstructorRequests = async (req, res) => {
  try {
    const userRole = req.user?.role;
    const userName = req.user?.name;

    let filter = {};
    // If logged in as an instructor, show tasks assigned to 'All' or specifically to this instructor
    if (userRole === 'FitnessInstructor' && userName) {
      filter = {
        $or: [
          { assignedTo: 'All' },
          { assignedTo: userName }
        ]
      };
    }

    const requests = await InstructorRequest.find(filter).sort({ createdAt: -1 });
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
    const topic = req.body.topic || req.body.title;
    const { description, priority, assignedTo, dueDate } = req.body;
    const from = req.user?.name || 'Admin';
    const fromId = req.user?._id;

    if (!topic || !topic.trim()) {
      return res.status(400).json({ message: 'Request topic/title is required' });
    }

    const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
    const selectedPriority = validPriorities.includes(priority) ? priority : 'Medium';

    const newRequest = await InstructorRequest.create({
      from,
      fromId,
      topic: topic.trim(),
      description: description || '',
      priority: selectedPriority,
      assignedTo: assignedTo || 'All',
      status: 'Pending'
    });

    res.status(201).json(newRequest);
  } catch (error) {
    console.error('createInstructorRequest Error:', error);
    res.status(500).json({ message: 'Failed to create request', error: error.message });
  }
};

// @desc    Update request status / Respond to request
// @route   PUT /api/instructor-requests/:id
// @access  Private / FitnessInstructor, Admin, SuperAdmin
export const updateInstructorRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, responseNotes, priority, assignedTo } = req.body;

    const request = await InstructorRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (status) request.status = status;
    if (responseNotes !== undefined) request.responseNotes = responseNotes;
    if (priority) request.priority = priority;
    if (assignedTo) request.assignedTo = assignedTo;

    if (status === 'Completed') {
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

// @desc    Delete a request
// @route   DELETE /api/instructor-requests/:id
// @access  Private / Admin, SuperAdmin
export const deleteInstructorRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await InstructorRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    await request.deleteOne();
    res.json({ message: 'Request deleted successfully', id });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete request', error: error.message });
  }
};
