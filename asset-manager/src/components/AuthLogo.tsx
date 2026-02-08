import React from 'react';
import { View, Image, ImageSourcePropType } from 'react-native';

const IBF_LOGO = require('../assets/images/IBF_logo.png') as ImageSourcePropType;

export interface AuthLogoProps {
  source?: ImageSourcePropType;
  width?: number;
  accessibilityLabel?: string;
  className?: string;
}

export const AuthLogo: React.FC<AuthLogoProps> = ({
  source = IBF_LOGO,
  width = 200,
  accessibilityLabel = 'IBF Engineering Services logo',
  className = '',
}) => {
  return (
    <View
      className={`items-center justify-center ${className}`.trim()}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Image
        source={source}
        resizeMode="contain"
        style={{ width, height: width * 0.4 }}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
};
