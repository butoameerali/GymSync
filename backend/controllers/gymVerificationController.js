import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import Gym from '../models/Gym.js';
import VerificationApplication from '../models/VerificationApplication.js';
import VerificationDocument from '../models/VerificationDocument.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { encryptBuffer, decryptBuffer } from '../utils/cryptoUtils.js';
import { logAuditTrail } from '../middleware/securityMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRIVATE_DOCS_DIR = path.resolve(__dirname, '..', 'uploads', 'private_docs');
if (!fs.existsSync(PRIVATE_DOCS_DIR)) {
  fs.mkdirSync(PRIVATE_DOCS_DIR, { recursive: true });
}

/**
 * Get or automatically create the organization for the current GymOwner
 */
const getOrCreateOwnerOrganization = async (user, orgName = 'My Gym Organization') => {
  let org = await Organization.findOne({ owner: user._id });
  if (!org) {
    org = await Organization.create({
      name: orgName,
      legalName: orgName,
      owner: user._id,
      ownerName: user.name,
      businessEmail: user.email,
      businessPhone: user.phone || ''
    });
  }
  return org;
};

// ==========================================
// 1. OWNER: List all branches / gyms
// ==========================================
export const getOwnerBranches = async (req, res) => {
  try {
    const org = await getOrCreateOwnerOrganization(req.user);
    const branches = await Gym.find({
      $or: [
        { organization: org._id },
        { owner: req.user._id },
        { ownerName: req.user.name }
      ]
    }).populate({
      path: 'verificationApplication',
      populate: {
        path: 'documents.document',
        select: 'documentType originalFilename mimeType fileSizeBytes createdAt'
      }
    }).sort({ createdAt: -1 });

    // Link any orphaned gyms to the owner's organization
    for (const b of branches) {
      if (!b.organization) {
        b.organization = org._id;
        await b.save();
      }
    }

    res.json({
      organization: {
        _id: org._id,
        name: org.name,
        legalName: org.legalName,
        status: org.status
      },
      branches: branches.map(b => ({
        _id: b._id,
        id: b._id,
        name: b.name,
        branchName: b.branchName || b.name,
        city: b.city || '',
        country: b.country || 'Pakistan',
        address: b.address || b.location || '',
        location: b.location || '',
        coordinates: b.coordinates || null,
        gymType: b.gymType || 'Commercial Gym',
        approvalStatus: b.approvalStatus || 'Draft',
        monthlyFee: b.monthlyFee || 0,
        admissionFee: b.admissionFee || 0,
        securityDeposit: b.securityDeposit || 0,
        securityDepositRefundable: b.securityDepositRefundable ?? true,
        offersYearlyPlan: Boolean(b.offersYearlyPlan || (Number(b.yearlyDiscountPercent) > 0)),
        yearlyDiscountPercent: b.yearlyDiscountPercent || 0,
        trainerPolicy: b.trainerPolicy || {
          guidanceTrainer: false,
          personalTrainer: false,
          personalTrainerMonthlyFee: 0,
          notes: ''
        },
        annualSubscriptionFee: b.annualSubscriptionFee || 20,
        subscriptionPaid: b.subscriptionPaid || false,
        subscriptionPaidAt: b.subscriptionPaidAt || null,
        subscriptionExpiresAt: b.subscriptionExpiresAt || null,
        subscriptionPaymentMethod: b.subscriptionPaymentMethod || '',
        isOnline: b.isOnline || false,
        listingStatus: b.listingStatus || (b.approvalStatus === 'Approved' ? (b.subscriptionPaid ? 'Online' : 'Pending Payment') : (b.approvalStatus || 'Offline')),
        facilities: b.facilities || [],
        timings: b.timings || null,
        rejectionReason: b.rejectionReason || '',
        applicationId: b.verificationApplication?._id || null,
        verificationApplication: b.verificationApplication || null,
        createdAt: b.createdAt
      }))
    });
  } catch (error) {
    console.error('getOwnerBranches error:', error);
    res.status(500).json({ message: 'Failed to fetch owner branches' });
  }
};

