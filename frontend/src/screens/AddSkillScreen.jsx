import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, StyleSheet, ImageBackground, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { createSkillPlan } from '../api/plans';
import LoadingModal from '../components/LoadingModal';
import SuccessModal from '../components/SuccessModal';

const suggestions = [
  { icon: 'edit', label: 'Photography' },
  { icon: 'translate', label: 'Spanish' },
  { icon: 'code', label: 'Coding' },
  { icon: 'music-note', label: 'Guitar' },
];

const popularSkills = [
  {
    icon: 'photo-camera',
    title: 'Photography',
    description: 'Master DSLR & composition',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNyaXExmtzKXxokTQ5Cuzx1ZFiB9DptqIHaU_vttrlDyNMIbd530l4__qvL-NS7A9FyLWqdEV6_W-M2S4aPRsJRYP7u8VoPdh9lneB2HvA5pijwtfGlSXBPFzS-7-J1nKbfpPqt2DAaGljbCruQia4E7O9960JBvezHvknYJpTx0HpC41iIBzhMIjTb1fTQIqwUqNXBZmJV1R_cWb4uxo6-NiUHFh7XO2aLV7MzErv_onmXCRtRuxFOfjZUI7E3kRjyn0X3ADwkQU'
  },
  {
    icon: 'translate',
    title: 'Spanish Fluency',
    description: 'Conversational in 30 days',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB_jnO7C_wa9yFe2gHEzbkVVga5xfsx3uWKUPOCTaXOAKROend3cEqsjDLag1M80alw6P5mHjzl4uifBRZks0B83D7TQRQXvXSDdJ_j_91TsGdyxASqWr2BGC6fVd9cWgqRpJj7Qj0HI6LZitzQMYTu75B4xwI4b9opOgQ3cDVv8vmQJ-1JzgGk2KU99-geNqAhEPDAGUmW0H6pj-a-glzMUQaTOHdOkKapleDM9SRmXiEAi3OVogpW7pzyt6HcHFM75LdgPsgbjd4'
  },
  {
    icon: 'restaurant-menu',
    title: 'Cooking',
    description: 'Essential techniques',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBBBvq8AERXd3VJVM6Xjk0deT5lrpY26RtlL1NZY2FF5vGqXLea9rnRM79dnsU0u69Rl9EtQBRmu1L_igndYBgmPUbBvVoEBJtrKQeYlraDuUYLFsfEmI0rx1hv0IFipCjsSESOhQP6Aj94AlE9NKx1_YCDlXjFQksr1xAjyWMPKxoKCMNtfN0QE_s851tnvmgbwrcGbkiuM13B4S7Ufr4vVvvIhQSBlYiXvGoXg6qNWzIM9YGJYDsas4s89ZtWysPdVYQ2BJ3oWV8'
  },
  {
    icon: 'auto-stories',
    title: 'Speed Reading',
    description: 'Double your reading pace',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAVJSAhMfP3BDbmRVQjhe1wj4LNNR9oGvorLbNZOuUWud95aDvGQ2RxCgejK3MstzQvh58-oQoc7BV0lHQB4FKSpJlvtwTRPzl6e4GZIGIhVO7S7G-9rxLj5b7VcFyj3aJrrvYLW2a58aeqPrUhg30kgq2QkLnrgJOMT950rv_fv8pkddHqcoIYUGDHi0TvcdZxKNs_BZNP2o35pMbyeQevNQjMNy2bwWnlGxDsjvVYGR0bI9EeOwI3gOW3rQ4Sr6lJTezKN9VGWUI'
  }
];

