import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#0a84ff',
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="work"
        options={{
          title: 'Work',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="inventory-2" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="outbox"
        options={{
          title: 'Queue',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="cloud-queue" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
