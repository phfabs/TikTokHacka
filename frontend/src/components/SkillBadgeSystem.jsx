import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

const SkillBadgeSystem = ({ skill, onUpgrade, showUpgradeModal, onCloseModal }) => {
  const badges = [
    {
      id: 'standard',
      name: 'Standard',
      icon: 'school',
      color: colors.gray500,
      description: 'Basic skill plan with core curriculum',
      features: [
        '30-day structured learning plan',
        'Daily tasks and exercises',
        'Progress tracking',
        'Basic resources'
      ],
      price: 'Free'
    },
    {
      id: 'enhanced',
      name: 'Enhanced',
      icon: 'star',
      color: colors.warning,
      description: 'Premium skill plan with advanced features',
      features: [
        'Everything in Standard',
        'Video tutorials and demonstrations',
        'Interactive quizzes and assessments',
        'Personalized feedback',
        'Expert tips and best practices',
        'Bonus advanced challenges',
        'Certificate of completion',
        'Priority community support'
      ],
      price: '$9.99'
    },
    {
      id: 'professional',
      name: 'Professional',
      icon: 'workspace-premium',
      color: colors.primary,
      description: 'Complete professional development package',
      features: [
        'Everything in Enhanced',
        'Live expert mentorship sessions',
        'Industry project portfolios',
        'Real-world case studies',
        'Networking opportunities',
        'Job placement assistance',
        'LinkedIn skill verification',
        'Lifetime access to updates'
      ],
      price: '$29.99'
    }
  ];

  const getCurrentBadge = () => {
    return badges.find(badge => badge.id === (skill?.enhancement_level || 'standard'));
  };

  const getAvailableUpgrades = () => {
    const currentLevel = skill?.enhancement_level || 'standard';
    const currentIndex = badges.findIndex(badge => badge.id === currentLevel);
    return badges.slice(currentIndex + 1);
  };

  const renderBadge = (badge, isCurrent = false, isUpgrade = false) => (
    <View key={badge.id} style={[
      styles.badgeContainer,
      isCurrent && styles.currentBadge,
      isUpgrade && styles.upgradeBadge
    ]}>
      <View style={styles.badgeHeader}>
        <View style={[styles.badgeIcon, { backgroundColor: badge.color + '20' }]}>
          <MaterialIcons name={badge.icon} size={24} color={badge.color} />
        </View>
        <View style={styles.badgeInfo}>
          <Text style={styles.badgeName}>{badge.name}</Text>
          <Text style={styles.badgePrice}>{badge.price}</Text>
        </View>
        {isCurrent && (
          <View style={styles.currentBadgeIndicator}>
            <MaterialIcons name="check-circle" size={20} color={colors.success} />
          </View>
        )}
      </View>
      
      <Text style={styles.badgeDescription}>{badge.description}</Text>
      
      <View style={styles.featuresList}>
        {badge.features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <MaterialIcons name="check" size={16} color={colors.success} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      {isUpgrade && (
        <TouchableOpacity
          style={[styles.upgradeButton, { backgroundColor: badge.color }]}
          onPress={() => onUpgrade && onUpgrade(badge.id)}
        >
          <MaterialIcons name="upgrade" size={16} color={colors.white} />
          <Text style={styles.upgradeButtonText}>
            Upgrade to {badge.name}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSkillBadge = () => {
    const currentBadge = getCurrentBadge();
    
    return (
      <TouchableOpacity
        style={styles.skillBadgeDisplay}
        onPress={() => showUpgradeModal && showUpgradeModal()}
        activeOpacity={0.8}
      >
        <View style={[styles.skillBadgeIcon, { backgroundColor: currentBadge.color + '20' }]}>
          <MaterialIcons name={currentBadge.icon} size={18} color={currentBadge.color} />
        </View>
        <Text style={[styles.skillBadgeText, { color: currentBadge.color }]}>
          {currentBadge.name}
        </Text>
        <MaterialIcons name="info" size={16} color={colors.gray400} />
      </TouchableOpacity>
    );
  };

  const renderUpgradeModal = () => (
    <Modal
      visible={showUpgradeModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCloseModal}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Skill Enhancement Levels</Text>
          <TouchableOpacity onPress={onCloseModal}>
            <MaterialIcons name="close" size={24} color={colors.gray700} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.modalSubtitle}>
            Choose the level that best fits your learning goals
          </Text>

          {/* Current Badge */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Current Level</Text>
          </View>
          {renderBadge(getCurrentBadge(), true, false)}

          {/* Available Upgrades */}
          {getAvailableUpgrades().length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Available Upgrades</Text>
              </View>
              {getAvailableUpgrades().map(badge => renderBadge(badge, false, true))}
            </>
          )}

          <View style={styles.modalFooter}>
            <Text style={styles.footerText}>
              All purchases are one-time payments with lifetime access to content.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <>
      {renderSkillBadge()}
      {renderUpgradeModal()}
    </>
  );
};

const styles = StyleSheet.create({
  skillBadgeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray200,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  skillBadgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  skillBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
    flex: 1,
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
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray900,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    color: colors.gray600,
    marginVertical: 20,
    textAlign: 'center',
  },
  sectionHeader: {
    marginTop: 32,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray900,
  },
  badgeContainer: {
    backgroundColor: colors.gray50,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  currentBadge: {
    backgroundColor: colors.success + '10',
    borderColor: colors.success + '30',
  },
  upgradeBadge: {
    backgroundColor: colors.white,
    borderColor: colors.primary + '30',
  },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 2,
  },
  badgePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  currentBadgeIndicator: {
    backgroundColor: colors.success + '20',
    borderRadius: 12,
    padding: 4,
  },
  badgeDescription: {
    fontSize: 14,
    color: colors.gray700,
    marginBottom: 16,
    lineHeight: 20,
  },
  featuresList: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: colors.gray700,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
  },
  upgradeButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  modalFooter: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: colors.gray500,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SkillBadgeSystem;