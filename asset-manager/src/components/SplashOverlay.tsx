import React from 'react';
import { View, Image, Text, ImageSourcePropType } from 'react-native';

/**
 * Splash overlay shown while the app loads (auth state resolving).
 * Displays the app logo with "Powered By Nexhala" text below.
 * Matches the native splash background for a seamless transition.
 */
const SPLASH_IMAGE = require('../../assets/splash.png') as ImageSourcePropType;

export const SplashOverlay: React.FC = () => {
  return (
    <View
      className="flex-1 bg-white items-center justify-center"
      accessibilityLabel="Loading Asset Manager"
    >
      <View className="items-center gap-6">
        <Image
          source={SPLASH_IMAGE}
          resizeMode="contain"
          className="w-[200px] h-[120px]"
          accessibilityIgnoresInvertColors
        />
        <Text
          className="text-[13px] text-[#64748B]"
          accessibilityLabel="Powered by Nexhala"
        >
          Powered By Nexhala
        </Text>
      </View>
    </View>
  );
};
