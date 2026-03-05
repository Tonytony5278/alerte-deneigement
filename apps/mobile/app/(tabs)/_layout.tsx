import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BRAND } from '@/constants/colors';

export default function TabsLayout() {
  const scheme = useColorScheme() ?? 'light';
  const C = COLORS[scheme];

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: C.tabBar,
          borderTopColor: C.tabBarBorder,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: BRAND.primary,
        tabBarInactiveTintColor: C.icon,
        headerStyle: { backgroundColor: C.background },
        headerTintColor: C.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          headerTitle: '❄️ Alerte Déneigement',
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favoris',
          tabBarLabel: 'Favoris',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="star" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Carte',
          tabBarLabel: 'Carte',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="parking"
        options={{
          title: 'Stationnements',
          tabBarLabel: 'Parking',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Paramètres',
          tabBarLabel: 'Réglages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
