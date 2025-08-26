// Clean social media API - only essential functionality
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCurrentUser,
  getSharedSkills,
  saveSharedSkills,
  getUserDownloads,
  saveUserDownload,
  getSocialInteractions,
  saveSocialInteractions,
  generateId
} from './socialData';
import { getAllPlans, createSkillPlan } from './plans';

// Share a skill from user's repository to social feed
export const shareSkillToSocial = async (skillData) => {
  try {
    const currentUser = await getCurrentUser();
    const sharedSkills = await getSharedSkills();
    
    const sharedSkill = {
      _id: generateId(),
      original_skill_id: skillData._id,
      title: skillData.title,
      description: skillData.description, // Fallback for existing code
      category: skillData.category,
      difficulty: skillData.difficulty,
      tags: skillData.tags || [],
      curriculum: skillData.curriculum || [],
      estimated_duration: skillData.estimated_duration || 30,
      
      // New dual-content structure
      skill_description: skillData.skill_description || skillData.description,
      personal_message: skillData.personal_message || '',
      post_type: 'skill_share',
      is_pinned: false,
      is_edited: false,
      edited_at: null,
      
      // Social metadata
      shared_by: currentUser._id,
      shared_by_username: currentUser.username,
      shared_by_display_name: currentUser.display_name || currentUser.username,
      author: currentUser,
      
      // Enhanced engagement metrics
      likes_count: 0,
      downloads_count: 0,
      comments_count: 0,
      views_count: 0,
      upvotes: 0,
      downvotes: 0,
      save_count: 0,
      award_count: 0,
      
      // Timestamps
      created_at: new Date().toISOString(),
      shared_at: new Date().toISOString(),
      
      // User interaction flags
      user_has_liked: false,
      user_has_downloaded: false,
      user_has_upvoted: false,
      user_has_downvoted: false,
      user_has_saved: false,
      
      visibility: 'public'
    };
    
    // Add to beginning of shared skills array
    sharedSkills.unshift(sharedSkill);
    await saveSharedSkills(sharedSkills);
    
    return {
      success: true,
      skill: sharedSkill,
      message: 'Skill shared successfully!'
    };
  } catch (error) {
    console.error('Error sharing skill:', error);
    throw error;
  }
};

// Get social feed (all shared skills)
export const getSocialFeed = async (page = 1, limit = 20) => {
  try {
    const sharedSkills = await getSharedSkills();
    const currentUser = await getCurrentUser();
    const interactions = await getSocialInteractions();
    
    // Sort by newest first
    let sortedSkills = sharedSkills
      .sort((a, b) => new Date(b.shared_at) - new Date(a.shared_at));
    
    // If no skills from real data, use sample data
    if (sortedSkills.length === 0 && page === 1) {
      sortedSkills = generateSampleSkills(limit);
    }
    
    // Add user interaction flags
    const skillsWithInteractions = sortedSkills.map(skill => {
      const likeKey = `${currentUser._id}_${skill._id}`;
      const downloadKey = `${currentUser._id}_${skill._id}`;
      
      return {
        ...skill,
        user_has_liked: !!interactions.likes[likeKey],
        user_has_downloaded: !!interactions.downloads[downloadKey]
      };
    });
    
    // Paginate
    const startIndex = (page - 1) * limit;
    const paginatedSkills = skillsWithInteractions.slice(startIndex, startIndex + limit);
    
    return {
      activities: paginatedSkills.map(skill => ({ skill })),
      skills: paginatedSkills,
      total_count: Math.max(sharedSkills.length, sortedSkills.length),
      page: page,
      has_more: startIndex + limit < sortedSkills.length,
      message: 'Social feed loaded successfully'
    };
  } catch (error) {
    console.error('Error getting social feed:', error);
    // Return sample data on error
    const sampleSkills = generateSampleSkills(limit);
    return {
      activities: sampleSkills.map(skill => ({ skill })),
      skills: sampleSkills,
      total_count: sampleSkills.length,
      page: 1,
      has_more: false,
      message: 'Loading sample social feed'
    };
  }
};

