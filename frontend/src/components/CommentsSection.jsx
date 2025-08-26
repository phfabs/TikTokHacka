import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { 
  getSkillComments, 
  commentOnSkill, 
  replyToComment, 
  likeComment 
} from '../api/social';

const { width } = Dimensions.get('window');

const CommentItem = ({ 
  comment, 
  onReply, 
  onLike, 
  onUserPress, 
  level = 0, 
  maxLevel = 2 
}) => {
  const [showReplies, setShowReplies] = useState(false);
  const [isLiked, setIsLiked] = useState(comment.user_has_liked || false);
  const [likesCount, setLikesCount] = useState(comment.likes_count || 0);
  const [likeLoading, setLikeLoading] = useState(false);
  const heartScale = new Animated.Value(1);

  const handleLike = async () => {
    if (likeLoading) return;

    try {
      setLikeLoading(true);
      
      // Heart animation
      Animated.sequence([
        Animated.timing(heartScale, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      setLikesCount(prev => newLikedState ? prev + 1 : prev - 1);

      await onLike(comment._id);
    } catch (error) {
      // Revert on error
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev + 1 : prev - 1);
      console.error('Error liking comment:', error);
    } finally {
      setLikeLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={[styles.commentContainer, { marginLeft: level * 20 }]}>
      <View style={styles.commentContent}>
        <TouchableOpacity
          style={styles.userSection}
          onPress={() => onUserPress?.(comment.user)}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {comment.user?.username?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          
          <View style={styles.userInfo}>
            <View style={styles.userHeader}>
              <Text style={styles.displayName}>
                {comment.user?.display_name || comment.user?.username || 'Anonymous'}
              </Text>
              {comment.user?.is_verified && (
                <MaterialIcons name="verified" size={14} color={colors.primary} />
              )}
              <Text style={styles.username}>
                @{comment.user?.username || 'anonymous'}
              </Text>
              <Text style={styles.separator}>·</Text>
              <Text style={styles.timestamp}>{formatTimestamp(comment.created_at)}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <Text style={styles.commentText}>{comment.text}</Text>

        <View style={styles.commentActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLike}
            disabled={likeLoading}
            activeOpacity={0.7}
          >
            {likeLoading ? (
              <ActivityIndicator size="small" color={colors.textTertiary} />
            ) : (
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <MaterialIcons
                  name={isLiked ? "favorite" : "favorite-border"}
                  size={16}
                  color={isLiked ? colors.like : colors.textTertiary}
                />
              </Animated.View>
            )}
            {likesCount > 0 && (
              <Text style={[styles.actionText, isLiked && { color: colors.like }]}>
                {likesCount}
              </Text>
            )}
          </TouchableOpacity>

          {level < maxLevel && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onReply(comment)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="chat-bubble-outline" size={16} color={colors.textTertiary} />
              <Text style={styles.actionText}>Reply</Text>
            </TouchableOpacity>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowReplies(!showReplies)}
              activeOpacity={0.7}
            >
              <MaterialIcons 
                name={showReplies ? "expand-less" : "expand-more"} 
                size={16} 
                color={colors.textTertiary} 
              />
              <Text style={styles.actionText}>
                {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Replies */}
      {showReplies && comment.replies && comment.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply._id}
              comment={reply}
              onReply={onReply}
              onLike={onLike}
              onUserPress={onUserPress}
              level={level + 1}
              maxLevel={maxLevel}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const CommentsSection = ({ skillId, onUserPress, scrollEnabled = true }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commenting, setCommenting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    if (skillId) {
      loadComments(true);
    }
  }, [skillId]);

  const loadComments = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      const currentPage = reset ? 1 : page;
      const data = await getSkillComments(skillId, currentPage, 20);
      const newComments = data.comments || [];

      if (reset) {
        setComments(newComments);
        setPage(2);
      } else {
        setComments(prev => [...prev, ...newComments]);
        setPage(currentPage + 1);
      }

      setHasMore(newComments.length === 20);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || commenting) return;

    try {
      setCommenting(true);

      let newCommentData;
      if (replyTo) {
        newCommentData = await replyToComment(replyTo._id, newComment.trim());
      } else {
        newCommentData = await commentOnSkill(skillId, newComment.trim());
      }

      // Add the new comment/reply to the list
      if (replyTo) {
        // Update the parent comment with the new reply
        setComments(prevComments =>
          prevComments.map(comment =>
            comment._id === replyTo._id
              ? {
                  ...comment,
                  replies: [...(comment.replies || []), newCommentData.comment]
                }
              : comment
          )
        );
      } else {
        // Add new top-level comment
        setComments(prev => [newCommentData.comment, ...prev]);
      }

      setNewComment('');
      setReplyTo(null);
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setCommenting(false);
    }
  };

  const handleReply = (comment) => {
    setReplyTo(comment);
  };

  const handleLikeComment = async (commentId) => {
    try {
      await likeComment(commentId);
    } catch (error) {
      console.error('Error liking comment:', error);
      throw error;
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadComments(false);
    }
  };

  const renderComment = ({ item }) => (
    <CommentItem
      comment={item}
      onReply={handleReply}
      onLike={handleLikeComment}
      onUserPress={onUserPress}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>
        Comments
      </Text>
      {comments.length > 0 && (
        <Text style={styles.commentCount}>
          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </Text>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="chat-bubble-outline" size={64} color={colors.textTertiary} />
      <Text style={styles.emptyStateTitle}>No comments yet</Text>
      <Text style={styles.emptyStateText}>
        Be the first to share your thoughts!
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading comments...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {renderHeader()}

      <FlatList
        data={comments}
        renderItem={renderComment}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        contentContainerStyle={[
          styles.commentsList,
          comments.length === 0 && styles.emptyList
        ]}
      />

      {/* Comment Input */}
      <View style={[
        styles.inputContainer,
        inputFocused && styles.inputContainerFocused
      ]}>
        {replyTo && (
          <View style={styles.replyIndicator}>
            <Text style={styles.replyText}>
              Replying to @{replyTo.user?.username || 'anonymous'}
            </Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <MaterialIcons name="close" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.inputRow}>
          <View style={styles.currentUserAvatar}>
            <Text style={styles.currentUserAvatarText}>U</Text>
          </View>
          
          <TextInput
            style={styles.textInput}
            value={newComment}
            onChangeText={setNewComment}
            placeholder={replyTo ? "Tweet your reply" : "Add a comment..."}
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={280}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
          />
          
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!newComment.trim() || commenting) && styles.disabledButton
            ]}
            onPress={handleSubmitComment}
            disabled={!newComment.trim() || commenting}
          >
            {commenting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <MaterialIcons name="send" size={20} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>

        {newComment.length > 0 && (
          <View style={styles.characterCount}>
            <Text style={[
              styles.characterCountText,
              newComment.length > 240 && styles.characterCountWarning,
              newComment.length >= 280 && styles.characterCountDanger
            ]}>
              {280 - newComment.length}
            </Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  commentCount: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  commentsList: {
    paddingBottom: 20,
  },
  emptyList: {
    flexGrow: 1,
  },
  commentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  commentContent: {
    flex: 1,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  displayName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginRight: 4,
  },
  username: {
    fontSize: 15,
    color: colors.textTertiary,
    marginLeft: 4,
    marginRight: 4,
  },
  separator: {
    fontSize: 15,
    color: colors.textTertiary,
    marginRight: 4,
  },
  timestamp: {
    fontSize: 15,
    color: colors.textTertiary,
  },
  commentText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
    marginLeft: 52, // Align with avatar
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 52, // Align with avatar
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  actionText: {
    fontSize: 13,
    color: colors.textTertiary,
    marginLeft: 4,
    fontWeight: '500',
  },
  repliesContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  inputContainer: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputContainerFocused: {
    borderTopColor: colors.primary,
  },
  replyIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primaryUltraLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  replyText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  currentUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  currentUserAvatarText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 8,
    paddingHorizontal: 0,
    minHeight: 40,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  characterCount: {
    alignItems: 'flex-end',
    marginTop: 8,
    marginLeft: 52,
  },
  characterCountText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  characterCountWarning: {
    color: colors.warning,
  },
  characterCountDanger: {
    color: colors.error,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default CommentsSection;