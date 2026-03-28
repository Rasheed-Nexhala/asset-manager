import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import authReducer from '../../../store/slices/authSlice';
import { VehiclesListScreen } from '../VehiclesListScreen';

const mockListVehicles = jest.fn().mockResolvedValue([
  {
    id: 'v1',
    vehicleNumber: 'MH-12-AB-1',
    vehicleNumberNormalized: 'mh-12-ab-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    createdByUserId: 'u1',
    createdByName: 'Test',
  },
]);

jest.mock('../../../services/firebase/vehicleService', () => ({
  listVehicles: (...a: unknown[]) => mockListVehicles(...a),
}));

jest.mock('../../../services/firebase/vehicleFuelAssignmentService', () => ({
  getTotalLitersAssignedToVehicle: jest.fn().mockResolvedValue(50),
}));

const Stack = createStackNavigator();

function TestNav() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="VehiclesList" component={VehiclesListScreen} />
    </Stack.Navigator>
  );
}

describe('VehiclesListScreen', () => {
  it('shows vehicle number when loaded', async () => {
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: {
        auth: {
          user: { uid: 'u1' } as never,
          userRole: { role: 'StoreIncharge', userId: 'u1', email: 'x@test.com' } as never,
          isAuthenticated: true,
          isRoleLoading: false,
          authInitialized: true,
          isLoading: false,
          error: null,
        },
      },
    });

    render(
      <Provider store={store}>
        <NavigationContainer>
          <TestNav />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('MH-12-AB-1')).toBeTruthy();
    });
  });
});