// Download a skill from social feed to user's repository
export const downloadSkillFromSocial = async (sharedSkillId) => {
  try {
    const currentUser = await getCurrentUser();
    const sharedSkills = await getSharedSkills();
    const interactions = await getSocialInteractions();
    
    // Find the shared skill
    const sharedSkill = sharedSkills.find(skill => skill._id === sharedSkillId);
    if (!sharedSkill) {
      throw new Error('Shared skill not found');
    }
    
    // Create skill for user's repository
    const downloadedSkill = {
      _id: generateId(),
      title: sharedSkill.title,
      description: sharedSkill.description,
      category: sharedSkill.category,
      difficulty: sharedSkill.difficulty,
      tags: sharedSkill.tags,
      curriculum: sharedSkill.curriculum,
      estimated_duration: sharedSkill.estimated_duration,
      
      // Mark as downloaded
      downloaded_from_social: true,
      original_shared_skill_id: sharedSkillId,
      downloaded_from_user: sharedSkill.shared_by_username,
      
      // User's copy metadata
      user_id: currentUser._id,
      created_at: new Date().toISOString(),
      downloaded_at: new Date().toISOString(),
      
      // Progress tracking
      progress: 0,
      is_completed: false,
      current_day: 1,
      
      // User can customize their copy
      is_customizable: true
    };
    
    // Save to user's actual repository via plans API
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      try {
        // Create the skill in the user's actual repository using the plans API
        await createSkillPlan(downloadedSkill.title, downloadedSkill.difficulty, token);
        console.log('Skill successfully added to user repository via API');
      } catch (apiError) {
        console.error('Failed to add to repository via API, falling back to local storage:', apiError);
        // Fallback: Add to local storage
        const userSkills = await getUserSkills();
        userSkills.unshift(downloadedSkill);
        await saveUserSkills(userSkills);
      }
    } else {
      // No token, save locally
      const userSkills = await getUserSkills();
      userSkills.unshift(downloadedSkill);
      await saveUserSkills(userSkills);
    }
    
    // Update download count on shared skill
    const skillIndex = sharedSkills.findIndex(skill => skill._id === sharedSkillId);
    if (skillIndex !== -1) {
      sharedSkills[skillIndex].downloads_count += 1;
      await saveSharedSkills(sharedSkills);
    }
    
    // Track user download
    await saveUserDownload(currentUser._id, sharedSkillId);
    
    // Update interactions
    const downloadKey = `${currentUser._id}_${sharedSkillId}`;
    interactions.downloads[downloadKey] = true;
    await saveSocialInteractions(interactions);
    
    return {
      success: true,
      skill: downloadedSkill,
      message: 'Skill downloaded to your repository!'
    };
  } catch (error) {
    console.error('Error downloading skill:', error);
    throw error;
  }
};

// Like a shared skill
export const likeSharedSkill = async (sharedSkillId) => {
  try {
    const currentUser = await getCurrentUser();
    const sharedSkills = await getSharedSkills();
    const interactions = await getSocialInteractions();
    
    const likeKey = `${currentUser._id}_${sharedSkillId}`;
    const hasLiked = !!interactions.likes[likeKey];
    
    // Find and update skill
    const skillIndex = sharedSkills.findIndex(skill => skill._id === sharedSkillId);
    if (skillIndex === -1) {
      throw new Error('Skill not found');
    }
    
    if (hasLiked) {
      // Unlike
      delete interactions.likes[likeKey];
      sharedSkills[skillIndex].likes_count -= 1;
    } else {
      // Like
      interactions.likes[likeKey] = true;
      sharedSkills[skillIndex].likes_count += 1;
    }
    
    await saveSharedSkills(sharedSkills);
    await saveSocialInteractions(interactions);
    
    return {
      success: true,
      liked: !hasLiked,
      likes_count: sharedSkills[skillIndex].likes_count,
      message: hasLiked ? 'Skill unliked' : 'Skill liked!'
    };
  } catch (error) {
    console.error('Error liking skill:', error);
    throw error;
  }
};

// Get user's skills repository from the real API
export const getUserSkills = async (userId = null) => {
  try {
    // Get auth token
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      console.log('No auth token found');
      return [];
    }

    console.log('Fetching user skills from plans API...');
    
    // Get user's actual plans from the API
    const response = await getAllPlans(token);
    console.log('getAllPlans response:', response);
    
    // Get skills directly from the response (matching RepositoryScreen pattern)
    const skills = response.skills || [];
    console.log('User skills from API:', skills);
    
    // Transform plans to skill format for social sharing
    const transformedSkills = skills.map(plan => ({
      _id: plan._id,
      title: plan.title || plan.skill_name || 'Untitled Skill',
      description: plan.description || `Learn ${plan.title || plan.skill_name}`,
      category: plan.category || 'General',
      difficulty: plan.difficulty || 'beginner',
      tags: plan.tags || [],
      curriculum: plan.curriculum || [],
      estimated_duration: plan.estimated_duration || 30,
      created_at: plan.created_at,
      user_id: userId,
      // Additional metadata from the API
      progress: plan.progress || 0,
      is_completed: plan.is_completed || false,
      current_day: plan.current_day || 1,
      image_url: plan.image_url
    }));
    
    console.log('Transformed skills for sharing:', transformedSkills);
    return transformedSkills;
  } catch (error) {
    console.error('Error getting user skills:', error);
    // Fallback to local storage if API fails
    try {
      const targetUserId = userId || (await getCurrentUser())._id;
      const data = await AsyncStorage.getItem(`user_skills_${targetUserId}`);
      return data ? JSON.parse(data) : [];
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      return [];
    }
  }
};

