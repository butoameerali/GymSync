import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import Post from '../models/Post.js';
import Exercise from '../models/Exercise.js';
import User from '../models/User.js';
import { safeRegex, safeExactRegex, isValidObjectId } from '../utils/validation.js';

/**
 * Supabase Data Service
 * Centralized service layer managing heavy data (posts, exercises, user profiles, workout records)
 * with graceful fallback to MongoDB when Supabase credentials are not configured or offline.
 */

// ==============================================================================
// 1. POSTS SERVICE
// ==============================================================================

export const fetchAllPosts = async () => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform snake_case columns to camelCase expected by frontend
      return (data || []).map(p => ({
        _id: p.mongo_id || p.id,
        supabaseId: p.id,
        author: p.author_id,
        authorName: p.author_name,
        authorRole: p.author_role,
        content: p.content,
        mediaUrl: p.media_url,
        likes: p.likes || [],
        comments: p.comments || [],
        reportCount: p.report_count || 0,
        approvalStatus: p.approval_status,
        commentRestriction: p.comment_restriction,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }));
    } catch (err) {
      console.warn(`[Supabase fetchAllPosts Error]: ${err.message}. Falling back to MongoDB.`);
    }
  }

  // MongoDB Fallback
  return await Post.find().populate('author', 'name role').sort({ createdAt: -1 }).lean();
};

export const insertPost = async ({ authorId, authorName, authorRole, content, mediaUrl }) => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([{
          author_id: String(authorId),
          author_name: authorName || 'User',
          author_role: authorRole || 'User',
          content: content || '',
          media_url: mediaUrl || '',
          likes: [],
          comments: []
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        _id: data.id,
        supabaseId: data.id,
        author: data.author_id,
        authorName: data.author_name,
        authorRole: data.author_role,
        content: data.content,
        mediaUrl: data.media_url,
        likes: data.likes || [],
        comments: data.comments || [],
        createdAt: data.created_at
      };
    } catch (err) {
      console.warn(`[Supabase insertPost Error]: ${err.message}. Saving to MongoDB.`);
    }
  }

  // MongoDB Fallback
  const post = new Post({
    author: authorId,
    authorName,
    authorRole,
    content,
    mediaUrl,
    likes: [],
    comments: []
  });
  return await post.save();
};

export const updatePostLikes = async (postId, userName) => {
  if (isSupabaseConfigured() && supabase) {
    try {
      // Fetch post from Supabase
      const { data: post, error: fetchErr } = await supabase
        .from('posts')
        .select('likes')
        .or(`id.eq.${postId},mongo_id.eq.${postId}`)
        .single();

      if (!fetchErr && post) {
        let currentLikes = post.likes || [];
        const isLiked = currentLikes.includes(userName);
        const updatedLikes = isLiked
          ? currentLikes.filter(u => u !== userName)
          : [...currentLikes, userName];

        const { error: updateErr } = await supabase
          .from('posts')
          .update({ likes: updatedLikes, updated_at: new Date().toISOString() })
          .or(`id.eq.${postId},mongo_id.eq.${postId}`);

        if (!updateErr) return { likes: updatedLikes };
      }
    } catch (err) {
      console.warn(`[Supabase updatePostLikes Error]: ${err.message}. Falling back to MongoDB.`);
    }
  }

  // MongoDB Atomic Update
  if (!isValidObjectId(postId)) return null;
  const existing = await Post.findById(postId).select('likes').lean();
  if (!existing) return null;
  const isLiked = (existing.likes || []).includes(userName);
  const updateOp = isLiked
    ? { $pull: { likes: userName } }
    : { $addToSet: { likes: userName } };

  const updated = await Post.findByIdAndUpdate(postId, updateOp, { new: true, runValidators: false }).select('likes').lean();
  return { likes: updated ? updated.likes : [] };
};

export const appendPostComment = async (postId, comment) => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: post, error: fetchErr } = await supabase
        .from('posts')
        .select('comments')
        .or(`id.eq.${postId},mongo_id.eq.${postId}`)
        .single();

      if (!fetchErr && post) {
        const comments = [...(post.comments || []), comment];
        const { error: updateErr } = await supabase
          .from('posts')
          .update({ comments, updated_at: new Date().toISOString() })
          .or(`id.eq.${postId},mongo_id.eq.${postId}`);

        if (!updateErr) return comments;
      }
    } catch (err) {
      console.warn(`[Supabase appendPostComment Error]: ${err.message}. Falling back to MongoDB.`);
    }
  }

  // MongoDB Atomic Push
  if (!isValidObjectId(postId)) return null;
  const updated = await Post.findByIdAndUpdate(
    postId,
    { $push: { comments: comment } },
    { new: true, runValidators: false }
  ).select('comments').lean();
  return updated ? updated.comments : null;
};

