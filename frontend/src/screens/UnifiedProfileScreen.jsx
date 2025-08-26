import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import LogoutModal from '../components/LogoutModal';

const UnifiedProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const profileSections = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person',
          title: 'Edit Profile',
          subtitle: 'Update your personal information',
          onPress: () => navigation.navigate('EditProfile'),
          showArrow: true,
        },
        {
          icon: 'security',
          title: 'Privacy & Security',
          subtitle: 'Manage your privacy settings',
          onPress: () => {},
          showArrow: true,
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'notifications',
          title: 'Push Notifications',
          subtitle: 'Get notified about updates',
          toggle: true,
          value: notifications,
          onToggle: setNotifications,
        },
        {
          icon: 'email',
          title: 'Email Updates',
          subtitle: 'Receive email notifications',
          toggle: true,
          value: emailUpdates,
          onToggle: setEmailUpdates,
        },
        {
          icon: 'volume-up',
          title: 'Sound Effects',
          subtitle: 'Enable app sounds',
          toggle: true,
          value: soundEnabled,
          onToggle: setSoundEnabled,
        },
        {
          icon: 'dark-mode',
          title: 'Dark Mode',
          subtitle: 'Switch to dark theme',
          toggle: true,
          value: darkMode,
          onToggle: setDarkMode,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'help',
          title: 'Help Center',
          subtitle: 'Get help and support',
          onPress: () => {},
          showArrow: true,
        },
        {
          icon: 'feedback',
          title: 'Send Feedback',
          subtitle: 'Share your thoughts with us',
          onPress: () => {},
          showArrow: true,
        },
        {
          icon: 'info',
          title: 'About',
          subtitle: 'App version and information',
          onPress: () => {},
          showArrow: true,
        },
      ],
    },
  ];

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  const renderSettingItem = (item) => (
    <TouchableOpacity
      key={item.title}
      style={styles.settingItem}
      onPress={item.onPress}
      disabled={item.toggle}
      activeOpacity={0.7}
    >
      <View style={styles.settingIconContainer}>
        <MaterialIcons name={item.icon} size={22} color={colors.primary} />
      </View>
      
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{item.title}</Text>
        <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
      </View>
      
      {item.toggle ? (
        <Switch
          value={item.value}
          onValueChange={item.onToggle}
          trackColor={{ 
            false: colors.border, 
            true: colors.primaryLight 
          }}
          thumbColor={item.value ? colors.primary : colors.textTertiary}
          ios_backgroundColor={colors.border}
        />
      ) : item.showArrow && (
        <MaterialIcons name="chevron-right" size={20} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Profile Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header Navigation */}
        <View style={styles.headerNavigation}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.displayName}>
            {user?.display_name || user?.username || 'User'}
          </Text>
          
          <Text style={styles.email}>
            {user?.email || 'user@example.com'}
          </Text>
        </View>
      </LinearGradient>

      {/* Settings Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          {profileSections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionCard}>
                {section.items.map((item, index) => (
                  <View key={item.title}>
                    {renderSettingItem(item)}
                    {index < section.items.length - 1 && (
                      <View style={styles.separator} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* Logout Section */}
          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <TouchableOpacity 
                style={styles.logoutButton} 
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <View style={styles.logoutIconContainer}>
                  <MaterialIcons name="logout" size={22} color={colors.error} />
                </View>
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.versionText}>SkillShare v1.0.0</Text>
            <Text style={styles.copyrightText}>© 2024 SkillShare Team</Text>
          </View>
        </View>
      </ScrollView>
      
      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Header Styles
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
    paddingBottom: 40,
  },
  headerNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  headerSpacer: {
    width: 40,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // Content Styles
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 68,
  },

  // Setting Item Styles
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  settingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryUltraLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Logout Styles
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoutIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },

  // Footer Styles
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  versionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
});

export default UnifiedProfileScreen;