import Post from '../models/Post.js';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchAllPosts, insertPost, updatePostLikes, appendPostComment, removePost } from '../services/supabaseService.js';
import { uploadToSupabaseStorage } from '../config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');

// @desc    Get all posts
// @route   GET /api/posts
// @access  Public
export const getPosts = async (req, res) => {
  try {
    const posts = await fetchAllPosts();

    const sanitizedPosts = (posts || []).map(p => {
      if (p && p.mediaUrl && typeof p.mediaUrl === 'string' && p.mediaUrl.startsWith('/uploads/')) {
        try {
          const fileName = p.mediaUrl.replace('/uploads/', '');
          const localPath = path.join(uploadsDir, fileName);
          if (!fs.existsSync(localPath)) {
            p.mediaUrl = '';
          }
        } catch (fsErr) {
          p.mediaUrl = '';
        }
      }
      return p;
    });

    res.json(sanitizedPosts);
  } catch (error) {
    console.error('getPosts error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a post
// @route   POST /api/posts
// @access  Private
export const createPost = async (req, res) => {
  const { content } = req.body;
  let mediaUrl = '';
  
  if (req.file) {
    let supaUrl = null;
    if (req.file.buffer) {
      supaUrl = await uploadToSupabaseStorage({
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
        folder: 'posts'
      });
    } else if (req.file.path && fs.existsSync(req.file.path)) {
      const buffer = fs.readFileSync(req.file.path);
      supaUrl = await uploadToSupabaseStorage({
        buffer,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname || req.file.filename,
        folder: 'posts'
      });
    }

    if (supaUrl) {
      mediaUrl = supaUrl;
    } else if (req.file.buffer) {
      mediaUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    } else {
      mediaUrl = `/uploads/${req.file.filename}`;
    }
  } else if (req.body.mediaUrl) {
    mediaUrl = req.body.mediaUrl;
  }

  try {
    if (!content?.trim() && !mediaUrl) {
      return res.status(400).json({ message: 'Add text or media before publishing.' });
    }

    const authorId = req.user?._id || new mongoose.Types.ObjectId();
    const authorName = req.user?.name || 'User';
    const authorRole = req.user?.role || 'User';

    const createdPost = await insertPost({
      authorId,
      authorName,
      authorRole,
      content: content?.trim() || '',
      mediaUrl
    });

    res.status(201).json(createdPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle Like on a post
// @route   PUT /api/posts/:id/like
// @access  Private
export const toggleLike = async (req, res) => {
  const userId = req.user.name;
  
  try {
    const result = await updatePostLikes(req.params.id, userId);
    if (!result) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const isLiked = (result.likes || []).includes(userId);
    if (isLiked) {
      const post = await Post.findById(req.params.id).lean().catch(() => null);
      if (post && post.authorName && post.authorName !== userId) {
        await Notification.findOneAndUpdate(
          { eventKey: `post-like:${post._id}:${userId}` },
          {
            $set: {
              userId: post.authorName,
              type: 'like',
              message: `${userId} liked your post.`,
              link: '/home',
              isRead: false
            },
            $setOnInsert: { eventKey: `post-like:${post._id}:${userId}` }
          },
          { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        ).catch(() => {});
      }
    } else {
      await Notification.deleteMany({ eventKey: `post-like:${req.params.id}:${userId}` }).catch(() => {});
    }

    res.json({ likes: result.likes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a comment to a post
// @route   POST /api/posts/:id/comment
// @access  Private
export const addComment = async (req, res) => {
  const { text } = req.body;
  try {
    if (!text?.trim()) return res.status(400).json({ message: 'Comment cannot be empty.' });
    const newComment = { text: text.trim(), author: req.user.name, date: new Date(), replies: [] };
    const comments = await appendPostComment(req.params.id, newComment);
    if (!comments) return res.status(404).json({ message: 'Post not found' });

    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Add a reply to a comment
// @route   POST /api/posts/:id/comment/:commentId/reply
// @desc    Add a reply to a comment
// @route   POST /api/posts/:id/comment/:commentId/reply
// @access  Private
export const addReply = async (req, res) => {
  const { text } = req.body;
  try {
    if (!text?.trim()) return res.status(400).json({ message: 'Reply text is required' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    comment.replies.push({ text: text.trim(), author: req.user.name, date: new Date() });
    await post.save();

    res.json(post.comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete a reply
// @route   DELETE /api/posts/:id/comment/:commentId/reply/:replyId
// @access  Private
export const deleteReply = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) return res.status(404).json({ message: 'Reply not found' });

    const isModerator = ['Admin', 'SuperAdmin', 'ComplaintModerator'].includes(req.user.role);
    if (reply.author !== req.user.name && !isModerator) {
      return res.status(403).json({ message: 'You can only delete your own replies.' });
    }

    comment.replies.pull(req.params.replyId);
    await post.save();

    res.json(post.comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Edit a reply
// @route   PUT /api/posts/:id/comment/:commentId/reply/:replyId
// @access  Private
export const editReply = async (req, res) => {
  const { text } = req.body;
  try {
    if (!text?.trim()) return res.status(400).json({ message: 'Reply text is required' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) return res.status(404).json({ message: 'Reply not found' });

    const isModerator = ['Admin', 'SuperAdmin', 'ComplaintModerator'].includes(req.user.role);
    if (reply.author !== req.user.name && !isModerator) {
      return res.status(403).json({ message: 'You can only edit your own replies.' });
    }

    reply.text = text.trim();
    await post.save();

    res.json(post.comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Report a post (Community moderation)
// @route   POST /api/posts/:id/report
// @access  Public / User
export const reportPost = async (req, res) => {
  try {
    const { reason, explanation } = req.body;
    const reporterName = req.user.name;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (!post.reportedBy) post.reportedBy = [];
    
    // Check if already reported by this user
    const alreadyReported = post.reportedBy.some(r => r.userName === reporterName);
    if (!alreadyReported) {
      post.reportedBy.push({
        userName: reporterName,
        reason: reason || 'Inappropriate',
        explanation: explanation || ''
      });
      post.reportCount = (post.reportCount || 0) + 1;
      await post.save();
    }

    res.json({ message: 'Post reported to moderators', reportCount: post.reportCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private
export const deletePost = async (req, res) => {
  try {
    const isModerator = ['Admin', 'SuperAdmin', 'ComplaintModerator'].includes(req.user.role);
    const removed = await removePost(req.params.id, req.user.name, isModerator);
    if (!removed) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json({ message: 'Post removed' });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return res.status(403).json({ message: 'You can only delete your own posts.' });
    }
    res.status(500).json({ message: error.message });
  }
};
