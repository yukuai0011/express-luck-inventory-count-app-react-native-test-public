import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="work"
        options={{
          title: 'Work',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="scan-circle-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="outbox"
        options={{
          title: 'Outbox',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="archive-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