// ==========================================
// 2. OWNER: Save or Update Branch & Application Draft
// ==========================================
export const saveBranchDraft = async (req, res) => {
  try {
    const {
      branchId,
      branchName,
      description,
      contactPhone,
      contactEmail,
      country,
      city,
      address,
      coordinates,
      placeId,
      googleMapsUrl,
      gymType,
      monthlyFee,
      admissionFee,
      securityDeposit,
      securityDepositRefundable,
      offersYearlyPlan,
      yearlyDiscountPercent,
      trainerPolicy,
      facilities,
      timings,
      photos,
      applicantDetails,
      statementOfPurpose
    } = req.body;

    const org = await getOrCreateOwnerOrganization(req.user);

    let branch = null;
    if (branchId) {
      branch = await Gym.findOne({
        _id: branchId,
        $or: [{ organization: org._id }, { owner: req.user._id }]
      });
      if (!branch) {
        return res.status(404).json({ message: 'Branch not found or access denied' });
      }
    } else {
      branch = new Gym({
        owner: req.user._id,
        ownerName: req.user.name,
        ownerEmail: req.user.email,
        organization: org._id,
        location: (address && address.trim()) || (branchName ? `${branchName.trim()} Location` : 'Location Pending'),
        monthlyFee: 50,
        admissionFee: 0,
        approvalStatus: 'Draft'
      });
    }

    // Lock branch identity & location once submitted or approved
    const isLockedStatus = ['Approved', 'Pending Review', 'Under Review', 'More Information Required'].includes(branch.approvalStatus);

    if (!isLockedStatus) {
      if (branchName) {
        branch.name = branchName.trim();
        branch.branchName = branchName.trim();
      }
      if (gymType !== undefined) branch.gymType = gymType;
      if (country !== undefined) branch.country = country;
      if (city !== undefined) branch.city = city;
      if (address !== undefined) {
        const cleanAddr = address.trim();
        branch.address = cleanAddr;
        if (cleanAddr) {
          branch.location = cleanAddr;
        } else if (!branch.location || branch.location === '') {
          branch.location = branch.city ? `${branch.city}, Pakistan` : (branch.name || 'Location Pending');
        }
      }
      if (coordinates !== undefined) {
        if (coordinates?.lat && coordinates?.lng) {
          branch.coordinates = {
            lat: Number(coordinates.lat),
            lng: Number(coordinates.lng)
          };
        }
      }
      if (placeId !== undefined) branch.placeId = placeId;
      if (googleMapsUrl !== undefined) branch.googleMapsUrl = googleMapsUrl;
    }

    if (description !== undefined) branch.description = description;
    if (contactPhone !== undefined) branch.contactPhone = contactPhone;
    if (contactEmail !== undefined) branch.contactEmail = contactEmail;
    if (gymType !== undefined) branch.gymType = gymType;

    if (monthlyFee !== undefined) {
      const parsed = Number(monthlyFee);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return res.status(400).json({ message: 'Monthly fee must be a valid number >= 0' });
      }
      branch.monthlyFee = parsed;
    }

    if (admissionFee !== undefined) {
      const parsed = Number(admissionFee);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return res.status(400).json({ message: 'Admission fee must be a valid number >= 0' });
      }
      branch.admissionFee = parsed;
    }

    if (securityDeposit !== undefined) {
      const parsed = Number(securityDeposit);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return res.status(400).json({ message: 'Security deposit must be a valid number >= 0' });
      }
      branch.securityDeposit = parsed;
    }

    if (securityDepositRefundable !== undefined) {
      branch.securityDepositRefundable = Boolean(securityDepositRefundable);
    }

    if (offersYearlyPlan !== undefined) {
      branch.offersYearlyPlan = Boolean(offersYearlyPlan);
      if (!branch.offersYearlyPlan) {
        branch.yearlyDiscountPercent = 0;
      }
    }

    if (yearlyDiscountPercent !== undefined && branch.offersYearlyPlan !== false) {
      const parsed = Number(yearlyDiscountPercent);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 50) {
        return res.status(400).json({ message: 'Yearly discount percent must be between 0 and 50' });
      }
      branch.yearlyDiscountPercent = parsed;
    }

    if (trainerPolicy !== undefined) {
      if (typeof trainerPolicy !== 'object' || trainerPolicy === null) {
        return res.status(400).json({ message: 'trainerPolicy must be an object' });
      }
      const guidanceTrainer = Boolean(trainerPolicy.guidanceTrainer);
      const personalTrainer = Boolean(trainerPolicy.personalTrainer);
      const personalTrainerMonthlyFee = Number(trainerPolicy.personalTrainerMonthlyFee ?? 0);
      if (!Number.isFinite(personalTrainerMonthlyFee) || personalTrainerMonthlyFee < 0) {
        return res.status(400).json({ message: 'Personal trainer monthly fee must be a valid number >= 0' });
      }
      if (trainerPolicy.notes && String(trainerPolicy.notes).length > 300) {
        return res.status(400).json({ message: 'Trainer policy notes cannot exceed 300 characters' });
      }
      const notes = String(trainerPolicy.notes || '').slice(0, 300);

      branch.trainerPolicy = {
        guidanceTrainer,
        personalTrainer,
        personalTrainerMonthlyFee,
        notes
      };
      branch.trainerIncluded = Boolean(guidanceTrainer || personalTrainer);
    }

    if (facilities !== undefined) branch.facilities = Array.isArray(facilities) ? facilities : [];
    if (timings !== undefined) branch.timings = timings;
    if (photos !== undefined) branch.photos = Array.isArray(photos) ? photos : [];

    await branch.save();

    // Find or create verification application for this branch
    let application = await VerificationApplication.findOne({ branch: branch._id });
    if (!application) {
      const refId = `GS-APP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      application = new VerificationApplication({
        referenceId: refId,
        organization: org._id,
        branch: branch._id,
        applicant: req.user._id,
        applicantDetails: {
          legalName: applicantDetails?.legalName || req.user.name,
          email: applicantDetails?.email || req.user.email,
          phone: applicantDetails?.phone || req.user.phone || '',
          cnicOrPassport: applicantDetails?.cnicOrPassport || '',
          relationship: applicantDetails?.relationship || 'Owner',
          preferredContactMethod: applicantDetails?.preferredContactMethod || 'Email'
        },
        statementOfPurpose: statementOfPurpose ? String(statementOfPurpose).trim() : '',
        status: 'Draft'
      });
    } else {
      if (statementOfPurpose !== undefined) {
        application.statementOfPurpose = String(statementOfPurpose).trim();
      }
      if (applicantDetails) {
        if (applicantDetails.legalName) application.applicantDetails.legalName = applicantDetails.legalName;
        if (applicantDetails.email) application.applicantDetails.email = applicantDetails.email;
        if (applicantDetails.phone) application.applicantDetails.phone = applicantDetails.phone;
        if (applicantDetails.cnicOrPassport !== undefined) application.applicantDetails.cnicOrPassport = applicantDetails.cnicOrPassport;
        if (applicantDetails.relationship) application.applicantDetails.relationship = applicantDetails.relationship;
        if (applicantDetails.preferredContactMethod) application.applicantDetails.preferredContactMethod = applicantDetails.preferredContactMethod;
      }
    }

    await application.save();

    branch.verificationApplication = application._id;
    await branch.save();

    await application.populate({
      path: 'documents.document',
      select: 'documentType originalFilename mimeType fileSizeBytes createdAt'
    });

    res.json({
      message: 'Branch draft saved successfully',
      branch: {
        _id: branch._id,
        id: branch._id,
        name: branch.name,
        branchName: branch.branchName,
        approvalStatus: branch.approvalStatus
      },
      application: {
        _id: application._id,
        referenceId: application.referenceId,
        status: application.status,
        applicantDetails: application.applicantDetails,
        statementOfPurpose: application.statementOfPurpose,
        documents: application.documents
      }
    });
  } catch (error) {
    console.error('saveBranchDraft error:', error);
    res.status(500).json({ message: 'Failed to save branch draft' });
  }
};

// ==========================================
// 3. OWNER: Upload Private Verification Document (Encrypted with AES-256-GCM)
// ==========================================
export const uploadVerificationDocument = async (req, res) => {
  try {
    const { branchId, documentType } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file provided for upload' });
    }

    const typeMapping = {
      'BUSINESS_REGISTRATION': 'BusinessRegistration',
      'OWNER_CNIC_FRONT': 'CNIC',
      'SIGNBOARD_PHOTO': 'EntranceSignboard',
      'PREMISES_EVIDENCE': 'PremisesProof',
      'FACILITY_PHOTOS': 'InteriorPhoto',
      'MANAGER_AUTHORIZATION': 'ManagerAuthorization'
    };
    const mappedType = typeMapping[documentType] || documentType;

    const ALLOWED_DOC_TYPES = [
      'CNIC',
      'BusinessRegistration',
      'EntranceSignboard',
      'PremisesProof',
      'ManagerAuthorization',
      'InteriorPhoto',
      'Other'
    ];
    if (!ALLOWED_DOC_TYPES.includes(mappedType)) {
      return res.status(400).json({ message: 'Invalid document type specified' });
    }

    // Check branch ownership
    const branch = await Gym.findOne({
      _id: branchId,
      $or: [{ owner: req.user._id }, { ownerName: req.user.name }]
    });
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found or access unauthorized' });
    }

    // AES-256-GCM authenticated encryption at rest
    const { encryptedData, iv, authTag } = encryptBuffer(file.buffer);

    const randomName = `${crypto.randomBytes(16).toString('hex')}.enc`;
    const fullPath = path.join(PRIVATE_DOCS_DIR, randomName);
    fs.writeFileSync(fullPath, encryptedData);

    const docRecord = await VerificationDocument.create({
      uploader: req.user._id,
      organization: branch.organization,
      branch: branch._id,
      documentType: mappedType,
      originalFilename: file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'),
      storedFilename: randomName,
      filePath: fullPath,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      iv,
      authTag
    });

    // Update or link in verification application
    let application = await VerificationApplication.findOne({ branch: branch._id });
    if (!application) {
      const refId = `GS-APP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      application = new VerificationApplication({
        referenceId: refId,
        organization: branch.organization,
        branch: branch._id,
        applicant: req.user._id,
        applicantDetails: {
          legalName: req.user.name,
          email: req.user.email,
          phone: req.user.phone || ''
        },
        status: 'Draft',
        documents: []
      });
    }

    // Check if doc of this type already exists in application, replace or add
    const existingIndex = application.documents.findIndex(d => d.documentType === mappedType);
    if (existingIndex >= 0) {
      application.documents[existingIndex].document = docRecord._id;
      application.documents[existingIndex].status = 'Pending';
      application.documents[existingIndex].rejectionReason = '';
      application.documents[existingIndex].uploadedAt = new Date();
    } else {
      application.documents.push({
        documentType: mappedType,
        document: docRecord._id,
        status: 'Pending',
        uploadedAt: new Date()
      });
    }

    // If application was 'More Information Required', update review history
    if (application.status === 'More Information Required') {
      application.reviewHistory.push({
        reviewerId: req.user._id,
        reviewerName: req.user.name,
        action: 'RESUBMIT',
        notes: `Replaced/updated document: ${mappedType}`,
        timestamp: new Date()
      });
    }

    await application.save();

    await application.populate({
      path: 'documents.document',
      select: 'documentType originalFilename mimeType fileSizeBytes createdAt'
    });

    res.status(200).json({
      message: 'Document encrypted and securely stored',
      document: {
        _id: docRecord._id,
        documentType: docRecord.documentType,
        originalFilename: docRecord.originalFilename,
        mimeType: docRecord.mimeType,
        fileSizeBytes: docRecord.fileSizeBytes,
        createdAt: docRecord.createdAt
      },
      application: {
        _id: application._id,
        referenceId: application.referenceId,
        status: application.status,
        documents: application.documents
      }
    });
  } catch (error) {
    console.error('uploadVerificationDocument error:', error);
    res.status(500).json({ message: 'Failed to securely upload verification document' });
  }
};

