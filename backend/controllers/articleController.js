import Article from '../models/Article.js';

const INITIAL_ARTICLES = [
  {
    title: '5 Essential Rules for Progressive Overload',
    content: 'Progressive overload involves gradually increasing the weight, frequency, or number of repetitions in your strength training routine. This challenges your body and allows your musculoskeletal system to get stronger.',
    author: 'Fitness Instructor',
    authorRole: 'FitnessInstructor',
    category: 'Hypertrophy',
    readTime: '4 min',
    tags: ['Hypertrophy', 'Strength', 'Basics']
  },
  {
    title: 'Optimizing Post-Workout Protein Synthesis',
    content: 'Consuming high-quality protein within 2 hours after your workout delivers the essential amino acids required to rebuild and repair muscle fibers damaged during intense exercise.',
    author: 'Fitness Instructor',
    authorRole: 'FitnessInstructor',
    category: 'Nutrition',
    readTime: '6 min',
    tags: ['Nutrition', 'Protein', 'Recovery']
  }
];

// @desc    Get all educational articles
// @route   GET /api/articles
// @access  Public
export const getArticles = async (req, res) => {
  try {
    let articles = await Article.find().sort({ createdAt: -1 });

    if (articles.length === 0) {
      try {
        articles = await Article.insertMany(INITIAL_ARTICLES);
      } catch (e) {
        return res.json(INITIAL_ARTICLES);
      }
    }

    res.json(articles);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch articles', error: error.message });
  }
};

// @desc    Create new educational article
// @route   POST /api/articles
// @access  Private / FitnessInstructor, Admin, SuperAdmin
export const createArticle = async (req, res) => {
  try {
    const { title, content, category, readTime, tags } = req.body;
    const author = req.user?.name || 'Fitness Instructor';
    const authorRole = req.user?.role || 'FitnessInstructor';

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const article = await Article.create({
      title,
      content,
      author,
      authorRole,
      category: category || 'Training',
      readTime: readTime || '5 min',
      tags: Array.isArray(tags) ? tags : (tags ? String(tags).split(',').map(t => t.trim()) : [])
    });

    res.status(201).json(article);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create article', error: error.message });
  }
};

// @desc    Update an article
// @route   PUT /api/articles/:id
// @access  Private / FitnessInstructor, Admin, SuperAdmin
export const updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, readTime, tags } = req.body;

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    const isModerator = ['Admin', 'SuperAdmin'].includes(req.user?.role);
    if (article.author !== req.user?.name && !isModerator) {
      return res.status(403).json({ message: 'You can only edit your own articles' });
    }

    if (title) article.title = title;
    if (content) article.content = content;
    if (category) article.category = category;
    if (readTime) article.readTime = readTime;
    if (tags) {
      article.tags = Array.isArray(tags) ? tags : String(tags).split(',').map(t => t.trim());
    }

    await article.save();
    res.json(article);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update article', error: error.message });
  }
};

// @desc    Delete an article
// @route   DELETE /api/articles/:id
// @access  Private / FitnessInstructor, Admin, SuperAdmin
export const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    const isModerator = ['Admin', 'SuperAdmin'].includes(req.user?.role);
    if (article.author !== req.user?.name && !isModerator) {
      return res.status(403).json({ message: 'You can only delete your own articles' });
    }

    await Article.findByIdAndDelete(id);
    res.json({ message: 'Article deleted successfully', id });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete article', error: error.message });
  }
};
