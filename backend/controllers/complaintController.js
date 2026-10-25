import crypto from 'crypto';
import Complaint from '../models/Complaint.js';

// @desc    Submit a new complaint
// @route   POST /api/complaints
// @access  Private / User
export const createComplaint = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Authentication required to submit a complaint' });
    }

    const { 
      reportedEntityType, 
      reportedEntityId, 
      reportedEntityTitle, 
      title, 
      category, 
      reason, 
      description,
      attachmentUrl
    } = req.body;

    const reporterName = req.user.name;
    const reporterId = req.user._id;
    let evidenceUrls = [];

    if (req.file) {
      if (req.file.buffer) {
        evidenceUrls.push(`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`);
      } else {
        evidenceUrls.push(`/uploads/${req.file.filename}`);
      }
    } else if (attachmentUrl && typeof attachmentUrl === 'string') {
      evidenceUrls.push(attachmentUrl);
    }

    const finalDescription = description?.trim();
    if (!finalDescription) {
      return res.status(400).json({ message: 'Complaint description is required' });
    }

    const finalTitle = title?.trim() || reportedEntityTitle?.trim() || reason?.trim() || 'Support Grievance';
    const finalReason = reason?.trim() || finalTitle;
    const finalCategory = category || 'General';
    const finalEntityType = reportedEntityType || 'General';
    const finalEntityId = reportedEntityId || 'platform';

    try {
      // Collision-free, atomic entropy-backed unique identifier
      const complaintId = `CMP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      const complaint = await Complaint.create({
        complaintId,
        reporterName,
        reporterId,
        reportedEntityType: finalEntityType,
        reportedEntityId: finalEntityId,
        reportedEntityTitle: finalTitle,
        title: finalTitle,
        category: finalCategory,
        reason: finalReason,
        description: finalDescription,
        evidenceUrls: evidenceUrls || [],
        status: 'Pending',
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
      // Strictly bind to reporterId: completely eliminate name-based fallback
      filter.reporterId = req.user._id;
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
    const { status, adminReply, resolutionNotes, assignedModerator, moderatorName } = req.body;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    const effectiveNote = resolutionNotes || adminReply || '';
    if (status) complaint.status = status;
    if (effectiveNote) {
      complaint.adminReply = effectiveNote;
      complaint.resolutionNotes = effectiveNote;
    }
    if (assignedModerator) complaint.assignedAdminName = assignedModerator;

    const actor = moderatorName || req.user?.name || 'Admin Moderator';
    complaint.history.push({
      action: `Status updated to ${status || complaint.status}`,
      performedBy: actor,
      notes: effectiveNote || 'Moderator action taken'
    });

    await complaint.save();

    // Notify user of complaint status change with clear, user-friendly language
    try {
      const Notification = (await import('../models/Notification.js')).default;
      let notificationMsg = '';
      const notePart = effectiveNote ? ` Note: ${effectiveNote}` : '';

      if (complaint.status === 'In Progress') {
        notificationMsg = `Your complaint #${complaint.complaintId} is now under review and being investigated.${notePart || ' Our administration team is actively reviewing your report.'}`;
      } else if (complaint.status === 'Resolved') {
        notificationMsg = `Your complaint #${complaint.complaintId} has been resolved.${notePart || ' The reported issue has been addressed.'}`;
      } else if (complaint.status === 'Closed') {
        notificationMsg = `Your complaint #${complaint.complaintId} has been closed.${notePart || ' Resolution completed.'}`;
      } else if (complaint.status === 'Pending') {
        notificationMsg = `Your complaint #${complaint.complaintId} is pending review.${notePart || ' We have received your report.'}`;
      } else {
        notificationMsg = `Update on complaint #${complaint.complaintId}: Status is now ${complaint.status}.${notePart}`;
      }

      await Notification.create({
        userId: String(complaint.reporterId || complaint.reporterName),
        type: 'system',
        message: notificationMsg
      });
    } catch (nErr) {
      console.warn('Complaint notification warning:', nErr.message);
    }

    return res.json(complaint);
  } catch (error) {
    console.error('Update complaint status error:', error);
    res.status(500).json({ message: 'Failed to update complaint status' });
  }
};

// @desc    Reopen a resolved or closed complaint
// @route   PUT /api/complaints/:id/reopen
// @access  Private / User (Reporter) or Admin
export const reopenComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, remarks } = req.body;

    const complaint = await Complaint.findById(id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    const isReporter = req.user && complaint.reporterId && String(req.user._id) === String(complaint.reporterId);
    const isStaff = req.user && ['admin', 'superadmin', 'complaintmoderator'].includes(req.user.role.toLowerCase());

    if (!isReporter && !isStaff) {
      return res.status(403).json({ message: 'Not authorized to reopen this complaint' });
    }

    const reopenNote = reason || remarks || 'User requested case reopening due to unresolved issue.';
    complaint.status = 'Reopened';
    complaint.reopenReason = reopenNote;
    complaint.history.push({
      action: 'Reopened',
      performedBy: req.user.name || 'User',
      notes: reopenNote
    });

    await complaint.save();

    return res.json({ message: 'Complaint reopened successfully', complaint });
  } catch (error) {
    console.error('reopenComplaint error:', error);
    res.status(500).json({ message: 'Failed to reopen complaint' });
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

    // reporterId is strictly authoritative
    const isReporter = req.user && complaint.reporterId && String(req.user._id) === String(complaint.reporterId);
    const isStaff = req.user && ['admin', 'superadmin', 'complaintmoderator'].includes(req.user.role.toLowerCase());

    if (!isReporter && !isStaff) {
      return res.status(403).json({ message: 'Not authorized to post to this complaint ticket' });
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
    const unmigrated = await Complaint.find({ $or: [{ reporterId: null }, { reporterId: { $exists: false } }] });
    if (unmigrated.length === 0) return { migrated: 0 };

    const User = (await import('../models/User.js')).default;
    let count = 0;
    for (const doc of unmigrated) {
      let assignedId = null;
      if (doc.reporterName) {
        const u = await User.findOne({ name: doc.reporterName }).select('_id');
        if (u) assignedId = u._id;
      }
      if (!assignedId) {
        const adminUser = await User.findOne({ role: { $in: ['Admin', 'SuperAdmin'] } }).select('_id');
        if (adminUser) assignedId = adminUser._id;
      }
      if (assignedId) {
        doc.reporterId = assignedId;
        await doc.save();
        count++;
      }
    }
    return { migrated: count };
  } catch (err) {
    console.error('migrateLegacyComplaints error:', err);
    return { error: 'Failed to migrate legacy complaints' };
  }
};