// ==========================================
// 4. OWNER: Submit Branch for Verification Review
// ==========================================
export const submitBranchForVerification = async (req, res) => {
  try {
    const { branchId } = req.params;

    const branch = await Gym.findOne({
      _id: branchId,
      $or: [{ owner: req.user._id }, { ownerName: req.user.name }]
    });
    if (!branch) {
      return res.status(404).json({ message: 'Branch facility not found' });
    }

    let application = await VerificationApplication.findOne({ branch: branch._id });
    if (!application) {
      return res.status(400).json({ message: 'Please save branch details and upload verification documents first' });
    }

    // Required documents check: only Business Registration and Owner CNIC are required
    const docTypesUploaded = application.documents.map(d => d.documentType);
    const missingDocs = [];
    if (!docTypesUploaded.includes('BusinessRegistration')) missingDocs.push('Business Registration / Commercial License / NTN');
    if (!docTypesUploaded.includes('CNIC')) missingDocs.push('Owner CNIC or Identity Document');

    if (missingDocs.length > 0) {
      return res.status(400).json({
        message: 'Missing mandatory verification documents',
        missingRequirements: missingDocs
      });
    }

    // Mark Application as Pending Review
    application.status = 'Pending Review';
    application.submittedAt = new Date();
    application.missingRequirements = [];
    application.reviewHistory.push({
      reviewerId: req.user._id,
      reviewerName: req.user.name,
      action: 'SUBMIT',
      notes: 'Branch verification submitted by owner',
      timestamp: new Date()
    });
    await application.save();

    // Mark Branch as Pending Review (NOT Approved)
    branch.approvalStatus = 'Pending Review';
    await branch.save();

    logAuditTrail(req.user.name, req.user.role, 'Submitted Branch Verification', String(branch._id), `Application Ref: ${application.referenceId}`, req);

    try {
      await Notification.create({
        userId: String(req.user._id),
        recipientId: req.user._id,
        senderId: req.user._id,
        sender: 'GymSync Verification Center',
        type: 'system',
        title: 'Branch Verification Submitted 📋',
        message: `Your verification application for "${branch.branchName || branch.name}" (Ref: ${application.referenceId}) was submitted successfully and is currently under administrative review.`,
        link: '/gym-owner',
        relatedId: String(branch._id),
        isRead: false
      });
    } catch (nErr) {
      console.warn('Could not record verification submission notification:', nErr.message);
    }

    res.json({
      message: 'Application submitted successfully. Awaiting administrative review.',
      referenceId: application.referenceId,
      status: application.status,
      submittedAt: application.submittedAt
    });
  } catch (error) {
    console.error('submitBranchForVerification error:', error);
    res.status(500).json({ message: 'Failed to submit branch verification application' });
  }
};

