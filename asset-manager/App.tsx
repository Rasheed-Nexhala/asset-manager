import './global.css';
import './config/firebase';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { useAuthStateSync } from './src/hooks/useAuthStateSync';
import { useUserRoleSync } from './src/hooks/useUserRoleSync';
import { useManagerValidationSync } from './src/hooks/useManagerValidationSync';
import { useAppSelector } from './src/store/hooks';
import { 
  selectUserId, 
  selectIsAuthenticated, 
  selectIsAdmin, 
  selectIsRoleLoaded 
} from './src/store/selectors/authSelectors';
import { RootNavigator } from './src/navigation/RootNavigator';

// Suppress SafeAreaView deprecation warning
// We're already using react-native-safe-area-context correctly
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
]);

function AppContent() {
  useAuthStateSync();
  const userId = useAppSelector(selectUserId);
  useUserRoleSync(userId);
  useManagerValidationSync();

  return (
    <>
      <StatusBar style="dark" />
      <RootNavigator />
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
