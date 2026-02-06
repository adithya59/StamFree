import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  // Auth logic is now handled in app/_layout.tsx
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#1a73e8" />
    </View>
  );
}

