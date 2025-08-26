import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

const SearchBar = ({ 
  value, 
  onSearch, 
  placeholder = "Search...", 
  debounceMs = 500,
  showClearButton = true 
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);
  const debounceTimer = useRef(null);
  const inputRef = useRef(null);
  const focusAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      if (onSearch) {
        onSearch(inputValue);
      }
    }, debounceMs);

    // Cleanup function
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [inputValue, debounceMs, onSearch]);

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(focusAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(focusAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleClear = () => {
    setInputValue('');
    inputRef.current?.focus();
  };

  const animatedBorderColor = focusAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.gray300, colors.primary],
  });

  const animatedShadowOpacity = focusAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.2],
  });

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          borderColor: animatedBorderColor,
          shadowOpacity: animatedShadowOpacity,
        }
      ]}
    >
      <View style={styles.searchIconContainer}>
        <MaterialIcons 
          name="search" 
          size={20} 
          color={isFocused ? colors.primary : colors.gray500} 
        />
      </View>
      
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={inputValue}
        onChangeText={setInputValue}
        placeholder={placeholder}
        placeholderTextColor={colors.gray400}
        onFocus={handleFocus}
        onBlur={handleBlur}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="never" // We'll handle this manually
      />

      {showClearButton && inputValue.length > 0 && (
        <TouchableOpacity 
          style={styles.clearButton} 
          onPress={handleClear}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons 
            name="clear" 
            size={18} 
            color={colors.gray500} 
          />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIconContainer: {
    marginRight: 12,
    padding: 4,
  },
  input: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    color: colors.text,
    paddingVertical: 18,
    paddingHorizontal: 0,
  },
  clearButton: {
    marginLeft: 12,
    padding: 6,
    backgroundColor: colors.gray300,
    borderRadius: 12,
  },
});

export default SearchBar;