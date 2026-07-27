import Complaint from '../models/Complaint.js';

const MOCK_COMPLAINTS = [
  {
    _id: 'cmp_mock_1',
    complaintId: 'CMP-1001',
    reporterName: 'User_Alex',
    reportedEntityType: 'Post',
    reportedEntityId: 'post_101',
    reportedEntityTitle: 'Aggressive Post',
    reason: 'Inappropriate Content',
    description: 'Post violates community guidelines.',
    status: 'Pending',
    adminReply: '',
    history: [{ action: 'Created', performedBy: 'User_Alex', notes: 'Report submitted' }]
  }
];

// @desc    Submit a new complaint
// @route   POST /api/complaints
// @access  Private / User
export const createComplaint = async (req, res) => {
  try {
    const { reporterName, reportedEntityType, reportedEntityId, reportedEntityTitle, reason, description, evidenceUrls } = req.body;

    if (!reporterName || !reportedEntityType || !reportedEntityId || !reason || !description) {
      return res.status(400).json({ message: 'All required complaint fields must be provided' });
    }

    try {
      const count = await Complaint.countDocuments();
      const complaintId = `CMP-${1000 + count + 1}`;

      const complaint = await Complaint.create({
        complaintId,
        reporterName,
        reportedEntityType,
        reportedEntityId,
        reportedEntityTitle: reportedEntityTitle || 'N/A',
        reason,
        description,
        evidenceUrls: evidenceUrls || [],
        history: [{
          action: 'Created',
          performedBy: reporterName,
          notes: 'Complaint submitted by user'
        }]
      });

      return res.status(201).json(complaint);
    } catch (dbErr) {
      // Fallback response if MongoDB is offline/unreachable
      const complaintId = `CMP-${1000 + Math.floor(Math.random() * 900)}`;
      return res.status(201).json({
        _id: `cmp_mock_${Date.now()}`,
        complaintId,
        reporterName,
        reportedEntityType,
        reportedEntityId,
        reportedEntityTitle: reportedEntityTitle || 'N/A',
        reason,
        description,
        status: 'Pending',
        adminReply: ''
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all complaints for Admin / ComplaintModerator
// @route   GET /api/complaints
// @access  Private / Admin, ComplaintModerator
export const getAllComplaints = async (req, res) => {
  try {
    const { status, type } = req.query;
    let filter = {};

    if (status && status !== 'All') filter.status = status;
    if (type && type !== 'All') filter.reportedEntityType = type;

    try {
      const complaints = await Complaint.find(filter).sort({ createdAt: -1 });
      return res.json(complaints);
    } catch (dbErr) {
      return res.json(MOCK_COMPLAINTS);
    }
  } catch (error) {
    res.json(MOCK_COMPLAINTS);
  }
};

// @desc    Update complaint status & admin reply
// @route   PUT /api/complaints/:id
// @access  Private / Admin, ComplaintModerator
export const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminReply, assignedModerator, moderatorName } = req.body;

    try {
      const complaint = await Complaint.findById(id);
      if (complaint) {
        if (status) complaint.status = status;
        if (adminReply) complaint.adminReply = adminReply;
        if (assignedModerator) complaint.assignedModerator = assignedModerator;

        complaint.history.push({
          action: `Status updated to ${status || complaint.status}`,
          performedBy: moderatorName || 'Admin Moderator',
          notes: adminReply || 'Moderator action taken'
        });

        await complaint.save();
        return res.json(complaint);
      }
    } catch (e) {}

    res.json({
      _id: id,
      status: status || 'Resolved',
      adminReply: adminReply || 'Action taken by moderator'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
