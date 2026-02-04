import './global.css';
import { Text, View } from 'react-native';

export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl text-green-500">
        Welcome to Nativewind!
      </Text>
    </View>
  );
}