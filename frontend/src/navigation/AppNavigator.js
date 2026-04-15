import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';

import { useAuth } from '../context/AuthContext';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';

// Resident screens
import DashboardScreen from '../screens/resident/DashboardScreen';
import SubmitComplaintScreen from '../screens/resident/SubmitComplaintScreen';
import MyComplaintsScreen from '../screens/resident/MyComplaintsScreen';
import ComplaintDetailScreen from '../screens/resident/ComplaintDetailScreen';
import ProfileScreen from '../screens/resident/ProfileScreen';

// Official screens
import AdminPanelScreen from '../screens/official/AdminPanelScreen';
import ComplaintManageScreen from '../screens/official/ComplaintManageScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ── Auth ──────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

// ── Resident: Home tab (stack inside tab) ─────────────
function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#1E3A5F',
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="SubmitComplaint"
        component={SubmitComplaintScreen}
        options={{ title: 'Submit Complaint', headerBackTitle: 'Back' }}
      />
    </Stack.Navigator>
  );
}

// ── Resident: Complaints tab (stack inside tab) ────────
function ComplaintsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#1E3A5F',
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="MyComplaints" component={MyComplaintsScreen} options={{ title: 'My Complaints' }} />
      <Stack.Screen
        name="ComplaintDetail"
        component={ComplaintDetailScreen}
        options={{ title: 'Complaint Details', headerBackTitle: 'Back' }}
      />
    </Stack.Navigator>
  );
}

// ── Resident: Profile tab (stack inside tab) ──────────
function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#1E3A5F',
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="ComplaintDetail"
        component={ComplaintDetailScreen}
        options={{ title: 'Complaint Details', headerBackTitle: 'Back' }}
      />
      <Stack.Screen name="MyComplaints" component={MyComplaintsScreen} options={{ title: 'My Complaints' }} />
    </Stack.Navigator>
  );
}

// ── Resident bottom tabs ───────────────────────────────
function ResidentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#F1F5F9',
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            HomeTab: focused ? '🏠' : '🏡',
            ComplaintsTab: focused ? '📋' : '📄',
            ProfileTab: focused ? '👤' : '👥',
          };
          return <Text style={{ fontSize: 20 }}>{icons[route.name]}</Text>;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: 'Home' }} />
      <Tab.Screen name="ComplaintsTab" component={ComplaintsStack} options={{ title: 'Complaints' }} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

// ── Admin stack ────────────────────────────────────────
function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#1E3A5F',
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="AdminPanel" component={AdminPanelScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="ComplaintManage"
        component={ComplaintManageScreen}
        options={{ title: 'Manage Complaint', headerBackTitle: 'Back' }}
      />
    </Stack.Navigator>
  );
}

// ── Loading Screen ─────────────────────────────────────
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingLogo}>🏘️</Text>
      <Text style={styles.loadingTitle}>CommunityFix</Text>
      <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingLogo: { fontSize: 64, marginBottom: 12 },
  loadingTitle: { fontSize: 26, fontWeight: '700', color: '#1E3A5F' },
});

// ── Root ───────────────────────────────────────────────
export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  const isOfficial = user?.role === 'Official' || user?.role === 'official';

  return (
    <NavigationContainer>
      {!user ? (
        <AuthStack />
      ) : isOfficial ? (
        <AdminStack />
      ) : (
        <ResidentTabs />
      )}
    </NavigationContainer>
  );
}