export const removePost = async (postId, userName, isModerator) => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: post, error: fetchErr } = await supabase
        .from('posts')
        .select('author_name, media_url')
        .or(`id.eq.${postId},mongo_id.eq.${postId}`)
        .single();

      if (!fetchErr && post) {
        if (post.author_name !== userName && !isModerator) {
          throw new Error('Unauthorized');
        }

        const { error: delErr } = await supabase
          .from('posts')
          .delete()
          .or(`id.eq.${postId},mongo_id.eq.${postId}`);

        if (!delErr) return true;
      }
    } catch (err) {
      if (err.message === 'Unauthorized') throw err;
      console.warn(`[Supabase removePost Error]: ${err.message}. Falling back to MongoDB.`);
    }
  }

  // MongoDB Fallback
  const mongoPost = await Post.findById(postId);
  if (!mongoPost) return null;
  if (mongoPost.authorName !== userName && !isModerator) {
    throw new Error('Unauthorized');
  }
  await mongoPost.deleteOne();
  return true;
};

export const addPostReply = async (postId, commentId, reply) => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: post, error: fetchErr } = await supabase
        .from('posts')
        .select('comments')
        .or(`id.eq.${postId},mongo_id.eq.${postId}`)
        .single();

      if (!fetchErr && post && Array.isArray(post.comments)) {
        const comments = [...post.comments];
        const comment = comments.find(c => String(c._id || c.id) === String(commentId));
        if (comment) {
          if (!Array.isArray(comment.replies)) comment.replies = [];
          const replyObj = {
            _id: reply._id || String(Date.now() + Math.random().toString(36).substring(2, 7)),
            id: reply.id || reply._id || String(Date.now() + Math.random().toString(36).substring(2, 7)),
            ...reply,
            date: reply.date || new Date().toISOString()
          };
          comment.replies.push(replyObj);

          const { error: updateErr } = await supabase
            .from('posts')
            .update({ comments, updated_at: new Date().toISOString() })
            .or(`id.eq.${postId},mongo_id.eq.${postId}`);

          if (!updateErr) return comments;
        }
      }
    } catch (err) {
      console.warn(`[Supabase addPostReply Error]: ${err.message}. Falling back to MongoDB.`);
    }
  }

  // MongoDB Fallback
  if (!isValidObjectId(postId)) return null;
  const mongoPost = await Post.findById(postId);
  if (!mongoPost) return null;
  const comment = mongoPost.comments.id(commentId) || mongoPost.comments.find(c => String(c._id) === String(commentId));
  if (!comment) return null;
  comment.replies.push(reply);
  await mongoPost.save();
  return mongoPost.comments;
};

export const editPostReply = async (postId, commentId, replyId, newText, userName, isModerator) => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: post, error: fetchErr } = await supabase
        .from('posts')
        .select('comments')
        .or(`id.eq.${postId},mongo_id.eq.${postId}`)
        .single();

      if (!fetchErr && post && Array.isArray(post.comments)) {
        const comments = [...post.comments];
        const comment = comments.find(c => String(c._id || c.id) === String(commentId));
        if (comment && Array.isArray(comment.replies)) {
          const reply = comment.replies.find(r => String(r._id || r.id) === String(replyId));
          if (!reply) return null;
          if (reply.author !== userName && reply.authorName !== userName && !isModerator) {
            throw new Error('Unauthorized');
          }
          reply.text = newText;
          const { error: updateErr } = await supabase
            .from('posts')
            .update({ comments, updated_at: new Date().toISOString() })
            .or(`id.eq.${postId},mongo_id.eq.${postId}`);

          if (!updateErr) return comments;
        }
      }
    } catch (err) {
      if (err.message === 'Unauthorized') throw err;
      console.warn(`[Supabase editPostReply Error]: ${err.message}. Falling back to MongoDB.`);
    }
  }

  // MongoDB Fallback
  if (!isValidObjectId(postId)) return null;
  const mongoPost = await Post.findById(postId);
  if (!mongoPost) return null;
  const comment = mongoPost.comments.id(commentId) || mongoPost.comments.find(c => String(c._id) === String(commentId));
  if (!comment) return null;
  const reply = comment.replies.id(replyId) || comment.replies.find(r => String(r._id) === String(replyId));
  if (!reply) return null;
  if (reply.author !== userName && reply.authorName !== userName && !isModerator) {
    throw new Error('Unauthorized');
  }
  reply.text = newText;
  await mongoPost.save();
  return mongoPost.comments;
};

