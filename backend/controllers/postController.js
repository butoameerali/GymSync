import Post from '../models/Post.js';

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
  const { content, authorId, authorName, authorRole } = req.body;
  let mediaUrl = '';
  
  if (req.file) {
    mediaUrl = `/uploads/${req.file.filename}`;
  } else if (req.body.mediaUrl) {
    mediaUrl = req.body.mediaUrl;
  }

  try {
    const post = new Post({
      authorName: authorName || 'Unknown User',
      authorRole: authorRole || 'user',
      content,
      mediaUrl,
      likes: [],
      comments: []
    });

    const createdPost = await post.save();
    res.status(201).json(createdPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle Like on a post
// @route   PUT /api/posts/:id/like
// @access  Private
export const toggleLike = async (req, res) => {
  const { userId } = req.body; // Using a generic string ID or Name for FYP demo
  
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const isLiked = post.likes.includes(userId);
    if (isLiked) {
      post.likes = post.likes.filter(id => id !== userId);
    } else {
      post.likes.push(userId);
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
  const { text, authorName } = req.body;
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const newComment = { text, author: authorName || 'Unknown User', date: new Date(), replies: [] };
    post.comments.push(newComment);
    await post.save();

    res.json(post.comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Add a reply to a comment
// @route   POST /api/posts/:id/comment/:commentId/reply
// @access  Private
export const addReply = async (req, res) => {
  const { text, authorName } = req.body;
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    comment.replies.push({ text, author: authorName || 'Unknown User', date: new Date() });
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
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) return res.status(404).json({ message: 'Reply not found' });

    reply.text = text;
    await post.save();

    res.json(post.comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json({ message: 'Post removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
