import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

const GroupCollaboration = ({ skillId, onClose }) => {
  const [groups, setGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('browse'); // browse, my-groups, create
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  
  // Create group form
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    privacy: 'public',
    max_members: 20
  });
  
  // Join group form
  const [joinForm, setJoinForm] = useState({
    invitation_code: ''
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'browse') {
        await loadAvailableGroups();
      } else if (activeTab === 'my-groups') {
        await loadMyGroups();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableGroups = async () => {
    try {
      // Simulate API call - replace with actual API
      const mockGroups = [
        {
          _id: 'group1',
          name: 'React Learners United',
          description: 'Learning React together, sharing knowledge and progress',
          skill_title: 'Master React Development',
          current_members: 15,
          max_members: 25,
          privacy: 'public',
          creator_username: 'jane_doe',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          stats: {
            total_discussions: 8,
            avg_completion_rate: 65.2
          }
        },
        {
          _id: 'group2',
          name: 'Python Fundamentals Study Group',
          description: 'Daily practice and discussion for Python beginners',
          skill_title: 'Python Programming Basics',
          current_members: 8,
          max_members: 15,
          privacy: 'invite_only',
          creator_username: 'python_guru',
          created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
          stats: {
            total_discussions: 23,
            avg_completion_rate: 78.9
          }
        }
      ];
      
      setGroups(mockGroups);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadMyGroups = async () => {
    try {
      // Simulate API call - replace with actual API
      const mockMyGroups = [
        {
          _id: 'group3',
          name: 'JavaScript Ninjas',
          description: 'Advanced JavaScript techniques and patterns',
          skill_title: 'Advanced JavaScript',
          current_members: 12,
          max_members: 20,
          my_role: 'admin',
          my_progress: {
            current_day: 15,
            completed_days: 14,
            completion_percentage: 93.3
          },
          joined_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          stats: {
            total_discussions: 45,
            total_messages: 234
          }
        }
      ];
      
      setMyGroups(mockMyGroups);
    } catch (error) {
      console.error('Error loading my groups:', error);
    }
  };

  const handleCreateGroup = async () => {
    try {
      if (!createForm.name.trim()) {
        Alert.alert('Error', 'Group name is required');
        return;
      }

      // Simulate API call - replace with actual API
      const newGroup = {
        _id: `group_${Date.now()}`,
        name: createForm.name,
        description: createForm.description,
        privacy: createForm.privacy,
        max_members: createForm.max_members,
        current_members: 1,
        invitation_code: 'ABC12345'
      };

      Alert.alert(
        'Success',
        `Group "${newGroup.name}" created successfully!\n${
          newGroup.privacy === 'invite_only' 
            ? `Invitation code: ${newGroup.invitation_code}` 
            : ''
        }`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowCreateModal(false);
              setCreateForm({ name: '', description: '', privacy: 'public', max_members: 20 });
              loadData();
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create group');
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      const group = groups.find(g => g._id === groupId);
      
      if (group.privacy === 'invite_only') {
        setSelectedGroup(group);
        setShowJoinModal(true);
        return;
      }

      // Simulate joining public group
      Alert.alert('Success', `Joined "${group.name}" successfully!`);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to join group');
    }
  };

  const handleJoinWithCode = async () => {
    try {
      if (!joinForm.invitation_code.trim()) {
        Alert.alert('Error', 'Invitation code is required');
        return;
      }

      // Simulate API call
      Alert.alert('Success', `Joined "${selectedGroup.name}" successfully!`);
      setShowJoinModal(false);
      setJoinForm({ invitation_code: '' });
      setSelectedGroup(null);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Invalid invitation code');
    }
  };

  const formatDate = (date) => {
    const now = new Date();
    const diffTime = Math.abs(now - new Date(date));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  const renderGroupCard = (group, isMyGroup = false) => (
    <View style={styles.groupCard}>
      <View style={styles.groupHeader}>
        <View style={styles.groupTitleSection}>
          <Text style={styles.groupName} numberOfLines={1}>
            {group.name}
          </Text>
          <View style={styles.groupMeta}>
            <MaterialIcons 
              name={group.privacy === 'public' ? 'public' : group.privacy === 'private' ? 'lock' : 'group'} 
              size={12} 
              color={colors.gray500} 
            />
            <Text style={styles.groupMetaText}>
              {group.privacy === 'invite_only' ? 'Invite Only' : 
               group.privacy === 'private' ? 'Private' : 'Public'}
            </Text>
            <Text style={styles.groupMetaText}>•</Text>
            <Text style={styles.groupMetaText}>
              {group.current_members}/{group.max_members} members
            </Text>
          </View>
        </View>
        
        {isMyGroup && (
          <View style={[styles.roleBadge, group.my_role === 'admin' && styles.adminBadge]}>
            <Text style={[styles.roleText, group.my_role === 'admin' && styles.adminText]}>
              {group.my_role}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.groupDescription} numberOfLines={2}>
        {group.description || 'No description provided'}
      </Text>

      <View style={styles.groupStats}>
        <View style={styles.statItem}>
          <MaterialIcons name="forum" size={14} color={colors.primary} />
          <Text style={styles.statText}>
            {group.stats?.total_discussions || 0} discussions
          </Text>
        </View>
        
        {group.stats?.avg_completion_rate && (
          <View style={styles.statItem}>
            <MaterialIcons name="trending-up" size={14} color={colors.success} />
            <Text style={styles.statText}>
              {group.stats.avg_completion_rate.toFixed(1)}% avg completion
            </Text>
          </View>
        )}
      </View>

      {isMyGroup ? (
        <View style={styles.myGroupActions}>
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>Your Progress</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${group.my_progress?.completion_percentage || 0}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              Day {group.my_progress?.current_day || 1} • {group.my_progress?.completion_percentage?.toFixed(1) || 0}% complete
            </Text>
          </View>
          
          <TouchableOpacity style={styles.viewGroupButton}>
            <Text style={styles.viewGroupButtonText}>View Group</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.joinButton}
          onPress={() => handleJoinGroup(group._id)}
        >
          <MaterialIcons name="group-add" size={16} color={colors.white} />
          <Text style={styles.joinButtonText}>Join Group</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowCreateModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Create Study Group</Text>
          <TouchableOpacity onPress={() => setShowCreateModal(false)}>
            <MaterialIcons name="close" size={24} color={colors.gray700} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Group Name *</Text>
            <TextInput
              style={styles.textInput}
              value={createForm.name}
              onChangeText={(text) => setCreateForm({...createForm, name: text})}
              placeholder="Enter a descriptive group name..."
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={createForm.description}
              onChangeText={(text) => setCreateForm({...createForm, description: text})}
              placeholder="Describe your group's goals and learning approach..."
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Privacy Setting</Text>
            <View style={styles.privacyOptions}>
              {[
                { value: 'public', label: 'Public', desc: 'Anyone can join' },
                { value: 'invite_only', label: 'Invite Only', desc: 'Requires invitation code' },
                { value: 'private', label: 'Private', desc: 'Creator approval required' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.privacyOption,
                    createForm.privacy === option.value && styles.selectedPrivacyOption
                  ]}
                  onPress={() => setCreateForm({...createForm, privacy: option.value})}
                >
                  <Text style={[
                    styles.privacyLabel,
                    createForm.privacy === option.value && styles.selectedPrivacyLabel
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={styles.privacyDesc}>{option.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Maximum Members</Text>
            <TextInput
              style={styles.textInput}
              value={createForm.max_members.toString()}
              onChangeText={(text) => {
                const num = parseInt(text) || 20;
                setCreateForm({...createForm, max_members: Math.min(Math.max(num, 2), 100)});
              }}
              placeholder="20"
              keyboardType="numeric"
            />
            <Text style={styles.inputHelp}>Between 2 and 100 members</Text>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={handleCreateGroup}
          >
            <Text style={styles.createButtonText}>Create Group</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderJoinModal = () => (
    <Modal
      visible={showJoinModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowJoinModal(false)}
    >
      <View style={styles.joinModalOverlay}>
        <View style={styles.joinModalContent}>
          <Text style={styles.joinModalTitle}>
            Join "{selectedGroup?.name}"
          </Text>
          <Text style={styles.joinModalDesc}>
            This group requires an invitation code to join.
          </Text>
          
          <TextInput
            style={styles.codeInput}
            value={joinForm.invitation_code}
            onChangeText={(text) => setJoinForm({...joinForm, invitation_code: text.toUpperCase()})}
            placeholder="Enter invitation code"
            maxLength={8}
            autoCapitalize="characters"
          />
          
          <View style={styles.joinModalActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setShowJoinModal(false);
                setJoinForm({ invitation_code: '' });
                setSelectedGroup(null);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.joinWithCodeButton}
              onPress={handleJoinWithCode}
            >
              <Text style={styles.joinWithCodeButtonText}>Join Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Study Groups</Text>
        <TouchableOpacity onPress={onClose}>
          <MaterialIcons name="close" size={24} color={colors.gray700} />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'browse' && styles.activeTab]}
          onPress={() => setActiveTab('browse')}
        >
          <Text style={[styles.tabText, activeTab === 'browse' && styles.activeTabText]}>
            Browse Groups
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my-groups' && styles.activeTab]}
          onPress={() => setActiveTab('my-groups')}
        >
          <Text style={[styles.tabText, activeTab === 'my-groups' && styles.activeTabText]}>
            My Groups
          </Text>
        </TouchableOpacity>
      </View>

      {/* Create Group Button */}
      <TouchableOpacity 
        style={styles.createGroupButton}
        onPress={() => setShowCreateModal(true)}
      >
        <MaterialIcons name="add" size={18} color={colors.white} />
        <Text style={styles.createGroupButtonText}>Create Group</Text>
      </TouchableOpacity>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading groups...</Text>
        </View>
      ) : (
        <FlatList
          data={activeTab === 'browse' ? groups : myGroups}
          renderItem={({ item }) => renderGroupCard(item, activeTab === 'my-groups')}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons 
                name={activeTab === 'browse' ? 'groups' : 'group-work'} 
                size={48} 
                color={colors.gray400} 
              />
              <Text style={styles.emptyStateTitle}>
                {activeTab === 'browse' ? 'No Groups Found' : 'No Groups Joined'}
              </Text>
              <Text style={styles.emptyStateText}>
                {activeTab === 'browse' 
                  ? 'Be the first to create a study group for this skill!'
                  : 'Join or create a group to start collaborating with others.'
                }
              </Text>
            </View>
          }
        />
      )}

      {renderCreateModal()}
      {renderJoinModal()}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray900,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: colors.primary + '15',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray600,
  },
  activeTabText: {
    color: colors.primary,
  },
  createGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginHorizontal: 20,
    marginVertical: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createGroupButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.gray600,
    marginTop: 12,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  groupCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  groupTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 4,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupMetaText: {
    fontSize: 12,
    color: colors.gray500,
    marginLeft: 4,
  },
  roleBadge: {
    backgroundColor: colors.gray200,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminBadge: {
    backgroundColor: colors.primary + '20',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.gray600,
    textTransform: 'uppercase',
  },
  adminText: {
    color: colors.primary,
  },
  groupDescription: {
    fontSize: 14,
    color: colors.gray700,
    lineHeight: 20,
    marginBottom: 16,
  },
  groupStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: colors.gray600,
    marginLeft: 4,
  },
  myGroupActions: {
    marginTop: 8,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.gray200,
    borderRadius: 3,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: colors.gray600,
  },
  viewGroupButton: {
    backgroundColor: colors.gray100,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewGroupButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray700,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  joinButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray700,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginTop: 24,
  },
  inputLabel: {
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
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputHelp: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 4,
  },
  privacyOptions: {
    marginTop: 8,
  },
  privacyOption: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  selectedPrivacyOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  privacyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: 4,
  },
  selectedPrivacyLabel: {
    color: colors.primary,
  },
  privacyDesc: {
    fontSize: 14,
    color: colors.gray600,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  joinModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinModalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  joinModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
    textAlign: 'center',
    marginBottom: 8,
  },
  joinModalDesc: {
    fontSize: 14,
    color: colors.gray600,
    textAlign: 'center',
    marginBottom: 20,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'monospace',
    marginBottom: 24,
  },
  joinModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: colors.gray100,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray700,
  },
  joinWithCodeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  joinWithCodeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});

export default GroupCollaboration;