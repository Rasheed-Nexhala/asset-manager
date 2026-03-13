import React from 'react';
import { View, Image, Text, ImageSourcePropType } from 'react-native';

/**
 * Splash overlay shown while the app loads (auth state resolving).
 * Displays the app icon, app name, and "Powered By Nexhala" below.
 * Matches the native splash background for a seamless transition.
 */
const SPLASH_ICON = require('../../assets/splash-icon.png') as ImageSourcePropType;

export const SplashOverlay: React.FC = () => {
  return (
    <View
      className="flex-1 bg-white items-center justify-center"
      accessibilityLabel="Loading Asset Manager"
    >
      <View className="items-center gap-4">
        <Image
          source={SPLASH_ICON}
          resizeMode="contain"
          className="w-[120px] h-[120px]"
          accessibilityIgnoresInvertColors
        />
        <Text className="text-[22px] font-semibold text-[#1E293B] tracking-tight">
          IBF Asset Manager
        </Text>
        <Text
          className="text-[13px] text-[#94A3B8]"
          accessibilityLabel="Powered by Nexhala"
        >
          Powered by Nexhala
        </Text>
      </View>
    </View>
  );
};
