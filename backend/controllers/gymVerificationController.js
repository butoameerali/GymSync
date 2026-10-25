import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import Organization from '../models/Organization.js';
import Gym from '../models/Gym.js';
import VerificationApplication from '../models/VerificationApplication.js';
import VerificationDocument from '../models/VerificationDocument.js';
import User from '../models/User.js';
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
    }).populate('verificationApplication').sort({ createdAt: -1 });

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
        facilities: b.facilities || [],
        timings: b.timings || null,
        rejectionReason: b.rejectionReason || '',
        applicationId: b.verificationApplication?._id || null,
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
      facilities,
      timings,
      photos,
      applicantDetails
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
        monthlyFee: 50,
        admissionFee: 0,
        approvalStatus: 'Draft'
      });
    }

    // Update branch fields
    if (branchName) {
      branch.name = branchName.trim();
      branch.branchName = branchName.trim();
    }
    if (description !== undefined) branch.description = description;
    if (contactPhone !== undefined) branch.contactPhone = contactPhone;
    if (contactEmail !== undefined) branch.contactEmail = contactEmail;
    if (country !== undefined) branch.country = country;
    if (city !== undefined) branch.city = city;
    if (address !== undefined) {
      branch.address = address;
      branch.location = address;
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
    if (gymType !== undefined) branch.gymType = gymType;
    if (monthlyFee !== undefined) branch.monthlyFee = Number(monthlyFee) || 0;
    if (admissionFee !== undefined) branch.admissionFee = Number(admissionFee) || 0;
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
          relationship: applicantDetails?.relationship || 'Owner',
          preferredContactMethod: applicantDetails?.preferredContactMethod || 'Email'
        },
        status: 'Draft'
      });
    } else {
      if (applicantDetails) {
        if (applicantDetails.legalName) application.applicantDetails.legalName = applicantDetails.legalName;
        if (applicantDetails.email) application.applicantDetails.email = applicantDetails.email;
        if (applicantDetails.phone) application.applicantDetails.phone = applicantDetails.phone;
        if (applicantDetails.relationship) application.applicantDetails.relationship = applicantDetails.relationship;
        if (applicantDetails.preferredContactMethod) application.applicantDetails.preferredContactMethod = applicantDetails.preferredContactMethod;
      }
    }

    await application.save();

    branch.verificationApplication = application._id;
    await branch.save();

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

    // Required documents check
    const docTypesUploaded = application.documents.map(d => d.documentType);
    const missingDocs = [];
    if (!docTypesUploaded.includes('CNIC')) missingDocs.push('Owner CNIC or Identity Document');
    if (!docTypesUploaded.includes('EntranceSignboard')) missingDocs.push('Gym Entrance / Signboard Photo');

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
    const doc = await VerificationDocument.findById(id);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const isAdmin = ['SuperAdmin', 'Admin'].includes(req.user.role);
    const isOwner = String(doc.uploader) === String(req.user._id);

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

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Length', decrypted.length);
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalFilename}"`);
    return res.end(decrypted);
  } catch (error) {
    console.error('downloadVerificationDocument error:', error);
    res.status(500).json({ message: 'Failed to retrieve document' });
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
    } else if (action === 'REQUEST_INFO') {
      application.status = 'More Information Required';
      application.missingRequirements = Array.isArray(missingRequirements) ? missingRequirements : [missingRequirements || 'Additional verification evidence requested'];
      application.reviewerNotes = notes || '';
      branch.approvalStatus = 'More Information Required';
    } else if (action === 'REJECT') {
      application.status = 'Rejected';
      application.rejectionReason = rejectionReason || notes || 'Facility application does not meet platform verification standards.';
      branch.approvalStatus = 'Rejected';
      branch.rejectionReason = application.rejectionReason;
    } else if (action === 'SUSPEND') {
      application.status = 'Suspended';
      branch.approvalStatus = 'Suspended';
      branch.rejectionReason = notes || 'Administrative suspension';
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
