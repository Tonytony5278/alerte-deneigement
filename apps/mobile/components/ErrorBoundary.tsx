import React, { Component, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BRAND, RADIUS, FONT_SIZE, SPACING } from '@/constants/colors';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>*</Text>
          <Text style={styles.title}>Oups !</Text>
          <Text style={styles.message}>
            Une erreur inattendue s'est produite.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => this.setState({ hasError: false })}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Reessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    backgroundColor: '#0F172A',
  },
  icon: {
    fontSize: 48,
    marginBottom: SPACING.md,
    color: '#FFFFFF',
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: SPACING.sm,
  },
  message: {
    fontSize: FONT_SIZE.base,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  button: {
    backgroundColor: BRAND.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.md,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
  },
});
