import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

export default function NfcTab() {
  const router = useRouter();

  useEffect(() => {
    router.push('/leer-nfc');
  }, [router]);

  return <View />;
}