export const deletePostReply = async (postId, commentId, replyId, userName, isModerator) => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: post, error: fetchErr } = await supabase
        .from('posts')
        .select('comments')
        .or(`id.eq.${postId},mongo_id.eq.${postId}`)
        .single();

      if (!fetchErr && post && Array.isArray(post.comments)) {
        const comments = [...post.comments];
        const comment = comments.find(c => String(c._id || c.id) === String(commentId));
        if (comment && Array.isArray(comment.replies)) {
          const reply = comment.replies.find(r => String(r._id || r.id) === String(replyId));
          if (!reply) return null;
          if (reply.author !== userName && reply.authorName !== userName && !isModerator) {
            throw new Error('Unauthorized');
          }
          comment.replies = comment.replies.filter(r => String(r._id || r.id) !== String(replyId));
          const { error: updateErr } = await supabase
            .from('posts')
            .update({ comments, updated_at: new Date().toISOString() })
            .or(`id.eq.${postId},mongo_id.eq.${postId}`);

          if (!updateErr) return comments;
        }
      }
    } catch (err) {
      if (err.message === 'Unauthorized') throw err;
      console.warn(`[Supabase deletePostReply Error]: ${err.message}. Falling back to MongoDB.`);
    }
  }

  // MongoDB Fallback
  if (!isValidObjectId(postId)) return null;
  const mongoPost = await Post.findById(postId);
  if (!mongoPost) return null;
  const comment = mongoPost.comments.id(commentId) || mongoPost.comments.find(c => String(c._id) === String(commentId));
  if (!comment) return null;
  const reply = comment.replies.id(replyId) || comment.replies.find(r => String(r._id) === String(replyId));
  if (!reply) return null;
  if (reply.author !== userName && reply.authorName !== userName && !isModerator) {
    throw new Error('Unauthorized');
  }
  if (typeof comment.replies.pull === 'function') {
    comment.replies.pull(replyId);
  } else {
    comment.replies = comment.replies.filter(r => String(r._id) !== String(replyId));
  }
  await mongoPost.save();
  return mongoPost.comments;
};

export const reportPostService = async (postId, reporterName, reason, explanation) => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: post, error: fetchErr } = await supabase
        .from('posts')
        .select('reported_by, report_count')
        .or(`id.eq.${postId},mongo_id.eq.${postId}`)
        .single();

      if (!fetchErr && post) {
        const reportedBy = Array.isArray(post.reported_by) ? [...post.reported_by] : [];
        const alreadyReported = reportedBy.some(r => r.userName === reporterName);
        let count = post.report_count || 0;
        if (!alreadyReported) {
          reportedBy.push({
            userName: reporterName,
            reason: reason || 'Inappropriate',
            explanation: explanation || '',
            date: new Date().toISOString()
          });
          count += 1;
          await supabase
            .from('posts')
            .update({ reported_by: reportedBy, report_count: count })
            .or(`id.eq.${postId},mongo_id.eq.${postId}`);
        }
        return { message: 'Post reported to moderators', reportCount: count };
      }
    } catch (err) {
      console.warn(`[Supabase reportPostService Error]: ${err.message}. Falling back to MongoDB.`);
    }
  }

  // MongoDB Fallback
  if (!isValidObjectId(postId)) return null;
  const mongoPost = await Post.findById(postId);
  if (!mongoPost) return null;
  if (!mongoPost.reportedBy) mongoPost.reportedBy = [];
  const alreadyReported = mongoPost.reportedBy.some(r => r.userName === reporterName);
  if (!alreadyReported) {
    mongoPost.reportedBy.push({
      userName: reporterName,
      reason: reason || 'Inappropriate',
      explanation: explanation || ''
    });
    mongoPost.reportCount = (mongoPost.reportCount || 0) + 1;
    await mongoPost.save();
  }
  return { message: 'Post reported to moderators', reportCount: mongoPost.reportCount };
};

// ==============================================================================
// 2. EXERCISES SERVICE
// ==============================================================================

