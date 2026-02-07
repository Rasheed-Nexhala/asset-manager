import { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { setUser } from '../store/slices/authSlice';
import { subscribeToAuthState } from '../services/firebase/authService';

export const useAuthStateSync = (): void => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user) => {
      dispatch(setUser(user));
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch]);
};

export default useAuthStateSync;
