/**
 * App Error Boundary
 *
 * Catches React render errors and displays CIAMS-styled fallback UI.
 * Wraps the app to prevent white screen of death on component errors.
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import * as Sentry from '@sentry/react-native';
import { ErrorBoundaryFallback } from './ErrorBoundaryFallback';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    if (__DEV__) {
      console.error('AppErrorBoundary caught error:', error, errorInfo);
    }
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <ErrorBoundaryFallback
          error={this.state.error}
          resetError={this.resetError}
        />
      );
    }
    return this.props.children;
  }
}