// Save user's skills repository (for downloaded skills)
export const saveUserSkills = async (skills, userId = null) => {
  try {
    const targetUserId = userId || (await getCurrentUser())._id;
    // For downloaded skills, we store them locally
    // The original user-created skills come from the API
    await AsyncStorage.setItem(`user_skills_${targetUserId}`, JSON.stringify(skills));
  } catch (error) {
    console.error('Error saving user skills:', error);
  }
};

// Get user's shared skills (what they've posted to social)
export const getMySharedSkills = async () => {
  try {
    const currentUser = await getCurrentUser();
    const sharedSkills = await getSharedSkills();
    
    return {
      skills: sharedSkills.filter(skill => skill.shared_by === currentUser._id)
    };
  } catch (error) {
    console.error('Error getting my shared skills:', error);
    return { skills: [] };
  }
};

// Get skills available for sharing (from user's repository)
export const getSkillsForSharing = async () => {
  try {
    const userSkills = await getUserSkills();
    
    // Filter out skills that are already shared
    const mySharedSkills = await getMySharedSkills();
    const sharedSkillIds = mySharedSkills.skills.map(skill => skill.original_skill_id);
    
    const availableSkills = userSkills.filter(skill => 
      !sharedSkillIds.includes(skill._id)
    );
    
    return {
      skills: availableSkills,
      total_count: availableSkills.length
    };
  } catch (error) {
    console.error('Error getting skills for sharing:', error);
    return { skills: [], total_count: 0 };
  }
};