export const fetchAllExercises = async ({ search, category, equipment, status, includeArchived } = {}) => {
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase.from('exercises').select('*');

      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }
      if (category && category !== 'All' && category !== 'Favorites') {
        query = query.contains('target_muscles', [category]);
      }
      if (equipment && equipment !== 'All') {
        if (equipment === 'No Equipment' || equipment === 'Bodyweight') {
          query = query.ilike('equipment_required', '%bodyweight%');
        } else if (equipment === 'With Equipment') {
          query = query.not('equipment_required', 'ilike', '%bodyweight%').not('equipment_required', 'ilike', '%none%');
        } else {
          query = query.ilike('equipment_required', `%${equipment}%`);
        }
      }
      if (status) {
        query = query.eq('status', status);
      } else if (!includeArchived) {
        query = query.neq('status', 'archived');
      }

      const { data, error } = await query.order('name', { ascending: true }).limit(800);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(e => ({
          _id: e.id,
          id: e.id,
          exerciseId: e.exercise_id,
          name: e.name,
          category: e.category || 'Chest',
          targetMuscles: e.target_muscles || [],
          equipmentRequired: e.equipment_required,
          difficulty: e.difficulty,
          defaultSets: e.default_sets || 3,
          defaultReps: e.default_reps || 10,
          defaultDuration: e.default_duration || 0,
          instructions: e.instructions || '',
          fitnessPaths: e.fitness_paths || [],
          medicalAvoidIf: e.medical_avoid_if || [],
          jointPainAvoidIf: e.joint_pain_avoid_if || [],
          mediaUrl: e.media_url,
          description: e.description,
          status: e.status || 'active',
          isAiTrackable: e.is_ai_trackable,
          aiDetection: e.ai_detection || { enabled: false }
        }));
      }
    } catch (err) {
      console.warn(`[Supabase fetchAllExercises Error]: ${err.message}. Falling back to MongoDB.`);
    }
  }

  // MongoDB Fallback
  const mongoQuery = {};
  const andConditions = [];

  if (search && search.trim()) {
    const sRegex = safeRegex(search.trim());
    if (sRegex) {
      andConditions.push({
        $or: [
          { name: sRegex },
          { targetMuscles: sRegex },
          { description: sRegex }
        ]
      });
    }
  }

  if (category && category !== 'All' && category !== 'Favorites') {
    const cRegexExact = safeExactRegex(category);
    const cRegex = safeRegex(category);
    if (cRegexExact && cRegex) {
      andConditions.push({
        $or: [
          { category: cRegexExact },
          { targetMuscles: cRegex }
        ]
      });
    }
  }

  if (equipment && equipment !== 'All') {
    if (equipment === 'No Equipment' || equipment === 'Bodyweight') {
      mongoQuery.equipmentRequired = { $regex: 'bodyweight|none', $options: 'i' };
    } else if (equipment === 'With Equipment') {
      mongoQuery.equipmentRequired = { $not: /bodyweight|none/i, $nin: [null, ''] };
    } else {
      const eqRegex = safeRegex(equipment);
      if (eqRegex) mongoQuery.equipmentRequired = eqRegex;
    }
  }

  if (andConditions.length > 0) {
    mongoQuery.$and = andConditions;
  }

  if (status) {
    mongoQuery.status = status;
  } else if (!includeArchived) {
    mongoQuery.status = { $ne: 'archived' };
  }

  return await Exercise.find(mongoQuery).sort({ name: 1 }).limit(800);
};