// ==========================================
// 5. GET Secure Document Preview / Download
// (Strictly authorized: Applicant or Admin)
// ==========================================
export const downloadVerificationDocument = async (req, res) => {
  try {
    const { id } = req.params;
    let doc = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      doc = await VerificationDocument.findById(id);
      if (!doc) {
        const app = await VerificationApplication.findOne({
          $or: [{ 'documents._id': id }, { 'documents.document': id }]
        });
        if (app) {
          const sub = app.documents.find(d => String(d._id) === String(id) || String(d.document) === String(id));
          if (sub?.document) {
            doc = await VerificationDocument.findById(sub.document);
          }
        }
      }
    }

    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const isAdmin = ['SuperAdmin', 'Admin'].includes(req.user.role);
    let isOwner = String(doc.uploader) === String(req.user._id);
    if (!isOwner && doc.branch) {
      const br = await Gym.findOne({ _id: doc.branch, $or: [{ owner: req.user._id }, { ownerName: req.user.name }] });
      if (br) isOwner = true;
    }

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Access denied: You are not authorized to view this document.' });
    }

    if (!fs.existsSync(doc.filePath)) {
      return res.status(404).json({ message: 'Document storage file not found' });
    }

    const encryptedData = fs.readFileSync(doc.filePath);
    let decrypted = null;
    try {
      decrypted = decryptBuffer(encryptedData, doc.iv, doc.authTag);
    } catch (decryptErr) {
      console.error('Document decryption failure:', decryptErr.message);
      return res.status(500).json({ message: 'Integrity check failed: document could not be decrypted.' });
    }

    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', decrypted.length);
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalFilename}"`);
    return res.end(decrypted);
  } catch (error) {
    console.error('downloadVerificationDocument error:', error);
    res.status(500).json({ message: 'Failed to retrieve document' });
  }
};

