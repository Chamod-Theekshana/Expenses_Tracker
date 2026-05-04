import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemeContext } from '../store/theme';
import AppText from './AppText';
import AppButton from './AppButton';

type Props = {
  children: React.ReactNode;
  onReset?: () => void;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[ErrorBoundary] Unhandled error:', error);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children as React.ReactElement;
    }

    return (
      <ThemeContext.Consumer>
        {({ colors }) => (
          <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              <AppText style={[styles.title, { color: colors.text }]}>Something went wrong</AppText>
              <AppText muted style={styles.subtitle}>
                The app hit an unexpected error. Please try again.
              </AppText>
              <View style={styles.actions}>
                <AppButton title="Try again" onPress={this.handleReset} />
              </View>
            </View>
          </View>
        )}
      </ThemeContext.Consumer>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    marginTop: 16,
  },
});
