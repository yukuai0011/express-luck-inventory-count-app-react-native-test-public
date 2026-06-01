import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from 'heroui-native';

type Props = { children: string };

export const ResultBlock = ({ children }: Props) => (
  <View className="rounded-md border border-border p-3 bg-background">
    <Text style={styles.code}>{children}</Text>
  </View>
);

const styles = StyleSheet.create({
  code: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    fontSize: 12,
  },
});