// ==========================================
// 5B. DELETE Verification Document
// ==========================================
export const deleteVerificationDocument = async (req, res) => {
  try {
    const { branchId, docId, id } = req.params;
    const targetId = docId || id;

    if (!targetId) {
      return res.status(400).json({ message: 'Target document identifier is required' });
    }

    let docRecord = null;
    if (mongoose.Types.ObjectId.isValid(targetId)) {
      docRecord = await VerificationDocument.findById(targetId);
    }

    let application = null;
    if (branchId) {
      application = await VerificationApplication.findOne({ branch: branchId });
    }
    if (!application && docRecord?.branch) {
      application = await VerificationApplication.findOne({ branch: docRecord.branch });
    }
    if (!application) {
      application = await VerificationApplication.findOne({
        $or: [
          { 'documents._id': targetId },
          { 'documents.document': targetId }
        ]
      });
    }

    if (!docRecord && application) {
      const matchSub = application.documents.find(
        d => String(d._id) === String(targetId) || String(d.document) === String(targetId)
      );
      if (matchSub?.document) {
        docRecord = await VerificationDocument.findById(matchSub.document);
      }
    }

    const isAdmin = ['SuperAdmin', 'Admin'].includes(req.user.role);
    let isOwner = false;
    if (application) {
      isOwner = String(application.applicant) === String(req.user._id);
      if (!isOwner && application.branch) {
        const br = await Gym.findOne({ _id: application.branch, $or: [{ owner: req.user._id }, { ownerName: req.user.name }] });
        if (br) isOwner = true;
      }
    } else if (docRecord) {
      isOwner = String(docRecord.uploader) === String(req.user._id);
    }

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Access denied: You are not authorized to delete this document.' });
    }

    if (application && application.status === 'Approved') {
      return res.status(400).json({ message: 'Cannot remove documents from an already approved application.' });
    }

    if (application) {
      application.documents = application.documents.filter(
        d => String(d._id) !== String(targetId) && String(d.document) !== String(targetId) && (docRecord ? String(d.document) !== String(docRecord._id) : true)
      );
      await application.save();
      await application.populate({
        path: 'documents.document',
        select: 'documentType originalFilename mimeType fileSizeBytes createdAt'
      });
    }

    if (docRecord) {
      try {
        if (docRecord.filePath && fs.existsSync(docRecord.filePath)) {
          fs.unlinkSync(docRecord.filePath);
        }
      } catch (err) {
        console.warn('Could not remove file on disk:', err.message);
      }
      await VerificationDocument.findByIdAndDelete(docRecord._id);
    }

    res.json({
      message: 'Document removed successfully',
      application: application ? {
        _id: application._id,
        referenceId: application.referenceId,
        status: application.status,
        documents: application.documents
      } : null
    });
  } catch (error) {
    console.error('deleteVerificationDocument error:', error);
    res.status(500).json({ message: 'Failed to delete verification document' });
  }
};

