import React from 'react';
import PostCard from './PostCard';
import EmptyState from '../../../components/common/EmptyState';

const PostList = ({
  posts = [],
  currentUserName = '',
  userRole = '',
  globalUsers = {},
  onLike,
  onAddComment,
  onDeleteComment,
  onAddReply,
  onDeleteReply,
  onReport,
  onAdminRemove
}) => {
  if (!Array.isArray(posts) || posts.length === 0) {
    return (
      <EmptyState
        title="No Posts Found"
        message="Be the first to share your fitness journey, workout milestone, or nutrition tip with the community!"
      />
    );
  }

  return (
    <div className="post-list-container">
      {posts.map((post) => (
        <PostCard
          key={post._id || post.id}
          post={post}
          currentUserName={currentUserName}
          userRole={userRole}
          globalUsers={globalUsers}
          onLike={onLike}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
          onAddReply={onAddReply}
          onDeleteReply={onDeleteReply}
          onReport={onReport}
          onAdminRemove={onAdminRemove}
        />
      ))}
    </div>
  );
};

export default PostList;
