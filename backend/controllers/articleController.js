import Article from '../models/Article.js';
import { deleteFromSupabaseStorage } from '../config/supabase.js';

const INITIAL_ARTICLES = [
  {
    title: '5 Essential Rules for Progressive Overload',
    content: 'Progressive overload involves gradually increasing the weight, frequency, or number of repetitions in your strength training routine. This challenges your body and allows your musculoskeletal system to get stronger.',
    author: 'Fitness Instructor',
    authorRole: 'FitnessInstructor',
    category: 'Hypertrophy',
    readTime: '4 min',
    tags: ['Hypertrophy', 'Strength', 'Basics'],
    topics: ['Progressive Overload', 'Strength Progression'],
    relatedExerciseIds: ['bench-press', 'barbell-squat'],
    status: 'published'
  },
  {
    title: 'Optimizing Post-Workout Protein Synthesis',
    content: 'Consuming high-quality protein within 2 hours after your workout delivers the essential amino acids required to rebuild and repair muscle fibers damaged during intense exercise.',
    author: 'Fitness Instructor',
    authorRole: 'FitnessInstructor',
    category: 'Nutrition',
    readTime: '6 min',
    tags: ['Nutrition', 'Protein', 'Recovery'],
    topics: ['Protein Timing', 'Muscle Recovery'],
    status: 'published'
  },
  {
    title: 'Deadlift Biomechanics: Neutral Spine & Hip Hinge Masterclass',
    content: 'Lumbar flexion during heavy deadlifts increases shear stress on spinal discs. To prevent lower back rounding, engage lats to brace the thoracic spine, maintain intra-abdominal pressure via the Valsalva maneuver, and drive through the floor with your midfoot while wedging hips close to the barbell.',
    author: 'Fitness Instructor',
    authorRole: 'FitnessInstructor',
    category: 'Technique',
    readTime: '5 min',
    tags: ['Deadlift', 'Biomechanics', 'Back Safety', 'Technique'],
    topics: ['Deadlift Form', 'Spinal Mechanics', 'Injury Prevention'],
    relatedExerciseIds: ['barbell-deadlift', 'romanian-deadlift'],
    relatedGoals: ['Strength', 'Powerlifting'],
    status: 'published'
  }
];

// @desc    Get all educational articles (supports search, category, and tags)
// @route   GET /api/articles
// @access  Public
export const getArticles = async (req, res) => {
  try {
    const { category, tag, search, status } = req.query;
    const filter = {};

    const userRole = req.user?.role;
    const isStaff = ['FitnessInstructor', 'Admin', 'SuperAdmin'].includes(userRole);

    if (status && isStaff) {
      filter.status = status;
    } else if (!isStaff) {
      filter.status = 'published';
    }

    if (category && category !== 'All') {
      filter.category = new RegExp(`^${category}$`, 'i');
    }

    if (tag && tag !== 'All') {
      filter.tags = new RegExp(`^${tag}$`, 'i');
    }

    if (search && search.trim()) {
      const sRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: sRegex },
        { content: sRegex },
        { tags: sRegex },
        { topics: sRegex }
      ];
    }

    let articles = await Article.find(filter).sort({ createdAt: -1 });

    if (articles.length === 0 && !search && !category && !tag) {
      try {
        const count = await Article.countDocuments();
        if (count === 0) {
          articles = await Article.insertMany(INITIAL_ARTICLES);
        }
      } catch (e) {
        console.warn('Initial articles seed error:', e.message);
      }
    }

    res.json(articles);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch articles', error: error.message });
  }
};

// @desc    Get single article by ID
// @route   GET /api/articles/:id
// @access  Public
export const getArticleById = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    res.json(article);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch article', error: error.message });
  }
};

// @desc    Create new educational article
// @route   POST /api/articles
// @access  Private / FitnessInstructor, Admin, SuperAdmin
export const createArticle = async (req, res) => {
  try {
    const {
      title,
      content,
      category,
      readTime,
      tags,
      topics,
      relatedExerciseIds,
      relatedProgramIds,
      relatedGoals,
      relatedSports,
      status
    } = req.body;

    const author = req.user?.name || 'Fitness Instructor';
    const authorRole = req.user?.role || 'FitnessInstructor';
    const authorId = req.user?._id;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const parseArray = (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
      return [];
    };

    const article = await Article.create({
      title: title.trim(),
      content: content.trim(),
      author,
      authorId,
      authorRole,
      category: category || 'Training',
      readTime: readTime || '5 min',
      tags: parseArray(tags),
      topics: parseArray(topics),
      relatedExerciseIds: parseArray(relatedExerciseIds),
      relatedProgramIds: Array.isArray(relatedProgramIds) ? relatedProgramIds : [],
      relatedGoals: parseArray(relatedGoals),
      relatedSports: parseArray(relatedSports),
      status: status || 'published'
    });

    res.status(201).json(article);
  } catch (error) {
    console.error('createArticle Error:', error);
    res.status(500).json({ message: 'Failed to create article', error: error.message });
  }
};

// @desc    Update an article
// @route   PUT /api/articles/:id
// @access  Private / FitnessInstructor, Admin, SuperAdmin
export const updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    const isModerator = ['Admin', 'SuperAdmin'].includes(req.user?.role);
    if (article.author !== req.user?.name && !isModerator) {
      return res.status(403).json({ message: 'You can only edit your own articles' });
    }

    const parseArray = (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
      return [];
    };

    const fields = req.body;
    if (fields.title) article.title = fields.title.trim();
    if (fields.content) article.content = fields.content.trim();
    if (fields.category) article.category = fields.category;
    if (fields.readTime) article.readTime = fields.readTime;
    if (fields.status) article.status = fields.status;
    if (fields.tags !== undefined) article.tags = parseArray(fields.tags);
    if (fields.topics !== undefined) article.topics = parseArray(fields.topics);
    if (fields.relatedExerciseIds !== undefined) article.relatedExerciseIds = parseArray(fields.relatedExerciseIds);
    if (fields.relatedProgramIds !== undefined) article.relatedProgramIds = Array.isArray(fields.relatedProgramIds) ? fields.relatedProgramIds : [];
    if (fields.relatedGoals !== undefined) article.relatedGoals = parseArray(fields.relatedGoals);
    if (fields.relatedSports !== undefined) article.relatedSports = parseArray(fields.relatedSports);

    // If updating coverImage, remove previous cover from Supabase Storage
    if (fields.coverImage !== undefined && fields.coverImage !== article.coverImage) {
      if (article.coverImage && article.coverImage.includes('supabase')) {
        deleteFromSupabaseStorage({ fileUrlOrPath: article.coverImage }).catch(() => {});
      }
      article.coverImage = fields.coverImage;
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

    // Clean up Supabase storage cover image if present
    if (article.coverImage && article.coverImage.includes('supabase')) {
      deleteFromSupabaseStorage({ fileUrlOrPath: article.coverImage }).catch(() => {});
    }

    await Article.findByIdAndDelete(id);
    res.json({ message: 'Article deleted successfully', id });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete article', error: error.message });
  }
};

