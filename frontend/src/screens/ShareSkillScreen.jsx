import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/colors';
import { getSkillsForSharing, shareSkillToSocial } from '../api/social';
import SkillSharedSuccessModal from '../components/SkillSharedSuccessModal';

const ShareSkillScreen = ({ navigation }) => {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sharingSkill, setSharingSkill] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [skillDescription, setSkillDescription] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [activeTab, setActiveTab] = useState('skill'); // 'skill' or 'message'
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    loadSkillsForSharing();
  }, []);

  const loadSkillsForSharing = async () => {
    try {
      setLoading(true);
      const data = await getSkillsForSharing();
      setSkills(data.skills || []);
    } catch (error) {
      console.error('Error loading skills for sharing:', error);
      Alert.alert('Error', 'Failed to load your skills');
    } finally {
      setLoading(false);
    }
  };

  const handleShareSkill = (skill) => {
    setSelectedSkill(skill);
    setSkillDescription(skill.description || `Learn ${skill.title} - comprehensive 30-day learning plan covering all essential concepts and practical applications.`);
    setPersonalMessage('');
    setActiveTab('skill');
    setEditModalVisible(true);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return colors.success;
      case 'intermediate': return colors.warning;
      case 'advanced': return colors.error;
      default: return colors.primary;
    }
  };

  const confirmShareSkill = async () => {
    if (!selectedSkill || sharingSkill === selectedSkill._id) return;
    if (!skillDescription.trim()) {
      Alert.alert('Missing Content', 'Please add a skill description before sharing.');
      return;
    }

    try {
      setSharingSkill(selectedSkill._id);
      
      // Create updated skill with dual content
      const updatedSkill = {
        ...selectedSkill,
        skill_description: skillDescription.trim(),
        personal_message: personalMessage.trim(),
        description: skillDescription.trim(), // Fallback for existing code
      };
      
      const result = await shareSkillToSocial(updatedSkill);
      
      if (result.success) {
        setEditModalVisible(false);
        setSkillDescription('');
        setPersonalMessage('');
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error sharing skill:', error);
      Alert.alert('Error', 'Failed to share skill');
    } finally {
      setSharingSkill(null);
    }
  };

  const renderSkillItem = ({ item }) => (
    <View style={styles.skillCard}>
      <View style={styles.skillContent}>
        <Text style={styles.skillTitle}>{item.title}</Text>
        <Text style={styles.skillDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.skillMeta}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          <View style={[
            styles.difficultyPill,
            { backgroundColor: getDifficultyColor(item.difficulty) }
          ]}>
            <Text style={styles.difficultyText}>{item.difficulty}</Text>
          </View>
          <View style={styles.durationInfo}>
            <MaterialIcons name="schedule" size={14} color={colors.textTertiary} />
            <Text style={styles.durationText}>{item.estimated_duration || 30} days</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.shareButton,
          sharingSkill === item._id && styles.sharingButton
        ]}
        onPress={() => handleShareSkill(item)}
        disabled={sharingSkill === item._id}
      >
        {sharingSkill === item._id ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <>
            <MaterialIcons name="share" size={18} color={colors.white} />
            <Text style={styles.shareButtonText}>Share</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="psychology" size={64} color={colors.textTertiary} />
      <Text style={styles.emptyStateTitle}>No Skills to Share</Text>
      <Text style={styles.emptyStateText}>
        Create some skills in your repository first, then come back to share them with the community!
      </Text>
      <TouchableOpacity 
        style={styles.createSkillButton}
        onPress={() => navigation.navigate('RepositoryStack', { screen: 'AddSkill' })}
      >
        <MaterialIcons name="add" size={20} color={colors.white} />
        <Text style={styles.createSkillButtonText}>Create a Skill</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your skills...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share a Skill</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Skills List */}
      <FlatList
        data={skills}
        renderItem={renderSkillItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[
          styles.skillsList,
          skills.length === 0 && styles.emptyList
        ]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Edit Description Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setEditModalVisible(false)}
            >
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Customize Your Post</Text>
            <TouchableOpacity 
              style={styles.modalShareButton}
              onPress={confirmShareSkill}
              disabled={sharingSkill === selectedSkill?._id}
            >
              {sharingSkill === selectedSkill?._id ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.modalShareButtonText}>Share</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {/* Skill Preview Card */}
            <View style={styles.skillPreview}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.05)', 'rgba(139, 92, 246, 0.02)']}
                style={styles.skillPreviewGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.skillPreviewHeader}>
                <Text style={styles.skillPreviewTitle}>{selectedSkill?.title}</Text>
                <View style={styles.skillPreviewMeta}>
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryText}>{selectedSkill?.category}</Text>
                  </View>
                  <View style={[styles.difficultyPill, { backgroundColor: getDifficultyColor(selectedSkill?.difficulty) }]}>
                    <Text style={styles.difficultyText}>{selectedSkill?.difficulty}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.skillStats}>
                <MaterialIcons name="schedule" size={16} color={colors.textTertiary} />
                <Text style={styles.durationText}>{selectedSkill?.estimated_duration || 30} days</Text>
              </View>
            </View>

            {/* Content Type Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'skill' && styles.activeTab]}
                onPress={() => setActiveTab('skill')}
              >
                <MaterialIcons 
                  name="school" 
                  size={18} 
                  color={activeTab === 'skill' ? colors.white : colors.textSecondary} 
                />
                <Text style={[styles.tabText, activeTab === 'skill' && styles.activeTabText]}>
                  Skill Description
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'message' && styles.activeTab]}
                onPress={() => setActiveTab('message')}
              >
                <MaterialIcons 
                  name="message" 
                  size={18} 
                  color={activeTab === 'message' ? colors.white : colors.textSecondary} 
                />
                <Text style={[styles.tabText, activeTab === 'message' && styles.activeTabText]}>
                  Your Message
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content Areas */}
            {activeTab === 'skill' ? (
              <View style={styles.contentSection}>
                <Text style={styles.contentLabel}>Skill Description</Text>
                <Text style={styles.contentHint}>
                  Describe what this skill teaches and what learners will achieve
                </Text>
                <TextInput
                  style={styles.contentInput}
                  value={skillDescription}
                  onChangeText={setSkillDescription}
                  placeholder="e.g., Master React Native fundamentals including components, navigation, state management, and build complete mobile apps..."
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  textAlignVertical="top"
                />
                <Text style={styles.characterCount}>
                  {skillDescription.length}/500
                </Text>
              </View>
            ) : (
              <View style={styles.contentSection}>
                <Text style={styles.contentLabel}>Your Personal Message</Text>
                <Text style={styles.contentHint}>
                  Share your thoughts, tips, or experience with this skill (optional)
                </Text>
                <TextInput
                  style={styles.contentInput}
                  value={personalMessage}
                  onChangeText={setPersonalMessage}
                  placeholder="e.g., I found this skill incredibly valuable for my career. The curriculum is well-structured and the projects are practical. Here's what I learned..."
                  multiline
                  numberOfLines={5}
                  maxLength={1000}
                  textAlignVertical="top"
                />
                <Text style={styles.characterCount}>
                  {personalMessage.length}/1000
                </Text>
              </View>
            )}

            {/* Preview Section */}
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Preview</Text>
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>{selectedSkill?.title}</Text>
                {skillDescription.trim() && (
                  <Text style={styles.previewDescription} numberOfLines={2}>
                    {skillDescription}
                  </Text>
                )}
                {personalMessage.trim() && (
                  <Text style={styles.previewMessage} numberOfLines={2}>
                    💬 {personalMessage}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <SkillSharedSuccessModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onContinue={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0 + 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  placeholder: {
    width: 40,
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
  skillsList: {
    padding: 16,
  },
  emptyList: {
    flexGrow: 1,
  },
  skillCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  skillContent: {
    flex: 1,
    marginBottom: 12,
  },
  skillTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  skillDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  skillMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  categoryPill: {
    backgroundColor: colors.primaryUltraLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  difficultyPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
    textTransform: 'capitalize',
  },
  durationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  durationText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginLeft: 4,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  sharingButton: {
    opacity: 0.7,
  },
  shareButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  createSkillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createSkillButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  modalCloseButton: {
    padding: 12,
    borderRadius: 24,
    backgroundColor: colors.surfaceSecondary,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  modalShareButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 28,
    minWidth: 90,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  modalShareButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  skillPreview: {
    backgroundColor: colors.white,
    padding: 24,
    borderRadius: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  skillPreviewGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  skillPreviewHeader: {
    marginBottom: 12,
    position: 'relative',
    zIndex: 1,
  },
  skillPreviewTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  skillPreviewMeta: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  categoryPill: {
    backgroundColor: colors.primaryUltraLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  difficultyPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
    textTransform: 'capitalize',
  },
  skillStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    position: 'relative',
    zIndex: 1,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 6,
    marginBottom: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    gap: 8,
  },
  activeTab: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.white,
    fontWeight: '700',
  },
  contentSection: {
    marginBottom: 20,
  },
  contentLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  contentHint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  contentInput: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    fontSize: 16,
    color: colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  characterCount: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: 8,
    fontWeight: '500',
  },
  previewSection: {
    marginTop: 10,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: colors.surfaceSecondary,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  previewDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  previewMessage: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    fontStyle: 'italic',
    backgroundColor: colors.primaryUltraLight,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
});

export default ShareSkillScreen;