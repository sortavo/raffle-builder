// Home Screen - Raffle List
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { RaffleList } from '@sortavo/sdk-ui/native';
import type { Raffle } from '@sortavo/sdk';

export default function HomeScreen() {
  const router = useRouter();

  const handleRafflePress = (raffle: Raffle) => {
    router.push(`/raffle/${raffle.id}`);
  };

  return (
    <View style={styles.container}>
      <RaffleList
        status="active"
        onRafflePress={handleRafflePress}
        showProgress
        showCountdown
        columns={1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});
