import './global.css';
import './config/firebase';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { useAppSelector } from './src/store/hooks';
import { 
  selectIsAuthenticated, 
  selectUserId, 
  selectRoleLoading 
} from './src/store/selectors/authSelectors';
import { useAuthStateSync } from './src/hooks/useAuthStateSync';
import { useUserRoleSync } from './src/hooks/useUserRoleSync';
import { AuthFlowScreen, SignedInScreen, LoadingScreen } from './src/screens';

// Suppress SafeAreaView deprecation warning
// We're already using react-native-safe-area-context correctly
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
]);

function AppContent() {
  useAuthStateSync();
  const userId = useAppSelector(selectUserId);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isRoleLoading = useAppSelector(selectRoleLoading);
  
  useUserRoleSync(userId);

  // Show loading screen while fetching user role data
  if (isAuthenticated && isRoleLoading) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  return (
    <>
      <StatusBar style="dark" />
      {isAuthenticated ? <SignedInScreen /> : <AuthFlowScreen />}
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </Provider>
  );
}
