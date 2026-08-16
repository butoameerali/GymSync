import express from 'express';
import { 
  getUsers, 
  getUserByName, 
  updateProfilePic, 
  updateGymMembershipSettings,
  sendFriendRequest, 
  acceptFriendRequest, 
  unfriend, 
  followUser, 
  unfollowUser,
  getUserDashboardData,
  getGymMembers,
  deleteCurrentUser,
  sendVerificationOTP,
  verifyEmailOTP
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/send-verification-otp')
  .post(protect, sendVerificationOTP);

router.route('/verify-email-otp')
  .put(protect, verifyEmailOTP);

router.route('/')
  .get(getUsers);

router.route('/dashboard/:name')
  .get(getUserDashboardData);

router.route('/gym-members/:gymName')
  .get(getGymMembers);

router.route('/profile-pic')
  .put(protect, updateProfilePic);

router.route('/membership-settings')
  .put(protect, updateGymMembershipSettings);

router.route('/me')
  .delete(protect, deleteCurrentUser);

router.route('/request')
  .post(protect, sendFriendRequest);

router.route('/accept')
  .post(protect, acceptFriendRequest);

router.route('/unfriend')
  .post(protect, unfriend);

router.route('/follow')
  .post(protect, followUser);

router.route('/unfollow')
  .post(protect, unfollowUser);

router.route('/:name')
  .get(getUserByName);

export default router;
