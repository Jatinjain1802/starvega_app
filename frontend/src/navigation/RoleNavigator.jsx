import { OwnerScopeProvider } from '../screens/owner/Scope';
import React from 'react';
import { View } from 'react-native';
import Profile, { ManagerContact } from '../screens/common/Profile';
import Finance from '../screens/owner/Finance';
import Icon from '../screens/owner/Icon';
import Reports from '../screens/common/Reports';
import Notifications from '../screens/common/Notifications';
import Maintenance from '../screens/common/Maintenance';
import Announcements from '../screens/common/Announcements';
import Expenses from '../screens/common/Expenses';
import Complaints from '../screens/common/Complaints';
import { ResidentRent, StaffRent } from '../screens/common/Rent';
import People from '../screens/common/People';
import Properties from '../screens/common/Properties';
import Rooms from '../screens/common/Rooms';
import ResidentDashboard from '../screens/resident/Dashboard';
import ManagerDashboard from '../screens/manager/Dashboard';
import OwnerDashboard from '../screens/owner/Dashboard';
import { useSelector } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Screen, Button } from '../components';
import { colors } from '../theme';
import { logout } from '../services/auth';
const Tabs = createBottomTabNavigator(),
  Stack = createNativeStackNavigator();
const menus = {
  OWNER: ['Dashboard', 'Properties', 'Finance', 'Complaints', 'Profile'],
  MANAGER: ['Dashboard', 'Residents', 'Expenses', 'Complaints', 'Profile'],
  RESIDENT: ['Home', 'Rent', 'Complaints', 'Updates', 'Profile'],
};
const extras = {
  OWNER: [
    'Notifications',
    'Rent',
    'Reports',
    'Rooms',
    'Residents',
    'Managers',
    'Maintenance',
    'Announcements',
    'ExpenseDetails',
  ],
  MANAGER: ['Notifications', 'Properties', 'Rooms', 'Rent', 'Maintenance', 'Announcements', 'Reports'],
  RESIDENT: ['Notifications', 'PaymentHistory', 'ManagerContact'],
};
const tabIcons = {
  Dashboard: 'home',
  Home: 'home',
  Expenses: 'receipt',
  Residents: 'people',
  Rent: 'finance',
  Updates: 'bell',
  Properties: 'building',
  Finance: 'finance',
  Complaints: 'chat',
  Profile: 'user',
};
function tabOptions(name) {
  return {
    tabBarLabel: name === 'Dashboard' ? 'Home' : name,
    tabBarIcon: ({ color, focused, size }) => (
      <View
        style={{
          width: 40,
          height: 26,
          borderRadius: 13,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: focused ? colors.soft : 'transparent',
        }}
      >
        <Icon name={tabIcons[name]} size={Math.min(20, size)} color={color} />
      </View>
    ),
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.muted,
    tabBarLabelStyle: { fontWeight: '600' },
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
    tabBarHideOnKeyboard: true,
  };
}
function OwnerComplaints(props) {
  return (
    <Complaints
      key={String(props.route.params?.visit ?? 'tab') + String(props.route.params?.propertyId ?? 'all')}
      {...props}
    />
  );
}
const routes = {
  Home: ResidentDashboard,
  Finance,
  Properties,
  Profile,
  Residents: People,
  Managers: People,
  Expenses,
  ExpenseDetails: Expenses,
  Updates: Announcements,
  Announcements,
  Maintenance,
  Notifications,
  Reports,
  Rooms,
  ManagerContact,
  PaymentHistory: ResidentRent,
};
function componentFor(name, role) {
  if (name === 'Dashboard') return role === 'OWNER' ? OwnerDashboard : ManagerDashboard;
  if (name === 'Rent') return role === 'RESIDENT' ? ResidentRent : StaffRent;
  if (name === 'Complaints') return role === 'OWNER' ? OwnerComplaints : Complaints;
  return routes[name];
}
function RoleTabs() {
  const role = useSelector((s) => s.auth.user.role);
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      {menus[role].map((name) => (
        <Tabs.Screen
          name={name}
          key={name}
          component={componentFor(name, role)}
          options={tabOptions(name)}
        />
      ))}
    </Tabs.Navigator>
  );
}
export default function RoleNavigator() {
  const user = useSelector((s) => s.auth.user);
  if (!user || !menus[user.role])
    return (
      <Screen title="Account unavailable">
        <Button title="Sign out" onPress={logout} />
      </Screen>
    );
  const Scope = user.role === 'OWNER' ? OwnerScopeProvider : React.Fragment;
  return (
    <Scope key={user.id + ':' + user.role}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerTitle: 'Starvega PG',
            headerTintColor: colors.primary,
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            headerBackButtonDisplayMode: 'minimal',
          }}
        >
          <Stack.Screen name="Main" component={RoleTabs} options={{ headerShown: false }} />
          {extras[user.role].map((name) => (
            <Stack.Screen key={name} name={name} component={componentFor(name, user.role)} />
          ))}
        </Stack.Navigator>
      </NavigationContainer>
    </Scope>
  );
}
