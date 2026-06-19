import express from 'express';
import { getUsers, getUserByName, updateProfilePic, sendFriendRequest, acceptFriendRequest, unfriend, followUser, unfollowUser } from '../controllers/userController.js';

const router = express.Router();

router.route('/')
  .get(getUsers);

router.route('/profile-pic')
  .put(updateProfilePic);

router.route('/request')
  .post(sendFriendRequest);

router.route('/accept')
  .post(acceptFriendRequest);

router.route('/unfriend')
  .post(unfriend);

router.route('/follow')
  .post(followUser);

router.route('/unfollow')
  .post(unfollowUser);

router.route('/:name')
  .get(getUserByName);

export default router;
