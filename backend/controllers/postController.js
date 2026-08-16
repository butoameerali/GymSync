import Post from '../models/Post.js';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';

// @desc    Get all posts
// @route   GET /api/posts
// @access  Public
export const getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'name role')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
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
    if (req.file.buffer) {
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

    const post = new Post({
      author: authorId,
      authorName: req.user?.name || 'User',
      authorRole: req.user?.role || 'User',
      content: content?.trim() || '',
      mediaUrl,
      likes: [],
      comments: []
    });

    const createdPost = await post.save();
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
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const isLiked = post.likes.includes(userId);
    if (isLiked) {
      post.likes = post.likes.filter(id => id !== userId);
      // A removed like should not leave an old alert behind, nor create another
      // one if the member likes the post again later.
      await Notification.deleteMany({ eventKey: `post-like:${post._id}:${userId}` });
    } else {
      post.likes.push(userId);
      if (post.authorName && post.authorName !== userId) {
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
        );
      }
    }

    await post.save();
    res.json({ likes: post.likes });
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
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const newComment = { text: text.trim(), author: req.user.name, date: new Date(), replies: [] };
    post.comments.push(newComment);
    await post.save();

    res.json(post.comments);
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
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    const isModerator = ['Admin', 'SuperAdmin', 'ComplaintModerator'].includes(req.user.role);
    if (post.authorName !== req.user.name && !isModerator) {
      return res.status(403).json({ message: 'You can only delete your own posts.' });
    }
    await post.deleteOne();
    res.json({ message: 'Post removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
