import React, { useState, useCallback } from 'react';
import { LoginScreen } from './LoginScreen';
import { SignupScreen } from './SignupScreen';

type AuthFlowScreenName = 'login' | 'signup';

/**
 * Wrapper that shows either Login or Signup screen based on user action.
 * Defaults to Login; user can switch to Signup and back via links.
 */
export const AuthFlowScreen: React.FC = () => {
  const [screen, setScreen] = useState<AuthFlowScreenName>('login');

  const showSignup = useCallback(() => setScreen('signup'), []);
  const showLogin = useCallback(() => setScreen('login'), []);

  if (screen === 'signup') {
    return <SignupScreen onGoToLogin={showLogin} />;
  }

  return <LoginScreen onGoToSignup={showSignup} />;
};
