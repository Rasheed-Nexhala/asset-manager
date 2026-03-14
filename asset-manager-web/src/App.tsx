import './config/firebase';
import { RouterProvider } from 'react-router-dom';
import { useAppSelector } from './store/hooks';
import { selectAuthInitialized, selectUserId } from './store/selectors/authSelectors';
import { useAuthStateSync } from './hooks/useAuthStateSync';
import { useUserRoleSync } from './hooks/useUserRoleSync';
import { useInventoryAccessSync } from './hooks/useInventoryAccessSync';
import { useManagerValidationSync } from './hooks/useManagerValidationSync';
import { WeightViewPreferenceProvider } from './hooks/useWeightViewPreference';
import { router } from './router';
import { AuthCheckingPage } from './pages/AuthCheckingPage';

function AppContent() {
  useAuthStateSync();
  const userId = useAppSelector(selectUserId);
  const authInitialized = useAppSelector(selectAuthInitialized);

  useUserRoleSync(userId);
  useInventoryAccessSync();
  useManagerValidationSync();

  if (!authInitialized) {
    return <AuthCheckingPage />;
  }

  return <RouterProvider router={router} />;
}

function App() {
  return (
    <WeightViewPreferenceProvider>
      <AppContent />
    </WeightViewPreferenceProvider>
  );
}

export default App;
