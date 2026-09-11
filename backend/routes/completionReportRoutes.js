import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { reportSessionIssue, resolveSessionIssue } from '../controllers/completionReportController.js';

const router = express.Router({ mergeParams: true });

router.post('/:planId/sessions/:sessionId/report', protect, reportSessionIssue);
router.put('/:planId/sessions/:sessionId/report/resolve', protect, resolveSessionIssue);

export default router;
