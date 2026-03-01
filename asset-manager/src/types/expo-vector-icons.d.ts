declare module '@expo/vector-icons' {
  import type { ComponentType } from 'react';
  import type { TextProps } from 'react-native';

  export const Ionicons: ComponentType<
    TextProps & { name: string; size?: number; color?: string }
  >;
  export const MaterialIcons: ComponentType<
    TextProps & { name: string; size?: number; color?: string }
  >;
  export const MaterialCommunityIcons: ComponentType<
    TextProps & { name: string; size?: number; color?: string }
  >;
  export const FontAwesome: ComponentType<
    TextProps & { name: string; size?: number; color?: string }
  >;
  export const FontAwesome5: ComponentType<
    TextProps & { name: string; size?: number; color?: string }
  >;
  export const Feather: ComponentType<
    TextProps & { name: string; size?: number; color?: string }
  >;
  export const AntDesign: ComponentType<
    TextProps & { name: string; size?: number; color?: string }
  >;
  export const Entypo: ComponentType<
    TextProps & { name: string; size?: number; color?: string }
  >;
  export const EvilIcons: ComponentType<
    TextProps & { name: string; size?: number; color?: string }
  >;
  export const Foundation: ComponentType<
    TextProps & { name: string; size?: number; color?: string }
  >;
  export const Octicons: ComponentType<
    TextProps & { name: string; size?: number; color?: string }
  >;
  export const SimpleLineIcons: ComponentType<
    TextProps & { name: string; size?: number; color?: string }
  >;
  export const Zocial: ComponentType<
    TextProps & { name: string; size?: number; color?: string }
  >;
}
