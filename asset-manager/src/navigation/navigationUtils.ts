import { navigationRef } from './RootNavigator';

/**
 * Navigate to ProcessRequest screen using the root navigator.
 * Use this when navigating from outside the Request stack (e.g. Dashboard, NotificationCenter,
 * push notifications) to avoid "screen not handled" errors with nested navigators.
 */
export function navigateToProcessRequest(requestId: string): void {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('Main', {
    screen: 'Tabs',
    params: {
      screen: 'Requests',
      params: {
        screen: 'ProcessRequest',
        params: { requestId },
      },
    },
  });
}
