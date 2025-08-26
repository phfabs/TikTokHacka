import React from 'react';
import CustomModal from './CustomModal';

const SuccessModal = ({
  visible,
  onClose,
  title,
  message,
  buttonText = 'Great!',
  icon = 'check-circle',
  autoClose = false,
  autoCloseDelay = 2000,
}) => {
  React.useEffect(() => {
    if (visible && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      
      return () => clearTimeout(timer);
    }
  }, [visible, autoClose, autoCloseDelay, onClose]);
  
  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={title}
      message={message}
      type="success"
      icon={icon}
      showCloseButton={true}
      backdropDismiss={true}
      primaryButton={{
        text: buttonText,
        onPress: onClose,
      }}
    />
  );
};

export default SuccessModal; 