// Search skills in social feed
export const searchSkills = async (params = {}) => {
  try {
    const sharedSkills = await getSharedSkills();
    const { category, difficulty, search } = params;
    
    let filteredSkills = sharedSkills;
    
    if (category) {
      filteredSkills = filteredSkills.filter(skill => 
        skill.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    if (difficulty) {
      filteredSkills = filteredSkills.filter(skill => 
        skill.difficulty.toLowerCase() === difficulty.toLowerCase()
      );
    }
    
    if (search) {
      filteredSkills = filteredSkills.filter(skill => 
        skill.title.toLowerCase().includes(search.toLowerCase()) ||
        skill.description.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    return {
      skills: filteredSkills,
      total_count: filteredSkills.length,
      message: 'Search completed'
    };
  } catch (error) {
    console.error('Error searching skills:', error);
    return {
      skills: [],
      total_count: 0,
      message: 'Search failed'
    };
  }
};

// Get trending skills (most downloaded)
export const getTrendingSkills = async (limit = 10) => {
  try {
    const sharedSkills = await getSharedSkills();
    
    let trending = sharedSkills
      .sort((a, b) => (b.downloads_count + b.likes_count) - (a.downloads_count + a.likes_count))
      .slice(0, limit);
    
    // If no trending skills from real data, use sample data
    if (trending.length === 0) {
      trending = generateSampleTrendingSkills(limit);
    }
    
    return {
      skills: trending,
      message: 'Trending skills loaded'
    };
  } catch (error) {
    console.error('Error getting trending skills:', error);
    // Return sample data on error
    return {
      skills: generateSampleTrendingSkills(limit),
      message: 'Loading sample trending skills'
    };
  }
};

// Get discover feed (popular skills)
export const getDiscoverFeed = async (page = 1, limit = 10) => {
  try {
    const sharedSkills = await getSharedSkills();
    
    // Sort by engagement (downloads + likes)
    let discoverSkills = sharedSkills
      .sort((a, b) => (b.downloads_count + b.likes_count) - (a.downloads_count + a.likes_count))
      .slice((page - 1) * limit, page * limit);
    
    // If no skills from real data, use sample data
    if (discoverSkills.length === 0 && page === 1) {
      discoverSkills = generateSampleSkills(limit);
    }
    
    return {
      activities: discoverSkills,
      skills: discoverSkills,
      total_count: Math.max(sharedSkills.length, discoverSkills.length),
      page,
      has_more: discoverSkills.length === limit,
      message: 'Discover feed loaded'
    };
  } catch (error) {
    console.error('Error loading discover feed:', error);
    // Return sample data on error
    const sampleSkills = generateSampleSkills(limit);
    return {
      activities: sampleSkills,
      skills: sampleSkills,
      total_count: sampleSkills.length,
      page: 1,
      has_more: false,
      message: 'Loading sample discover feed'
    };
  }
};

// Get detailed information for a shared skill
export const getSharedSkillDetail = async (skillId) => {
  try {
    const sharedSkills = await getSharedSkills();
    const currentUser = await getCurrentUser();
    const interactions = await getSocialInteractions();
    
    const skill = sharedSkills.find(s => s._id === skillId);
    if (!skill) {
      throw new Error('Shared skill not found');
    }
    
    // Add user interaction flags
    const likeKey = `${currentUser._id}_${skillId}`;
    const downloadKey = `${currentUser._id}_${skillId}`;
    
    const skillWithInteractions = {
      ...skill,
      user_has_liked: !!interactions.likes[likeKey],
      user_has_downloaded: !!interactions.downloads[downloadKey]
    };
    
    return {
      skill: skillWithInteractions,
      message: 'Skill detail loaded successfully'
    };
  } catch (error) {
    console.error('Error getting shared skill detail:', error);
    throw error;
  }
};

// Comments functionality
export const getSkillComments = async (skillId, page = 1, limit = 20) => {
  try {
    const commentsData = await AsyncStorage.getItem(`comments_${skillId}`);
    const allComments = commentsData ? JSON.parse(commentsData) : [];
    
    // Sort by newest first
    const sortedComments = allComments.sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
    
    // Paginate
    const startIndex = (page - 1) * limit;
    const paginatedComments = sortedComments.slice(startIndex, startIndex + limit);
    
    return {
      comments: paginatedComments,
      total_count: allComments.length,
      page: page,
      has_more: startIndex + limit < allComments.length
    };
  } catch (error) {
    console.error('Error getting skill comments:', error);
    return { comments: [], total_count: 0, page: 1, has_more: false };
  }
};

export const commentOnSkill = async (skillId, text) => {
  try {
    const currentUser = await getCurrentUser();
    const commentsData = await AsyncStorage.getItem(`comments_${skillId}`);
    const existingComments = commentsData ? JSON.parse(commentsData) : [];
    
    const newComment = {
      _id: generateId(),
      skillId: skillId,
      text: text.trim(),
      user: {
        _id: currentUser._id,
        username: currentUser.username,
        display_name: currentUser.display_name || currentUser.username,
        is_verified: false
      },
      created_at: new Date().toISOString(),
      likes_count: 0,
      user_has_liked: false,
      replies: []
    };
    
    const updatedComments = [newComment, ...existingComments];
    await AsyncStorage.setItem(`comments_${skillId}`, JSON.stringify(updatedComments));
    
    return {
      comment: newComment,
      message: 'Comment posted successfully'
    };
  } catch (error) {
    console.error('Error posting comment:', error);
    throw error;
  }
};

export const replyToComment = async (commentId, text) => {
  try {
    const currentUser = await getCurrentUser();
    
    // Find which skill this comment belongs to
    const keys = await AsyncStorage.getAllKeys();
    const commentKeys = keys.filter(key => key.startsWith('comments_'));
    
    for (const key of commentKeys) {
      const commentsData = await AsyncStorage.getItem(key);
      const comments = commentsData ? JSON.parse(commentsData) : [];
      
      const commentIndex = comments.findIndex(c => c._id === commentId);
      if (commentIndex !== -1) {
        const reply = {
          _id: generateId(),
          text: text.trim(),
          user: {
            _id: currentUser._id,
            username: currentUser.username,
            display_name: currentUser.display_name || currentUser.username,
            is_verified: false
          },
          created_at: new Date().toISOString(),
          likes_count: 0,
          user_has_liked: false
        };
        
        comments[commentIndex].replies = comments[commentIndex].replies || [];
        comments[commentIndex].replies.push(reply);
        
        await AsyncStorage.setItem(key, JSON.stringify(comments));
        
        return {
          comment: reply,
          message: 'Reply posted successfully'
        };
      }
    }
    
    throw new Error('Comment not found');
  } catch (error) {
    console.error('Error replying to comment:', error);
    throw error;
  }
};

export const likeComment = async (commentId) => {
  try {
    const currentUser = await getCurrentUser();
    
    // Find which skill this comment belongs to
    const keys = await AsyncStorage.getAllKeys();
    const commentKeys = keys.filter(key => key.startsWith('comments_'));
    
    for (const key of commentKeys) {
      const commentsData = await AsyncStorage.getItem(key);
      const comments = commentsData ? JSON.parse(commentsData) : [];
      
      // Check main comments
      const commentIndex = comments.findIndex(c => c._id === commentId);
      if (commentIndex !== -1) {
        const comment = comments[commentIndex];
        const isLiked = comment.user_has_liked;
        
        comments[commentIndex] = {
          ...comment,
          user_has_liked: !isLiked,
          likes_count: isLiked ? comment.likes_count - 1 : comment.likes_count + 1
        };
        
        await AsyncStorage.setItem(key, JSON.stringify(comments));
        return { message: 'Comment like updated' };
      }
      
      // Check replies
      for (let i = 0; i < comments.length; i++) {
        if (comments[i].replies) {
          const replyIndex = comments[i].replies.findIndex(r => r._id === commentId);
          if (replyIndex !== -1) {
            const reply = comments[i].replies[replyIndex];
            const isLiked = reply.user_has_liked;
            
            comments[i].replies[replyIndex] = {
              ...reply,
              user_has_liked: !isLiked,
              likes_count: isLiked ? reply.likes_count - 1 : reply.likes_count + 1
            };
            
            await AsyncStorage.setItem(key, JSON.stringify(comments));
            return { message: 'Reply like updated' };
          }
        }
      }
    }
    
    throw new Error('Comment not found');
  } catch (error) {
    console.error('Error liking comment:', error);
    throw error;
  }
};

// Function aliases for SharedSkillDetailScreen compatibility
export const likeSkill = likeSharedSkill;
export const downloadSkill = downloadSkillFromSocial;

// Get skill categories
export const getSkillCategories = async () => {
  try {
    const sharedSkills = await getSharedSkills();
    const categories = [...new Set(sharedSkills.map(skill => skill.category).filter(Boolean))];
    
    const defaultCategories = ['Programming', 'Design', 'Business', 'Languages', 'Health', 'Music', 'Art', 'Writing'];
    const allCategories = [...new Set([...categories, ...defaultCategories])];
    
    return {
      categories: allCategories.map(category => ({
        name: category,
        count: sharedSkills.filter(skill => skill.category === category).length
      })),
      message: 'Categories loaded successfully'
    };
  } catch (error) {
    console.error('Error getting skill categories:', error);
    return { categories: [], message: 'Failed to load categories' };
  }
};

// Generate sample trending skills for demonstration
export const generateSampleTrendingSkills = (count = 10) => {
  const sampleSkills = [
    {
      _id: 'trending_1',
      title: 'React Native Mobile Development',
      description: 'Build amazing mobile apps with React Native. Learn components, navigation, state management, and deployment.',
      skill_description: 'Build amazing mobile apps with React Native. Learn components, navigation, state management, and deployment. Master the fundamentals of mobile development including UI components, navigation patterns, state management with Redux, API integration, and app store deployment.',
      personal_message: 'This skill completely transformed my career! I went from web development to building mobile apps that are now on the App Store. The structured curriculum makes complex concepts easy to understand. Perfect for developers wanting to expand into mobile development.',
      category: 'Programming',
      difficulty: 'intermediate',
      tags: ['react', 'mobile', 'javascript'],
      post_type: 'skill_share',
      likes_count: 245,
      downloads_count: 189,
      views_count: 1420,
      upvotes: 198,
      downvotes: 12,
      save_count: 156,
      shared_by_username: 'dev_master',
      shared_by_display_name: 'Dev Master',
      curriculum: Array.from({length: 30}, (_, i) => ({
        title: `Day ${i + 1}: Mobile Development`,
        description: `Learn mobile development concepts for day ${i + 1}`,
        estimated_time: 30
      }))
    },
    {
      _id: 'trending_2', 
      title: 'Digital Art Fundamentals',
      description: 'Master digital art techniques from basics to advanced. Learn color theory, composition, and digital painting.',
      skill_description: 'Master digital art techniques from basics to advanced. Learn color theory, composition, and digital painting. Covers essential tools, techniques, and creative processes for creating stunning digital artwork.',
      personal_message: 'As someone who started with zero art experience, this curriculum was a game-changer! The daily exercises build skills progressively. Now I create digital art professionally. Highly recommend for anyone wanting to explore their creative side.',
      category: 'Art',
      difficulty: 'beginner',
      tags: ['art', 'digital', 'painting'],
      post_type: 'skill_share',
      likes_count: 198,
      downloads_count: 156,
      views_count: 987,
      upvotes: 167,
      downvotes: 8,
      save_count: 142,
      shared_by_username: 'art_guru',
      shared_by_display_name: 'Art Guru',
      curriculum: Array.from({length: 30}, (_, i) => ({
        title: `Day ${i + 1}: Art Technique`,
        description: `Learn art fundamentals for day ${i + 1}`,
        estimated_time: 45
      }))
    },
    {
      _id: 'trending_3',
      title: 'Spanish Conversation Mastery',
      description: 'Become fluent in Spanish through daily practice. Focus on real conversations and practical vocabulary.',
      category: 'Languages',
      difficulty: 'intermediate',
      tags: ['spanish', 'conversation', 'fluency'],
      likes_count: 167,
      downloads_count: 203,
      views_count: 756,
      shared_by_username: 'polyglot_pro',
      shared_by_display_name: 'Polyglot Pro',
      curriculum: Array.from({length: 30}, (_, i) => ({
        title: `Day ${i + 1}: Spanish Practice`,
        description: `Practice Spanish conversation for day ${i + 1}`,
        estimated_time: 25
      }))
    },
    {
      _id: 'trending_4',
      title: 'Business Strategy & Leadership',
      description: 'Develop strategic thinking and leadership skills. Learn to make better decisions and lead teams effectively.',
      category: 'Business',
      difficulty: 'advanced',
      tags: ['strategy', 'leadership', 'management'],
      likes_count: 134,
      downloads_count: 98,
      views_count: 543,
      shared_by_username: 'biz_leader',
      shared_by_display_name: 'Business Leader',
      curriculum: Array.from({length: 30}, (_, i) => ({
        title: `Day ${i + 1}: Leadership Skills`,
        description: `Develop leadership skills for day ${i + 1}`,
        estimated_time: 40
      }))
    },
    {
      _id: 'trending_5',
      title: 'Meditation & Mindfulness',
      description: 'Find inner peace through daily meditation practice. Reduce stress and improve mental clarity.',
      category: 'Health',
      difficulty: 'beginner',
      tags: ['meditation', 'mindfulness', 'wellness'],
      likes_count: 289,
      downloads_count: 234,
      views_count: 1156,
      shared_by_username: 'zen_master',
      shared_by_display_name: 'Zen Master',
      curriculum: Array.from({length: 30}, (_, i) => ({
        title: `Day ${i + 1}: Meditation Practice`,
        description: `Practice meditation techniques for day ${i + 1}`,
        estimated_time: 20
      }))
    }
  ];
  
  return sampleSkills.slice(0, count);
};

// Generate sample skills for demonstration
export const generateSampleSkills = (count = 20) => {
  const skills = generateSampleTrendingSkills(5);
  const additionalSkills = [
    {
      _id: 'sample_6',
      title: 'Photography Composition',
      description: 'Learn the art of photography composition and lighting techniques.',
      category: 'Art',
      difficulty: 'intermediate',
      tags: ['photography', 'composition', 'lighting'],
      likes_count: 87,
      downloads_count: 65,
      views_count: 423,
      shared_by_username: 'photo_pro',
      shared_by_display_name: 'Photo Pro'
    },
    {
      _id: 'sample_7',
      title: 'Guitar for Beginners',
      description: 'Start your musical journey with basic guitar techniques and songs.',
      category: 'Music',
      difficulty: 'beginner',
      tags: ['guitar', 'music', 'chords'],
      likes_count: 156,
      downloads_count: 122,
      views_count: 634,
      shared_by_username: 'music_teacher',
      shared_by_display_name: 'Music Teacher'
    }
  ];
  
  return [...skills, ...additionalSkills].slice(0, count);
};

// Clear all social data (for testing)
export const clearAllSocialData = async () => {
  try {
    const currentUser = await getCurrentUser();
    await AsyncStorage.multiRemove([
      'shared_skills',
      'social_interactions', 
      'user_downloads',
      `user_skills_${currentUser._id}`
    ]);
    return { message: 'All social data cleared' };
  } catch (error) {
    console.error('Error clearing social data:', error);
    throw error;
  }
};