import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { addCustomTask } from '../api/social';

const CustomTaskEditor = ({ 
  visible, 
  onClose, 
  skillId, 
  day, 
  onTaskAdded 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    resources: [''],
    estimated_time: '',
    task_type: 'reading'
  });
  const [loading, setLoading] = useState(false);

  const taskTypes = [
    { value: 'reading', label: 'Reading', icon: 'book' },
    { value: 'exercise', label: 'Exercise', icon: 'fitness-center' },
    { value: 'project', label: 'Project', icon: 'build' },
    { value: 'video', label: 'Video', icon: 'play-circle' },
    { value: 'quiz', label: 'Quiz', icon: 'quiz' }
  ];

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      instructions: '',
      resources: [''],
      estimated_time: '',
      task_type: 'reading'
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleResourceChange = (index, value) => {
    const newResources = [...formData.resources];
    newResources[index] = value;
    setFormData({ ...formData, resources: newResources });
  };

  const addResourceField = () => {
    if (formData.resources.length < 5) {
      setFormData({ 
        ...formData, 
        resources: [...formData.resources, ''] 
      });
    }
  };

  const removeResourceField = (index) => {
    if (formData.resources.length > 1) {
      const newResources = formData.resources.filter((_, i) => i !== index);
      setFormData({ ...formData, resources: newResources });
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Task title is required');
      return false;
    }
    if (formData.title.trim().length < 3) {
      Alert.alert('Error', 'Title must be at least 3 characters long');
      return false;
    }
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Task description is required');
      return false;
    }
    if (formData.description.trim().length < 10) {
      Alert.alert('Error', 'Description must be at least 10 characters long');
      return false;
    }
    if (formData.estimated_time && (isNaN(formData.estimated_time) || formData.estimated_time < 5 || formData.estimated_time > 480)) {
      Alert.alert('Error', 'Estimated time must be between 5 and 480 minutes');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // Filter out empty resources
      const validResources = formData.resources
        .filter(resource => resource.trim().length > 0)
        .map(resource => resource.trim());

      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        instructions: formData.instructions.trim(),
        resources: validResources,
        estimated_time: formData.estimated_time ? parseInt(formData.estimated_time) : 60,
        task_type: formData.task_type
      };

      await addCustomTask(skillId, day, taskData);
      
      Alert.alert(
        'Success',
        'Custom task added successfully!',
        [{ text: 'OK', onPress: () => {
          if (onTaskAdded) onTaskAdded();
          handleClose();
        }}]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to add custom task');
    } finally {
      setLoading(false);
    }
  };

  const renderTaskTypeSelector = () => (
    <View style={styles.taskTypeContainer}>
      <Text style={styles.label}>Task Type *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.taskTypeScroll}>
        {taskTypes.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.taskTypeButton,
              formData.task_type === type.value && styles.selectedTaskType
            ]}
            onPress={() => setFormData({ ...formData, task_type: type.value })}
          >
            <MaterialIcons 
              name={type.icon} 
              size={20} 
              color={formData.task_type === type.value ? colors.white : colors.gray600} 
            />
            <Text style={[
              styles.taskTypeText,
              formData.task_type === type.value && styles.selectedTaskTypeText
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <MaterialIcons name="close" size={24} color={colors.gray700} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Custom Task</Text>
          <Text style={styles.dayBadge}>Day {day}</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Task Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Task Title *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="Enter a clear, descriptive title..."
              maxLength={100}
              autoFocus
            />
            <Text style={styles.characterCount}>{formData.title.length}/100</Text>
          </View>

          {/* Task Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Describe what learners will do in this task..."
              multiline
              numberOfLines={4}
              maxLength={1000}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{formData.description.length}/1000</Text>
          </View>

          {/* Task Type */}
          {renderTaskTypeSelector()}

          {/* Instructions */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Detailed Instructions</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={formData.instructions}
              onChangeText={(text) => setFormData({ ...formData, instructions: text })}
              placeholder="Provide step-by-step instructions (optional)..."
              multiline
              numberOfLines={6}
              maxLength={2000}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{formData.instructions.length}/2000</Text>
          </View>

          {/* Estimated Time */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Estimated Time (minutes)</Text>
            <TextInput
              style={styles.textInput}
              value={formData.estimated_time}
              onChangeText={(text) => setFormData({ ...formData, estimated_time: text })}
              placeholder="e.g., 60"
              keyboardType="numeric"
              maxLength={3}
            />
            <Text style={styles.helpText}>Time range: 5-480 minutes (8 hours max)</Text>
          </View>

          {/* Resources */}
          <View style={styles.inputGroup}>
            <View style={styles.resourcesHeader}>
              <Text style={styles.label}>Resources & Links</Text>
              <TouchableOpacity 
                style={styles.addResourceButton}
                onPress={addResourceField}
                disabled={formData.resources.length >= 5}
              >
                <MaterialIcons name="add" size={16} color={colors.primary} />
                <Text style={styles.addResourceText}>Add Resource</Text>
              </TouchableOpacity>
            </View>
            
            {formData.resources.map((resource, index) => (
              <View key={index} style={styles.resourceInputContainer}>
                <TextInput
                  style={[styles.textInput, styles.resourceInput]}
                  value={resource}
                  onChangeText={(text) => handleResourceChange(index, text)}
                  placeholder="https://example.com or resource name..."
                />
                {formData.resources.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeResourceButton}
                    onPress={() => removeResourceField(index)}
                  >
                    <MaterialIcons name="remove" size={18} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <Text style={styles.helpText}>Add helpful links, videos, or references</Text>
          </View>

          {/* Guidelines */}
          <View style={styles.guidelinesContainer}>
            <Text style={styles.guidelinesTitle}>Task Guidelines</Text>
            <View style={styles.guideline}>
              <MaterialIcons name="check-circle" size={16} color={colors.success} />
              <Text style={styles.guidelineText}>Make tasks specific and actionable</Text>
            </View>
            <View style={styles.guideline}>
              <MaterialIcons name="check-circle" size={16} color={colors.success} />
              <Text style={styles.guidelineText}>Provide clear learning outcomes</Text>
            </View>
            <View style={styles.guideline}>
              <MaterialIcons name="check-circle" size={16} color={colors.success} />
              <Text style={styles.guidelineText}>Include relevant resources when possible</Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={handleClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <MaterialIcons name="save" size={18} color={colors.white} />
                <Text style={styles.submitButtonText}>Add Task</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray900,
    flex: 1,
    textAlign: 'center',
  },
  dayBadge: {
    backgroundColor: colors.primary,
    color: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.gray900,
    backgroundColor: colors.white,
  },
  multilineInput: {
    minHeight: 100,
    paddingTop: 12,
  },
  characterCount: {
    fontSize: 12,
    color: colors.gray500,
    textAlign: 'right',
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 4,
    fontStyle: 'italic',
  },
  taskTypeContainer: {
    marginBottom: 24,
  },
  taskTypeScroll: {
    marginTop: 8,
  },
  taskTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    marginRight: 12,
    minWidth: 100,
  },
  selectedTaskType: {
    backgroundColor: colors.primary,
  },
  taskTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray600,
    marginLeft: 6,
  },
  selectedTaskTypeText: {
    color: colors.white,
  },
  resourcesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addResourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addResourceText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    marginLeft: 4,
  },
  resourceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resourceInput: {
    flex: 1,
    marginRight: 8,
  },
  removeResourceButton: {
    padding: 8,
    backgroundColor: colors.error + '15',
    borderRadius: 8,
  },
  guidelinesContainer: {
    backgroundColor: colors.gray50,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: 12,
  },
  guideline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  guidelineText: {
    fontSize: 14,
    color: colors.gray700,
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    backgroundColor: colors.white,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.gray100,
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray700,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  submitButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginLeft: 6,
  },
});

export default CustomTaskEditor;