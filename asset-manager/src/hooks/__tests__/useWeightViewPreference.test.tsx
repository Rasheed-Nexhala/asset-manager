import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import {
  WeightViewPreferenceProvider,
  useWeightViewPreference,
} from '../useWeightViewPreference';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');

function TestConsumer() {
  const { viewMode, toggleViewMode, setViewMode } = useWeightViewPreference();
  return (
    <View>
      <Text testID="view-mode">{viewMode}</Text>
      <Pressable testID="toggle" onPress={toggleViewMode}>
        <Text>Toggle</Text>
      </Pressable>
      <Pressable testID="set-kg" onPress={() => setViewMode('kg')}>
        <Text>Set KG</Text>
      </Pressable>
      <Pressable testID="set-pieces" onPress={() => setViewMode('pieces')}>
        <Text>Set Pieces</Text>
      </Pressable>
    </View>
  );
}

describe('useWeightViewPreference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('throws when used outside WeightViewPreferenceProvider', () => {
    const ConsoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestComponent = () => {
      useWeightViewPreference();
      return null;
    };
    expect(() => render(<TestComponent />)).toThrow(
      'useWeightViewPreference must be used within WeightViewPreferenceProvider'
    );
    ConsoleSpy.mockRestore();
  });

  it('defaults to pieces when no stored value', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    render(
      <WeightViewPreferenceProvider>
        <TestConsumer />
      </WeightViewPreferenceProvider>
    );
    await screen.findByTestId('view-mode');
    expect(screen.getByText('pieces')).toBeTruthy();
  });

  it('restores kg from AsyncStorage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('kg');
    render(
      <WeightViewPreferenceProvider>
        <TestConsumer />
      </WeightViewPreferenceProvider>
    );
    await screen.findByTestId('view-mode');
    expect(screen.getByText('kg')).toBeTruthy();
  });

  it('toggleViewMode switches pieces to kg and persists', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    render(
      <WeightViewPreferenceProvider>
        <TestConsumer />
      </WeightViewPreferenceProvider>
    );
    await screen.findByTestId('toggle');
    fireEvent.press(screen.getByTestId('toggle'));
    expect(screen.getByText('kg')).toBeTruthy();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@ciams_weight_view_preference', 'kg');
  });

  it('setViewMode updates mode and persists', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    render(
      <WeightViewPreferenceProvider>
        <TestConsumer />
      </WeightViewPreferenceProvider>
    );
    await screen.findByTestId('set-kg');
    fireEvent.press(screen.getByTestId('set-kg'));
    expect(screen.getByText('kg')).toBeTruthy();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@ciams_weight_view_preference', 'kg');
  });
});