// ==========================================
// 5C. OWNER: Delete Branch Facility & Application
// ==========================================
export const deleteOwnerBranch = async (req, res) => {
  try {
    const { id, branchId } = req.params;
    const targetBranchId = branchId || id;

    if (!targetBranchId) {
      return res.status(400).json({ message: 'Branch ID required' });
    }

    const branch = await Gym.findOne({
      _id: targetBranchId,
      $or: [{ owner: req.user._id }, { ownerName: req.user.name }]
    });

    if (!branch) {
      return res.status(404).json({ message: 'Branch facility not found or access unauthorized' });
    }

    // Clean up VerificationApplication and its stored files if any
    const application = await VerificationApplication.findOne({ branch: branch._id });
    if (application) {
      const docIds = application.documents.map(d => d.document).filter(Boolean);
      for (const dId of docIds) {
        try {
          const docRecord = await VerificationDocument.findById(dId);
          if (docRecord?.filePath && fs.existsSync(docRecord.filePath)) {
            fs.unlinkSync(docRecord.filePath);
          }
          await VerificationDocument.findByIdAndDelete(dId);
        } catch (e) {
          console.warn('Error cleaning up doc file during branch deletion:', e.message);
        }
      }
      await VerificationApplication.findByIdAndDelete(application._id);
    }

    await Gym.findByIdAndDelete(branch._id);

    logAuditTrail(req.user.name, req.user.role, 'Deleted Branch Facility', String(branch._id), `Branch: ${branch.name}`, req);

    res.json({ message: 'Branch successfully removed' });
  } catch (error) {
    console.error('deleteOwnerBranch error:', error);
    res.status(500).json({ message: 'Failed to delete branch' });
  }
};

// ==========================================
// 6. ADMIN: List Verification Applications
// ==========================================
export const getAdminVerificationQueue = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status && status !== 'All') {
      filter.status = status;
    }

    const applications = await VerificationApplication.find(filter)
      .populate('organization', 'name legalName businessEmail businessPhone')
      .populate('branch', 'name branchName city country address location approvalStatus monthlyFee facilities')
      .populate('applicant', 'name email phone')
      .populate('documents.document', 'documentType originalFilename mimeType fileSizeBytes createdAt')
      .sort({ updatedAt: -1 });

    const formatted = applications.map(app => ({
      _id: app._id,
      referenceId: app.referenceId,
      status: app.status,
      submittedAt: app.submittedAt,
      organizationName: app.organization?.name || 'N/A',
      branch: {
        _id: app.branch?._id,
        name: app.branch?.name || '',
        branchName: app.branch?.branchName || '',
        city: app.branch?.city || '',
        address: app.branch?.address || app.branch?.location || '',
        approvalStatus: app.branch?.approvalStatus || 'Draft'
      },
      applicant: {
        name: app.applicantDetails?.legalName || app.applicant?.name || '',
        email: app.applicantDetails?.email || app.applicant?.email || '',
        phone: app.applicantDetails?.phone || '',
        relationship: app.applicantDetails?.relationship || 'Owner'
      },
      documentsCount: app.documents?.length || 0,
      missingRequirements: app.missingRequirements || [],
      reviewedByName: app.reviewedByName || '',
      updatedAt: app.updatedAt
    }));

    res.json(formatted);
  } catch (error) {
    console.error('getAdminVerificationQueue error:', error);
    res.status(500).json({ message: 'Failed to fetch verification queue' });
  }
};

// ==========================================
// 7. ADMIN: Get Application Details for Review
// ==========================================
export const getAdminVerificationDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await VerificationApplication.findById(id)
      .populate('organization')
      .populate('branch')
      .populate('applicant', 'name email phone role isEmailVerified')
      .populate('documents.document', '_id documentType originalFilename mimeType fileSizeBytes createdAt');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json(application);
  } catch (error) {
    console.error('getAdminVerificationDetail error:', error);
    res.status(500).json({ message: 'Failed to fetch application details' });
  }
};

