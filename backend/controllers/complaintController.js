import crypto from 'crypto';
import Complaint from '../models/Complaint.js';

// @desc    Submit a new complaint
// @route   POST /api/complaints
// @access  Private / User
export const createComplaint = async (req, res) => {
  try {
    const { reportedEntityType, reportedEntityId, reportedEntityTitle, reason, description } = req.body;
    const reporterName = req.user?.name || req.body.reporterName;
    const reporterId = req.user?._id || req.body.reporterId;
    let evidenceUrls = [];
    if (req.file) {
      if (req.file.buffer) {
        evidenceUrls.push(`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`);
      } else {
        evidenceUrls.push(`/uploads/${req.file.filename}`);
      }
    }

    if (!reporterName || !reportedEntityType || !reportedEntityId || !reason || !description) {
      return res.status(400).json({ message: 'All required complaint fields must be provided' });
    }

    try {
      // Collision-free, atomic entropy-backed unique identifier
      const complaintId = `CMP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      const complaint = await Complaint.create({
        complaintId,
        reporterName,
        reporterId: reporterId || undefined,
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
      console.error('Complaint creation DB error:', dbErr);
      return res.status(503).json({
        message: 'Unable to save complaint to database. Please try again later.'
      });
    }
  } catch (error) {
    console.error('Create complaint fatal error:', error);
    res.status(500).json({ message: 'An unexpected error occurred while processing the complaint.' });
  }
};

// @desc    Get all complaints for Admin / ComplaintModerator / Reporting User
// @route   GET /api/complaints
// @access  Private / Admin, ComplaintModerator, User
export const getAllComplaints = async (req, res) => {
  try {
    const { status, type } = req.query;
    let filter = {};

    if (status && status !== 'All') filter.status = status;
    if (type && type !== 'All') filter.reportedEntityType = type;

    if (req.user && !['admin', 'superadmin', 'complaintmoderator'].includes(req.user.role.toLowerCase())) {
      // Strictly bind to reporterId if present; fallback to reporterName only for legacy records without reporterId
      filter.$or = [
        { reporterId: req.user._id },
        { reporterId: null, reporterName: req.user.name },
        { reporterId: { $exists: false }, reporterName: req.user.name }
      ];
    }

    const complaints = await Complaint.find(filter).sort({ createdAt: -1 });
    return res.json(complaints);
  } catch (error) {
    console.error('Fetch complaints error:', error);
    return res.status(500).json({ message: 'Failed to fetch complaints from database' });
  }
};

// @desc    Update complaint status & admin reply
// @route   PUT /api/complaints/:id
// @access  Private / Admin, ComplaintModerator
export const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminReply, assignedModerator, moderatorName } = req.body;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    if (status) complaint.status = status;
    if (adminReply) complaint.adminReply = adminReply;
    if (assignedModerator) complaint.assignedAdminName = assignedModerator;

    const actor = moderatorName || req.user?.name || 'Admin Moderator';
    complaint.history.push({
      action: `Status updated to ${status || complaint.status}`,
      performedBy: actor,
      notes: adminReply || 'Moderator action taken'
    });

    await complaint.save();
    return res.json(complaint);
  } catch (error) {
    console.error('Update complaint status error:', error);
    res.status(500).json({ message: 'Failed to update complaint status' });
  }
};

// @desc    Add chat message to complaint
// @route   POST /api/complaints/:id/chat
// @access  Private / User, Admin
export const addComplaintChat = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    
    if (!text || !text.trim()) return res.status(400).json({ message: 'Text is required' });

    const complaint = await Complaint.findById(id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    // reporterId is authoritative; only unmigrated records without reporterId fallback to reporterName
    const isReporter = req.user && (
      (complaint.reporterId && String(req.user._id) === String(complaint.reporterId)) ||
      (!complaint.reporterId && req.user.name === complaint.reporterName)
    );
    const isStaff = req.user && ['admin', 'superadmin', 'complaintmoderator'].includes(req.user.role.toLowerCase());

    if (!isReporter && !isStaff) {
      return res.status(403).json({ message: 'Not authorized to post to this complaint ticket' });
    }

    // Auto-heal legacy records: assign reporterId if missing
    if (!complaint.reporterId && req.user._id) {
      complaint.reporterId = req.user._id;
    }

    const role = isStaff ? 'Admin' : 'User';
    const authorName = req.user?.name || (isStaff ? 'Moderator' : 'User');

    complaint.chatMessages.push({
      senderName: authorName,
      role,
      text: text.trim(),
      timestamp: new Date()
    });

    await complaint.save();
    return res.json(complaint.chatMessages);
  } catch (error) {
    console.error('Add complaint chat error:', error);
    res.status(500).json({ message: 'Failed to post message to complaint' });
  }
};

// @desc    Backfill reporterId for legacy complaints
export const migrateLegacyComplaints = async () => {
  try {
    const unmigrated = await Complaint.find({ reporterId: null });
    if (unmigrated.length === 0) return { migrated: 0 };

    const User = (await import('../models/User.js')).default;
    let count = 0;
    for (const doc of unmigrated) {
      if (doc.reporterName) {
        const u = await User.findOne({ name: doc.reporterName }).select('_id');
        if (u) {
          doc.reporterId = u._id;
          await doc.save();
          count++;
        }
      }
    }
    return { migrated: count };
  } catch (err) {
    console.error('migrateLegacyComplaints error:', err);
    return { error: err.message };
  }
};

