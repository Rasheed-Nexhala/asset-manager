import {
  createNavigationContainerRef,
  type ParamListBase,
} from '@react-navigation/native';

/**
 * Shared ref for root navigation. Lives in its own file to avoid require cycles:
 * RootNavigator → BottomTabNavigator → … → DashboardScreen → navigationUtils
 * must not import the full RootNavigator module.
 */
export const navigationRef = createNavigationContainerRef<ParamListBase>();