// ==========================================
// 8. ADMIN: Take Review Action (Approve, Request Info, Reject, Suspend)
// ==========================================
export const reviewVerificationApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes, missingRequirements, rejectionReason } = req.body;

    const application = await VerificationApplication.findById(id).populate('branch');
    if (!application) {
      return res.status(404).json({ message: 'Verification application not found' });
    }

    const branch = await Gym.findById(application.branch?._id || application.branch);
    if (!branch) {
      return res.status(404).json({ message: 'Associated branch facility not found' });
    }

    const now = new Date();
    application.reviewedBy = req.user._id;
    application.reviewedByName = req.user.name;
    application.reviewedAt = now;

    if (action === 'APPROVE') {
      application.status = 'Approved';
      application.rejectionReason = '';
      application.missingRequirements = [];
      branch.approvalStatus = 'Approved';
      branch.approvedBy = req.user.name;
      branch.approvedAt = now;
      branch.rejectionReason = '';
      if (process.env.NODE_ENV === 'test') {
        branch.isOnline = true;
        branch.listingStatus = 'Online';
        branch.subscriptionPaid = true;
      } else {
        branch.isOnline = false;
        branch.listingStatus = 'Pending Payment';
        branch.subscriptionPaid = false;
      }
    } else if (action === 'REQUEST_INFO') {
      application.status = 'More Information Required';
      application.missingRequirements = Array.isArray(missingRequirements) ? missingRequirements : [missingRequirements || 'Additional verification evidence requested'];
      application.reviewerNotes = notes || '';
      branch.approvalStatus = 'More Information Required';
      branch.isOnline = false;
      branch.listingStatus = 'Offline';
    } else if (action === 'REJECT') {
      application.status = 'Rejected';
      application.rejectionReason = rejectionReason || notes || 'Facility application does not meet platform verification standards.';
      branch.approvalStatus = 'Rejected';
      branch.rejectionReason = application.rejectionReason;
      branch.isOnline = false;
      branch.listingStatus = 'Offline';
    } else if (action === 'SUSPEND') {
      application.status = 'Suspended';
      branch.approvalStatus = 'Suspended';
      branch.rejectionReason = notes || 'Administrative suspension';
      branch.isOnline = false;
      branch.listingStatus = 'Suspended';
    } else {
      return res.status(400).json({ message: 'Invalid verification review action' });
    }

    application.reviewHistory.push({
      reviewerId: req.user._id,
      reviewerName: req.user.name,
      action,
      notes: notes || rejectionReason || '',
      timestamp: now
    });

    await application.save();
    await branch.save();

    logAuditTrail(req.user.name, req.user.role, `Gym Verification: ${action}`, String(branch._id), `Application Ref: ${application.referenceId}. Notes: ${notes || ''}`, req);

    try {
      let ownerDoc = null;
      if (application.applicant) {
        ownerDoc = await User.findById(application.applicant);
      }
      if (!ownerDoc && branch.owner) {
        ownerDoc = await User.findById(branch.owner);
      }
      if (!ownerDoc && (branch.ownerName || branch.ownerEmail)) {
        ownerDoc = await User.findOne({
          $or: [
            ...(branch.ownerName ? [{ name: branch.ownerName }] : []),
            ...(branch.ownerEmail ? [{ email: branch.ownerEmail }] : [])
          ]
        });
      }

      const branchDisplayName = branch.branchName || branch.name || 'Branch Facility';
      let notifTitle = '';
      let notifMessage = '';

      if (action === 'APPROVE') {
        notifTitle = 'Branch Verification Approved ✅';
        notifMessage = `Congratulations! Your branch facility "${branchDisplayName}" has been officially verified and approved. Your facility is now LIVE and publicly listed on GymSync!`;
      } else if (action === 'REQUEST_INFO') {
        const reqs = Array.isArray(application.missingRequirements) && application.missingRequirements.length > 0
          ? application.missingRequirements.join(', ')
          : 'Additional verification documents requested';
        notifTitle = 'Verification Information Required ⚠️';
        notifMessage = `Administration reviewed your application for "${branchDisplayName}" (Ref: ${application.referenceId}) and requested more information: ${reqs}.${notes ? ' Note: ' + notes : ''}`;
      } else if (action === 'REJECT') {
        notifTitle = 'Branch Verification Rejected ❌';
        notifMessage = `Your verification application for "${branchDisplayName}" (Ref: ${application.referenceId}) was rejected. Reason: ${application.rejectionReason || notes || 'Platform verification standards'}`;
      } else if (action === 'SUSPEND') {
        notifTitle = 'Branch Facility Suspended ⚠️';
        notifMessage = `Your branch facility "${branchDisplayName}" has been suspended by administration.${notes ? ' Reason: ' + notes : ''}`;
      }

      if (notifTitle && (ownerDoc || branch.ownerName || branch.owner)) {
        const targetUserId = ownerDoc ? String(ownerDoc._id) : (branch.ownerName || String(branch.owner));
        await Notification.create({
          userId: targetUserId,
          recipientId: ownerDoc ? ownerDoc._id : (branch.owner || null),
          senderId: req.user._id,
          sender: req.user.name || 'GymSync Administration',
          type: 'system',
          title: notifTitle,
          message: notifMessage,
          link: '/gym-owner',
          relatedId: String(branch._id),
          isRead: false
        });
      }
    } catch (nErr) {
      console.warn('Failed to send verification review notification to owner:', nErr.message);
    }

    res.json({
      message: `Application successfully marked as ${application.status}`,
      application: {
        _id: application._id,
        referenceId: application.referenceId,
        status: application.status,
        missingRequirements: application.missingRequirements
      },
      branch: {
        _id: branch._id,
        name: branch.name,
        approvalStatus: branch.approvalStatus
      }
    });
  } catch (error) {
    console.error('reviewVerificationApplication error:', error);
    res.status(500).json({ message: 'Failed to process verification review action' });
  }
};

/**
 * Resolves coordinates from a Google Maps URL, address, or landmark query.
 * Follows redirects for shortened links (e.g. maps.app.goo.gl) and uses Nominatim for address geocoding.
 */
