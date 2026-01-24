// Search Bar Component - Reusable search input
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Keyboard,
} from 'react-native';
import { useTheme } from '../theme';

export interface SearchBarProps {
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmit?: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onClear?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  showCancelButton?: boolean;
  cancelText?: string;
  debounceMs?: number;
  style?: any;
  testID?: string;
}

export function SearchBar({
  value: controlledValue,
  onChangeText,
  onSubmit,
  onFocus,
  onBlur,
  onClear,
  placeholder = 'Buscar...',
  autoFocus = false,
  showCancelButton = false,
  cancelText = 'Cancelar',
  debounceMs = 300,
  style,
  testID,
}: SearchBarProps) {
  const theme = useTheme();
  const [internalValue, setInternalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const cancelWidth = useRef(new Animated.Value(0)).current;
  const debounceTimer = useRef<NodeJS.Timeout>();

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  // Handle text change with debounce
  const handleChangeText = useCallback(
    (text: string) => {
      if (controlledValue === undefined) {
        setInternalValue(text);
      }

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        onChangeText?.(text);
      }, debounceMs);
    },
    [controlledValue, onChangeText, debounceMs]
  );

  // Handle submit
  const handleSubmit = useCallback(() => {
    onSubmit?.(value);
    Keyboard.dismiss();
  }, [value, onSubmit]);

  // Handle clear
  const handleClear = useCallback(() => {
    if (controlledValue === undefined) {
      setInternalValue('');
    }
    onChangeText?.('');
    onClear?.();
    inputRef.current?.focus();
  }, [controlledValue, onChangeText, onClear]);

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();

    if (showCancelButton) {
      Animated.timing(cancelWidth, {
        toValue: 80,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [onFocus, showCancelButton, cancelWidth]);

  // Handle blur
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();

    if (showCancelButton && !value) {
      Animated.timing(cancelWidth, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [onBlur, showCancelButton, value, cancelWidth]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    handleClear();
    Keyboard.dismiss();
    setIsFocused(false);

    Animated.timing(cancelWidth, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [handleClear, cancelWidth]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            borderColor: isFocused ? theme.colors.primary : 'transparent',
            borderWidth: 2,
          },
        ]}
      >
        {/* Search Icon */}
        <View style={styles.searchIcon}>
          <Text style={{ color: theme.colors.textSecondary }}>🔍</Text>
        </View>

        {/* Input */}
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: theme.colors.text }]}
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmit}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          returnKeyType="search"
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Clear Button */}
        {value.length > 0 && (
          <TouchableOpacity
            style={[styles.clearButton, { backgroundColor: theme.colors.background }]}
            onPress={handleClear}
          >
            <Text style={{ color: theme.colors.textSecondary, fontSize: 10 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Cancel Button */}
      {showCancelButton && (
        <Animated.View style={{ width: cancelWidth, overflow: 'hidden' }}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={[styles.cancelText, { color: theme.colors.primary }]}>
              {cancelText}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// Search Bar with suggestions
export interface SearchSuggestion {
  id: string;
  text: string;
  type?: string;
}

export interface SearchBarWithSuggestionsProps extends SearchBarProps {
  suggestions?: SearchSuggestion[];
  onSuggestionPress?: (suggestion: SearchSuggestion) => void;
  showSuggestions?: boolean;
}

export function SearchBarWithSuggestions({
  suggestions = [],
  onSuggestionPress,
  showSuggestions = true,
  ...searchBarProps
}: SearchBarWithSuggestionsProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleFocus = useCallback(() => {
    setIsOpen(true);
    searchBarProps.onFocus?.();
  }, [searchBarProps.onFocus]);

  const handleBlur = useCallback(() => {
    // Delay to allow suggestion press
    setTimeout(() => setIsOpen(false), 200);
    searchBarProps.onBlur?.();
  }, [searchBarProps.onBlur]);

  return (
    <View>
      <SearchBar {...searchBarProps} onFocus={handleFocus} onBlur={handleBlur} />

      {/* Suggestions Dropdown */}
      {showSuggestions && isOpen && suggestions.length > 0 && (
        <View
          style={[
            styles.suggestionsContainer,
            {
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.lg,
              borderColor: theme.colors.surface,
            },
          ]}
        >
          {suggestions.map((suggestion) => (
            <TouchableOpacity
              key={suggestion.id}
              style={[styles.suggestionItem, { borderBottomColor: theme.colors.surface }]}
              onPress={() => {
                onSuggestionPress?.(suggestion);
                setIsOpen(false);
              }}
            >
              <Text style={styles.suggestionIcon}>🔍</Text>
              <Text style={[styles.suggestionText, { color: theme.colors.text }]}>
                {suggestion.text}
              </Text>
              {suggestion.type && (
                <Text style={[styles.suggestionType, { color: theme.colors.textSecondary }]}>
                  {suggestion.type}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  clearButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  cancelButton: {
    paddingHorizontal: 12,
    height: 48,
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1000,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  suggestionIcon: {
    fontSize: 14,
    marginRight: 12,
    opacity: 0.5,
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
  },
  suggestionType: {
    fontSize: 12,
    marginLeft: 8,
  },
});