export default function AddSkillScreen({ navigation, route }) {
  const { token } = useAuth();
  const [skill, setSkill] = useState('');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const handleGeneratePlan = async () => {
    if (!skill.trim()) {
      Alert.alert('Validation', 'Please enter a skill name.');
      return;
    }

    try {
      setGenerating(true);
      setLoading(true);
      await createSkillPlan(skill.trim(), difficulty, token);
      setGenerating(false);
      setSuccessVisible(true);
    } catch (err) {
      console.error('Plan generation failed:', err);
      Alert.alert('Error', 'Failed to generate the plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getIconForSkill = (skillName) => {
    const lower = skillName.toLowerCase();
    if (lower.includes('photo') || lower.includes('camera')) return 'photo-camera';
    if (lower.includes('spanish') || lower.includes('language')) return 'translate';
    if (lower.includes('code') || lower.includes('program')) return 'code';
    if (lower.includes('guitar') || lower.includes('music')) return 'music-note';
    if (lower.includes('cook') || lower.includes('chef')) return 'restaurant-menu';
    return 'auto-awesome';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back-ios" size={24} color="#374151" style={{ marginLeft: 10 }}/>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Skill Plan</Text>
        <Text style={styles.headerStep}>1/3</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>What skill would you like to master?</Text>
            <TouchableOpacity style={styles.iconButton}>
              <MaterialIcons name="apps" size={24} color="#7C3AED" />
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSubtitle}>Enter a skill or pick from suggestions below.</Text>
        </View>

        <View style={styles.inputSection}>
          <View style={{ position: 'relative' }}>
            <TextInput
              value={skill}
              onChangeText={setSkill}
              placeholder="e.g., Learn Python"
              placeholderTextColor="#9CA3AF"
              style={styles.textInput}
            />
            {skill !== '' && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSkill('')}
              >
                <MaterialIcons name="cancel" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.suggestionsHeader}>
            <Text style={styles.suggestionsTitle}>Suggestions</Text>
            <Text style={styles.charCount}>{skill.length}/50</Text>
          </View>

          <View style={styles.suggestionsGrid}>
            {suggestions.map(s => (
              <TouchableOpacity
                key={s.label}
                style={styles.suggestionChip}
                onPress={() => setSkill(s.label)}
              >
                <MaterialIcons name={s.icon} size={16} color="#4B5563" style={{ marginRight: 4 }} />
                <Text style={styles.suggestionLabel}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.popularSkillsTitle}>Popular skills to master</Text>
          <View style={styles.popularSkillsGrid}>
            {popularSkills.map(skillItem => (
              <TouchableOpacity key={skillItem.title} style={styles.popularSkillCard} onPress={() => setSkill(skillItem.title)}>
                <ImageBackground source={{ uri: skillItem.image }} style={styles.popularSkillImage} imageStyle={{ borderRadius: 12 }}>
                  <View style={styles.popularSkillOverlay}>
                    <View style={styles.popularSkillInfo}>
                      <MaterialIcons name={skillItem.icon} size={14} color="white" style={{ marginRight: 4 }} />
                      <Text style={styles.popularSkillCardTitle}>{skillItem.title}</Text>
                    </View>
                    <Text style={styles.popularSkillDescription}>{skillItem.description}</Text>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Select Difficulty</Text>
          <View style={styles.difficultyContainer}>
            {['Beginner', 'Intermediate', 'Advanced'].map(level => (
              <TouchableOpacity
                key={level}
                style={[styles.difficultyButton, difficulty === level && styles.difficultyButtonSelected]}
                onPress={() => setDifficulty(level)}
              >
                <Text style={[styles.difficultyButtonText, difficulty === level && styles.difficultyButtonTextSelected]}>{level}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, !skill.trim() || loading ? { opacity: 0.6 } : null]}
          onPress={handleGeneratePlan}
          disabled={!skill.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Generate 30-Day Plan</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('AddHabit')}>
          <Text style={styles.secondaryButtonText}>Create Habit Instead</Text>
        </TouchableOpacity>
      </View>

      <LoadingModal visible={generating} />
      <SuccessModal
        visible={successVisible}
        iconName={getIconForSkill(skill)}
        message={`Your "${skill}" plan is ready!`}
        onClose={() => {
          setSuccessVisible(false);
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Repository');
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  backButton: {
    padding: 8,
    marginLeft: -8
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  headerStep: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999
  },
  scrollView: {
    flex: 1
  },
  section: {
    marginBottom: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600'
  },
  iconButton: {
    padding: 8,
    borderRadius: 8
  },
  sectionSubtitle: {
    color: '#6B7280',
    fontSize: 14
  },
  inputSection: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 24,
  },
  textInput: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: '#374151',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280'
  },
  suggestionsTitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  charCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  suggestionsGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    color: '#374151',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999
  },
  suggestionLabel: {
    fontSize: 14,
    fontWeight: '500'
  },
  popularSkillsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12
  },
  popularSkillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  popularSkillCard: {
    width: '48%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  popularSkillImage: {
    width: '100%',
    height: '100%',
  },
  popularSkillOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    padding: 12
  },
  popularSkillInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2
  },
  popularSkillCardTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  },
  popularSkillDescription: {
    color: 'white',
    fontSize: 12
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 8
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  difficultyButtonSelected: {
    backgroundColor: '#F3E8FF',
  },
  difficultyButtonText: {
    textAlign: 'center',
    fontWeight: '500',
    color: '#374151',
  },
  difficultyButtonTextSelected: {
    color: '#7C3AED',
  },
  footer: {
    paddingTop: 24,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#14B8A6',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center'
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12
  },
  secondaryButtonText: {
    color: '#7C3AED',
    textAlign: 'center',
    fontWeight: '600'
  },
}); 