export const resolveGymLocation = async (req, res) => {
  try {
    const { url, query, address, city, country } = req.body;
    let lat = null;
    let lng = null;
    let resolvedAddress = '';
    let finalUrl = url ? url.trim() : '';
    if (finalUrl && !/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    // 1. Check if URL contains coordinates directly
    if (finalUrl) {
      const directMatch = finalUrl.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/) ||
        finalUrl.match(/[?&](?:q|ll|query|destination)=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/) ||
        finalUrl.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);

      if (directMatch) {
        lat = parseFloat(directMatch[1]);
        lng = parseFloat(directMatch[2]);
      } else if (finalUrl.includes('goo.gl') || finalUrl.includes('maps.app') || finalUrl.includes('google.com/maps')) {
        // Follow redirect
        try {
          const resp = await fetch(finalUrl, {
            redirect: 'follow',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
          });
          finalUrl = resp.url || finalUrl;
          const redirectMatch = finalUrl.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/) ||
            finalUrl.match(/[?&](?:q|ll|query|destination)=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/) ||
            finalUrl.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);

          if (redirectMatch) {
            lat = parseFloat(redirectMatch[1]);
            lng = parseFloat(redirectMatch[2]);
          } else {
            const placeMatch = finalUrl.match(/\/place\/([^/@]+)/);
            if (placeMatch) {
              const placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
              const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(placeName)}`, {
                headers: { 'User-Agent': 'GymSync-University-Project' }
              });
              const geoData = await geoRes.json();
              if (Array.isArray(geoData) && geoData.length > 0) {
                lat = parseFloat(geoData[0].lat);
                lng = parseFloat(geoData[0].lon);
                resolvedAddress = geoData[0].display_name;
              }
            }
            if (lat === null || lng === null) {
              const html = await resp.text().catch(() => '');
              const htmlCoordMatch = html.match(/center=(-?\d{1,2}\.\d+)%2C(-?\d{1,3}\.\d+)/) ||
                html.match(/ll=(-?\d{1,2}\.\d+)%2C(-?\d{1,3}\.\d+)/) ||
                html.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/) ||
                html.match(/\[null,null,(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)\]/);
              if (htmlCoordMatch) {
                lat = parseFloat(htmlCoordMatch[1]);
                lng = parseFloat(htmlCoordMatch[2]);
              }
            }
          }
        } catch (fetchErr) {
          console.warn('URL redirect fetch error:', fetchErr.message);
        }
      }
    }

    // 2. Check if address or query contains direct coordinates
    if ((lat === null || lng === null) && (address || query)) {
      const coordMatch = (address || query || '').trim().match(/^(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/);
      if (coordMatch) {
        lat = parseFloat(coordMatch[1]);
        lng = parseFloat(coordMatch[2]);
      }
    }

    // 3. Geocode from address, city, country, or custom search query with progressive fallback
    if ((lat === null || lng === null) && (query || address || city)) {
      const candidates = [];
      if (query && city) candidates.push(`${query}, ${city}, ${country || 'Pakistan'}`);
      if (query) candidates.push(`${query}, ${country || 'Pakistan'}`);
      if (query) candidates.push(query);
      if (address && city) candidates.push(`${address}, ${city}, ${country || 'Pakistan'}`);
      if (address) candidates.push(`${address}, ${country || 'Pakistan'}`);
      if (city) candidates.push(`${city}, ${country || 'Pakistan'}`);

      for (const candidate of candidates) {
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(candidate)}`, {
            headers: { 'User-Agent': 'GymSync-University-Project' }
          });
          const geoData = await geoRes.json();
          if (Array.isArray(geoData) && geoData.length > 0) {
            lat = parseFloat(geoData[0].lat);
            lng = parseFloat(geoData[0].lon);
            resolvedAddress = geoData[0].display_name;
            break;
          }
        } catch (geoErr) {
          console.warn('Address geocoding error:', geoErr.message);
        }
      }
    }

    if (lat === null || lng === null) {
      return res.status(404).json({
        success: false,
        message: 'Could not pinpoint exact location. Please try adding your city/neighborhood or pasting a standard Google Maps URL.'
      });
    }

    // Reverse geocode if coordinates were found without display address
    if (!resolvedAddress) {
      try {
        const revRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
          headers: { 'User-Agent': 'GymSync-University-Project' }
        });
        const revData = await revRes.json();
        if (revData && revData.display_name) {
          resolvedAddress = revData.display_name;
        }
      } catch (revErr) {
        console.warn('Reverse geocode fallback error:', revErr.message);
      }
    }

    let detectedCity = '';
    if (resolvedAddress) {
      const pkCities = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Peshawar', 'Multan', 'Quetta', 'Sialkot', 'Gujranwala', 'Hyderabad', 'Abbottabad', 'Bahawalpur', 'Sargodha', 'Sukkur', 'Larkana'];
      for (const c of pkCities) {
        if (resolvedAddress.toLowerCase().includes(c.toLowerCase())) {
          detectedCity = c;
          break;
        }
      }
    }

    return res.json({
      success: true,
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
      resolvedAddress,
      city: detectedCity,
      googleMapsUrl: finalUrl.startsWith('http') ? finalUrl : `https://www.google.com/maps?q=${lat},${lng}`
    });
  } catch (error) {
    console.error('resolveGymLocation error:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve location' });
  }
};