export const insertExercise = async (exerciseData) => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const row = {
        exercise_id: exerciseData.exerciseId || `EX-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        name: exerciseData.name,
        category: exerciseData.category || 'Chest',
        target_muscles: exerciseData.targetMuscles || [],
        equipment_required: exerciseData.equipmentRequired || 'Bodyweight',
        difficulty: exerciseData.difficulty || 'Beginner',
        default_sets: exerciseData.defaultSets || 3,
        default_reps: exerciseData.defaultReps || 10,
        default_duration: exerciseData.defaultDuration || 0,
        instructions: exerciseData.instructions || '',
        fitness_paths: exerciseData.fitnessPaths || [],
        medical_avoid_if: exerciseData.medicalAvoidIf || [],
        joint_pain_avoid_if: exerciseData.jointPainAvoidIf || [],
        media_url: exerciseData.mediaUrl || '',
        description: exerciseData.description || '',
        status: exerciseData.status || 'active',
        is_ai_trackable: Boolean(exerciseData.aiDetection?.enabled),
        ai_detection: exerciseData.aiDetection || { enabled: false }
      };

      const { data, error } = await supabase.from('exercises').insert([row]).select().single();
      if (!error && data) {
        try {
          const mongoDoc = await Exercise.create({
            ...exerciseData,
            exerciseId: row.exercise_id
          });
          return mongoDoc;
        } catch (mErr) {
          console.warn('[MongoDB insertExercise sync error]:', mErr.message);
        }
        return {
          _id: data.id,
          id: data.id,
          ...exerciseData
        };
      }
    } catch (err) {
      console.warn(`[Supabase insertExercise Error]: ${err.message}. Saving to MongoDB.`);
    }
  }

  // MongoDB Fallback
  return await Exercise.create(exerciseData);
};

// ==============================================================================
// 3. USER WORKOUT RECORDS & PROGRESS SERVICE
// ==============================================================================

export const saveUserExerciseRecord = async (record) => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const row = {
        user_id: String(record.userId),
        exercise_id: String(record.exerciseId),
        exercise_name: record.exerciseName,
        day_number: record.dayNumber || 1,
        plan_id: record.planId || null,
        reps_completed: record.completedReps || record.repsCompleted || 0,
        target_reps: record.targetReps || 10,
        points_earned: record.pointsEarned || 1,
        mode: record.mode || 'manual',
        ai_confidence: record.aiResult?.confidence || null,
        ai_result: record.aiResult || {}
      };

      const { data, error } = await supabase
        .from('user_exercise_records')
        .insert([row])
        .select()
        .single();

      if (!error) return data;
    } catch (err) {
      console.warn(`[Supabase saveUserExerciseRecord Error]: ${err.message}`);
    }
  }
  return null;
};

export const fetchUserExerciseRecords = async (userId) => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('user_exercise_records')
        .select('*')
        .eq('user_id', String(userId))
        .order('completed_at', { ascending: false });

      if (!error && data) return data;
    } catch (err) {
      console.warn(`[Supabase fetchUserExerciseRecords Error]: ${err.message}`);
    }
  }
  return [];
};

export const upsertWorkoutProgress = async (userId, progressData) => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const row = {
        user_id: String(userId),
        plan_id: progressData.planId || null,
        completed_days: progressData.completedDays || [],
        last_workout_completion_time: progressData.lastWorkoutCompletionTime || new Date().toISOString(),
        streak: progressData.streak || 0,
        total_points: progressData.totalPoints || 0,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('user_workout_progress')
        .upsert(row, { onConflict: 'user_id' })
        .select()
        .single();

      if (!error) return data;
    } catch (err) {
      console.warn(`[Supabase upsertWorkoutProgress Error]: ${err.message}`);
    }
  }
  return null;
};

export const fetchWorkoutProgress = async (userId) => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('user_workout_progress')
        .select('*')
        .eq('user_id', String(userId))
        .single();

      if (!error && data) {
        return {
          planId: data.plan_id,
          completedDays: data.completed_days || [],
          lastWorkoutCompletionTime: data.last_workout_completion_time,
          streak: data.streak || 0,
          totalPoints: data.total_points || 0
        };
      }
    } catch (err) {
      console.warn(`[Supabase fetchWorkoutProgress Error]: ${err.message}`);
    }
  }
  return null;
};

// ==============================================================================
// 4. USER PROFILES SERVICE (Heavy Profile Data, Bio, Goals)
// ==============================================================================

export const upsertProfileToSupabase = async ({ userId, name, email, role, profilePic, bioData, stats }) => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const row = {
        user_id: String(userId),
        name,
        email: email || null,
        role: role || 'User',
        profile_pic: profilePic || '',
        bio_data: bioData || {},
        stats: stats || { points: 0, streak: 0 },
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(row, { onConflict: 'user_id' })
        .select()
        .single();

      if (!error) return data;
    } catch (err) {
      console.warn(`[Supabase upsertProfile Error]: ${err.message}`);
    }
  }
  return null;
};

export const fetchProfileFromSupabase = async (userIdOrName) => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .or(`user_id.eq.${userIdOrName},name.eq.${userIdOrName}`)
        .single();

      if (!error && data) return data;
    } catch (err) {
      console.warn(`[Supabase fetchProfile Error]: ${err.message}`);
    }
  }
  return null;
};
