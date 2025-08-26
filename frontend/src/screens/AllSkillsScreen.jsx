import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, ImageBackground, Animated, Dimensions, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { getAllPlans, deleteSkill, refreshSkillImage } from '../api/plans';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';
import CustomModal from '../components/CustomModal';

const { width } = Dimensions.get('window');

const AllSkillsScreen = () => {
  const { token } = useAuth();
  const navigation = useNavigation();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshingImage, setRefreshingImage] = useState(false);
  
  // Modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchSkills = async () => {
    try {
      setError(null);
      const data = await getAllPlans(token);
      setSkills(data.skills || []);
    } catch (err) {
      console.error('Failed to fetch skills', err);
      setError('Failed to load skills. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    fetchSkills();
  };

  useEffect(() => {
    if (token) {
      fetchSkills();
    }
  }, [token]);

  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        fetchSkills();
      }
    }, [token])
  );

  const handleSkillPress = (skill) => {
    navigation.navigate('SkillDetail', { skillId: skill._id });
  };

  const handleSkillMenu = (skill) => {
    setSelectedSkill(skill);
    setMenuVisible(true);
  };

  const handleRefreshImage = async () => {
    if (!selectedSkill) return;
    
    setMenuVisible(false);
    setRefreshingImage(true);
    
    try {
      console.log('Refreshing image for skill:', selectedSkill.title);
      const response = await refreshSkillImage(selectedSkill._id, token);
      console.log('Refresh response:', response);
      
      await fetchSkills(); 
      Alert.alert('Success', 'Background image refreshed successfully! A new image has been selected from our collection.');
    } catch (err) {
      console.error('Failed to refresh image', err);
      console.error('Error details:', err.response?.data || err.message);
      
      let errorMessage = 'Failed to refresh image. Please try again.';
      if (err.response?.status === 401) {
        errorMessage = 'Please log in again to continue.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Skill not found.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setRefreshingImage(false);
      setSelectedSkill(null);
    }
  };

  const handleDeleteSkill = () => {
    if (!selectedSkill) return;
    
    setSkillToDelete(selectedSkill);
    setShowDeleteConfirm(true);
    setMenuVisible(false);
  };

  const confirmDeleteSkill = async () => {
    if (!skillToDelete) return;
    
    try {
      setDeleting(true);
      await deleteSkill(skillToDelete._id, token);
      await fetchSkills();
      setShowDeleteConfirm(false);
      setSkillToDelete(null);
      setSelectedSkill(null);
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Failed to delete skill', err);
      setShowDeleteConfirm(false);
      
      if (err.response?.status === 401) {
        setErrorMessage('Please log in again to continue.');
      } else if (err.response?.status === 403) {
        setErrorMessage('You do not have permission to delete this skill.');
      } else if (err.response?.status === 404) {
        setErrorMessage('This skill no longer exists.');
      } else if (err.response?.status >= 500) {
        setErrorMessage('There was a server error. Please try again later.');
      } else {
        setErrorMessage('Failed to delete skill. Please check your connection and try again.');
      }
      setShowErrorModal(true);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text style={styles.loadingText}>Loading skills...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="error-outline" size={64} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderSkillCard = ({ item, index }) => {
    const progress = item.progress?.completion_percentage || 0;
    const currentDay = item.progress?.current_day || 1;
    const isCompleted = progress >= 100;
    
    return (
      <View style={[styles.skillCard, { marginBottom: 20 }]}>
        <TouchableOpacity
          style={styles.skillCardContent}
          onPress={() => handleSkillPress(item)}
          activeOpacity={0.7}
        >
          <ImageBackground
            source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800' }}
            style={styles.skillImage}
            imageStyle={styles.skillImageStyle}
          >
            <LinearGradient
              colors={isCompleted ? ['rgba(34, 197, 94, 0.8)', 'rgba(34, 197, 94, 0.9)'] : ['rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.7)']}
              style={styles.skillGradient}
            >
              <View style={styles.skillHeader}>
                <View style={styles.skillBadgeContainer}>
                  <View style={[styles.skillBadge, { backgroundColor: isCompleted ? '#10B981' : '#6366F1' }]}>
                    <Text style={styles.skillBadgeText}>
                      {isCompleted ? '✓ Complete' : `Day ${currentDay}/30`}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => handleSkillMenu(item)}
                >
                  <MaterialIcons name="more-vert" size={24} color="white" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.skillInfo}>
                <Text style={styles.skillTitle}>{item.title}</Text>
                <Text style={styles.skillSubtitle}>
                  {item.difficulty ? `${item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)} Level` : '30-Day Challenge'}
                </Text>
                
                <View style={styles.progressSection}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{Math.round(progress)}% Complete</Text>
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Skills</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddSkill')}
          >
            <MaterialIcons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{skills.length}</Text>
            <Text style={styles.statLabel}>Total Skills</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{skills.filter(s => s.progress?.completion_percentage >= 100).length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{skills.filter(s => s.progress?.completion_percentage > 0 && s.progress?.completion_percentage < 100).length}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={skills}
        keyExtractor={(item) => item._id}
        renderItem={renderSkillCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.emptyIconContainer}
            >
              <MaterialIcons name="school" size={48} color="white" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No Skills Yet</Text>
            <Text style={styles.emptyDescription}>
              Start your learning journey by creating your first 30-day skill plan. 
              Choose something you've always wanted to learn!
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('AddSkill')}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.emptyButtonGradient}
              >
                <MaterialIcons name="add" size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.emptyButtonText}>Create Your First Skill</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Menu Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.menuModal}>
            <Text style={styles.menuTitle}>
              {selectedSkill?.title || 'Skill Options'}
            </Text>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleRefreshImage}
              disabled={refreshingImage}
            >
              <MaterialIcons name="refresh" size={24} color="#14B8A6" />
              <Text style={styles.menuItemText}>
                {refreshingImage ? 'Refreshing...' : 'Refresh Background'}
              </Text>
              {refreshingImage && <ActivityIndicator size="small" color="#14B8A6" />}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('SkillEdit', { skillId: selectedSkill?._id })}
            >
              <MaterialIcons name="edit" size={24} color="#6366F1" />
              <Text style={styles.menuItemText}>Edit Skill</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.menuItem, styles.deleteMenuItem]}
              onPress={handleDeleteSkill}
            >
              <MaterialIcons name="delete" size={24} color="#EF4444" />
              <Text style={[styles.menuItemText, styles.deleteMenuText]}>Delete Skill</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setMenuVisible(false);
                setSelectedSkill(null);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Beautiful Modal Components */}
      <ConfirmationModal
        visible={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSkillToDelete(null);
          setSelectedSkill(null);
        }}
        onConfirm={confirmDeleteSkill}
        title="Delete Skill"
        message={`Are you sure you want to delete "${skillToDelete?.title}"? This action cannot be undone and all progress will be lost.`}
        confirmText={deleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        destructive
        icon="delete"
      />

      <SuccessModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Skill Deleted!"
        message={`"${skillToDelete?.title}" has been successfully removed from your skills.`}
        buttonText="Got it"
        icon="check-circle"
      />

      <CustomModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Delete Failed"
        message={errorMessage}
        type="error"
        icon="error-outline"
        primaryButton={{
          text: 'Try Again',
          onPress: () => setShowErrorModal(false),
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  skillCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  skillCardContent: {
    height: 200,
  },
  skillImage: {
    flex: 1,
    justifyContent: 'space-between',
  },
  skillImageStyle: {
    borderRadius: 20,
  },
  skillGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  skillBadgeContainer: {
    flex: 1,
  },
  skillBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  skillBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillInfo: {
    marginTop: 20,
  },
  skillTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  skillSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#14B8A6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: width * 0.8,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  menuItemText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  deleteMenuItem: {
    backgroundColor: '#FEF2F2',
  },
  deleteMenuText: {
    color: '#EF4444',
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});

export default AllSkillsScreen; 