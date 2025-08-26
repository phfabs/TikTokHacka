import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { shareSkill } from '../api/social';

const CreateSharedSkillScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: 'beginner',
    tags: [],
    curriculum: [],
    visibility: 'public',
  });
  
  const [currentTag, setCurrentTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Basic Info, 2: Curriculum, 3: Review

  const categories = [
    'Technology', 'Business', 'Creative', 'Health', 'Language',
    'Music', 'Sports', 'Cooking', 'Education', 'Personal Development',
    'Art', 'Photography', 'Writing', 'Design', 'Marketing'
  ];

  const difficulties = [
    { value: 'beginner', label: 'Beginner', color: colors.success },
    { value: 'intermediate', label: 'Intermediate', color: colors.warning },
    { value: 'advanced', label: 'Advanced', color: colors.error },
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleAddCurriculumItem = () => {
    const newItem = {
      id: Date.now().toString(),
      title: '',
      description: '',
      estimated_time: 60,
      resources: []
    };
    
    setFormData(prev => ({
      ...prev,
      curriculum: [...prev.curriculum, newItem]
    }));
  };

  const handleUpdateCurriculumItem = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      curriculum: prev.curriculum.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleRemoveCurriculumItem = (id) => {
    setFormData(prev => ({
      ...prev,
      curriculum: prev.curriculum.filter(item => item.id !== id)
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert('Validation Error', 'Please enter a skill title');
      return false;
    }
    if (!formData.description.trim()) {
      Alert.alert('Validation Error', 'Please enter a skill description');
      return false;
    }
    if (!formData.category) {
      Alert.alert('Validation Error', 'Please select a category');
      return false;
    }
    if (formData.curriculum.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one curriculum item');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // Prepare data for API
      const skillData = {
        ...formData,
        curriculum: formData.curriculum.map(item => ({
          title: item.title,
          description: item.description,
          estimated_time: item.estimated_time,
          resources: item.resources
        }))
      };

      await shareSkill(skillData);
      
      Alert.alert(
        'Success!',
        'Your skill has been shared with the community.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error creating skill:', error);
      Alert.alert('Error', 'Failed to create skill. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderBasicInfo = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      
      {/* Title */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Skill Title *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.title}
          onChangeText={(value) => handleInputChange('title', value)}
          placeholder="What skill will you teach?"
          placeholderTextColor={colors.textTertiary}
        />
      </View>

      {/* Description */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={formData.description}
          onChangeText={(value) => handleInputChange('description', value)}
          placeholder="Describe what learners will achieve..."
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Category */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Category *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoryRow}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  formData.category === category && styles.selectedCategoryChip
                ]}
                onPress={() => handleInputChange('category', category)}
              >
                <Text style={[
                  styles.categoryChipText,
                  formData.category === category && styles.selectedCategoryChipText
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Difficulty */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Difficulty Level</Text>
        <View style={styles.difficultyRow}>
          {difficulties.map((diff) => (
            <TouchableOpacity
              key={diff.value}
              style={[
                styles.difficultyChip,
                formData.difficulty === diff.value && { backgroundColor: diff.color }
              ]}
              onPress={() => handleInputChange('difficulty', diff.value)}
            >
              <Text style={[
                styles.difficultyChipText,
                formData.difficulty === diff.value && styles.selectedDifficultyText
              ]}>
                {diff.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tags */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Tags</Text>
        <View style={styles.tagInputRow}>
          <TextInput
            style={[styles.textInput, styles.tagInput]}
            value={currentTag}
            onChangeText={setCurrentTag}
            placeholder="Add a tag..."
            placeholderTextColor={colors.textTertiary}
            onSubmitEditing={handleAddTag}
          />
          <TouchableOpacity style={styles.addTagButton} onPress={handleAddTag}>
            <MaterialIcons name="add" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
        
        {formData.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {formData.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
                <TouchableOpacity onPress={() => handleRemoveTag(tag)}>
                  <MaterialIcons name="close" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const renderCurriculum = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Curriculum</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddCurriculumItem}>
          <MaterialIcons name="add" size={20} color={colors.white} />
          <Text style={styles.addButtonText}>Add Day</Text>
        </TouchableOpacity>
      </View>

      {formData.curriculum.map((item, index) => (
        <View key={item.id} style={styles.curriculumItem}>
          <View style={styles.curriculumHeader}>
            <Text style={styles.dayLabel}>Day {index + 1}</Text>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveCurriculumItem(item.id)}
            >
              <MaterialIcons name="delete" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.textInput}
            value={item.title}
            onChangeText={(value) => handleUpdateCurriculumItem(item.id, 'title', value)}
            placeholder="Day title..."
            placeholderTextColor={colors.textTertiary}
          />

          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={item.description}
            onChangeText={(value) => handleUpdateCurriculumItem(item.id, 'description', value)}
            placeholder="What will learners do today?"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
          />

          <View style={styles.timeInputContainer}>
            <Text style={styles.timeLabel}>Estimated time (minutes):</Text>
            <TextInput
              style={styles.timeInput}
              value={item.estimated_time.toString()}
              onChangeText={(value) => handleUpdateCurriculumItem(item.id, 'estimated_time', parseInt(value) || 60)}
              placeholder="60"
              keyboardType="numeric"
            />
          </View>
        </View>
      ))}

      {formData.curriculum.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialIcons name="school" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyStateText}>
            Add curriculum items to structure your skill
          </Text>
        </View>
      )}
    </View>
  );

  const renderReview = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Review & Publish</Text>
      
      <View style={styles.reviewCard}>
        <Text style={styles.reviewTitle}>{formData.title}</Text>
        <Text style={styles.reviewDescription}>{formData.description}</Text>
        
        <View style={styles.reviewMeta}>
          <View style={styles.reviewMetaItem}>
            <Text style={styles.reviewMetaLabel}>Category:</Text>
            <Text style={styles.reviewMetaValue}>{formData.category}</Text>
          </View>
          <View style={styles.reviewMetaItem}>
            <Text style={styles.reviewMetaLabel}>Difficulty:</Text>
            <Text style={styles.reviewMetaValue}>{formData.difficulty}</Text>
          </View>
          <View style={styles.reviewMetaItem}>
            <Text style={styles.reviewMetaLabel}>Days:</Text>
            <Text style={styles.reviewMetaValue}>{formData.curriculum.length}</Text>
          </View>
        </View>

        {formData.tags.length > 0 && (
          <View style={styles.reviewTags}>
            {formData.tags.map((tag, index) => (
              <View key={index} style={styles.reviewTag}>
                <Text style={styles.reviewTagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Visibility Settings */}
      <View style={styles.visibilityContainer}>
        <Text style={styles.label}>Visibility</Text>
        <TouchableOpacity
          style={[
            styles.visibilityOption,
            formData.visibility === 'public' && styles.selectedVisibilityOption
          ]}
          onPress={() => handleInputChange('visibility', 'public')}
        >
          <MaterialIcons name="public" size={20} color={colors.primary} />
          <Text style={styles.visibilityText}>Public - Anyone can see and learn</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderBasicInfo();
      case 2:
        return renderCurriculum();
      case 3:
        return renderReview();
      default:
        return renderBasicInfo();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Create Skill</Text>
          <Text style={styles.subtitle}>Step {currentStep} of 3</Text>
        </View>

        <View style={styles.headerRight} />
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {[1, 2, 3].map((step) => (
          <View
            key={step}
            style={[
              styles.progressStep,
              step <= currentStep && styles.activeProgressStep
            ]}
          />
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStepContent()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setCurrentStep(currentStep - 1)}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        <View style={styles.buttonSpacer} />

        {currentStep < 3 ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setCurrentStep(currentStep + 1)}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Publish Skill</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  backButton: {
    padding: 8,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 12,
  },
  headerTitle: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  headerRight: {
    width: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    marginHorizontal: 2,
    borderRadius: 2,
  },
  activeProgressStep: {
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    backgroundColor: colors.white,
    margin: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  categoryChip: {
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedCategoryChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  selectedCategoryChipText: {
    color: colors.white,
    fontWeight: '600',
  },
  difficultyRow: {
    flexDirection: 'row',
  },
  difficultyChip: {
    flex: 1,
    backgroundColor: colors.surfaceTertiary,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  difficultyChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  selectedDifficultyText: {
    color: colors.white,
    fontWeight: '600',
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagInput: {
    flex: 1,
    marginRight: 8,
  },
  addTagButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryUltraLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  tagText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    marginRight: 6,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addButtonText: {
    color: colors.white,
    fontWeight: '600',
    marginLeft: 6,
  },
  curriculumItem: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  curriculumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  removeButton: {
    padding: 8,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  timeLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 8,
  },
  timeInput: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 8,
    width: 80,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 12,
  },
  reviewCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  reviewDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  reviewMeta: {
    marginBottom: 16,
  },
  reviewMetaItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  reviewMetaLabel: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: '500',
    width: 80,
  },
  reviewMetaValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  reviewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  reviewTag: {
    backgroundColor: colors.primaryUltraLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  reviewTagText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  visibilityContainer: {
    marginBottom: 20,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedVisibilityOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryUltraLight,
  },
  visibilityText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    marginLeft: 12,
  },
  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
    backgroundColor: colors.white,
  },
  buttonSpacer: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    minWidth: 120,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    minWidth: 120,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default CreateSharedSkillScreen;