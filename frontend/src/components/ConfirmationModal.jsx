import React from 'react';
import CustomModal from './CustomModal';

const ConfirmationModal = ({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'confirmation',
  icon,
  destructive = false,
}) => {
  const modalType = destructive ? 'error' : type;
  
  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={title}
      message={message}
      type={modalType}
      icon={icon}
      showCloseButton={false}
      backdropDismiss={false}
      primaryButton={{
        text: confirmText,
        onPress: onConfirm,
      }}
      secondaryButton={{
        text: cancelText,
        onPress: onClose,
      }}
    />
  );
};

export default ConfirmationModal;