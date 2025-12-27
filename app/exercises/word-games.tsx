import { View, Text, Button } from 'react-native';
import { useState } from 'react';

export default function OneTapWord() {
  const [used, setUsed] = useState(false);

  return (
    <View style={{ alignItems: 'center', marginTop: 20 }}>
      <Text style={{ fontSize: 18 }}>🌟 One try is enough</Text>

      <Button
        title="Speak"
        disabled={used}
        onPress={() => setUsed(true)}
      />

      <Button title="Reset" onPress={() => setUsed(false)} />
    </View>
  );
}