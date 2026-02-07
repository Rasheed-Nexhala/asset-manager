import './global.css';
import './config/firebase'; // Initialize Firebase
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginSignupScreen } from './src/screens';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <LoginSignupScreen
        onLogin={(email, password) => {
          console.log('Login', { email, password: '***' });
        }}
        onSignup={(name, email, password) => {
          console.log('Signup', { name, email, password: '***' });
        }}
      />
    </SafeAreaProvider>
  );
}