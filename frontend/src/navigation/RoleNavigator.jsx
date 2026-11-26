import React from 'react';
import {Text} from 'react-native';
import {useSelector} from 'react-redux';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {Screen,Button,Card} from '../components';
import {colors} from '../theme';
import {logout} from '../services/auth';
const Tabs=createBottomTabNavigator(),Stack=createNativeStackNavigator();
const menus={OWNER:['Dashboard','Properties','Finance','Complaints','Profile'],MANAGER:['Dashboard','Residents','Expenses','Complaints','Profile'],RESIDENT:['Home','Rent','Complaints','Updates','Profile']};
const extras={OWNER:['Notifications','Reports','Rooms','Managers','Maintenance','Announcements','ExpenseDetails'],MANAGER:['Notifications','Properties','Rooms','Rent','Maintenance','Announcements','Reports'],RESIDENT:['Notifications','PaymentHistory','ManagerContact']};
function ModuleScreen({route,navigation}){
 const user=useSelector(s=>s.auth.user);
 return <Screen title={route.name} subtitle={user.name}><Card><Text>Module under development.</Text></Card>{['Dashboard','Home'].includes(route.name)?extras[user.role].map(name=><Button key={name} title={name} variant="secondary" onPress={()=>navigation.navigate(name)}/>):null}</Screen>;
}
function Profile({navigation}){
 const user=useSelector(s=>s.auth.user);
 return <Screen title="Profile"><Card><Text>{user.name}</Text><Text>{user.phone}</Text><Text>{user.role}</Text></Card><Button title="Notifications" onPress={()=>navigation.navigate('Notifications')}/><Button title="Sign out" onPress={logout}/></Screen>;
}
function RoleTabs(){
 const role=useSelector(s=>s.auth.user.role);
 return <Tabs.Navigator screenOptions={{headerShown:false,tabBarActiveTintColor:colors.primary,tabBarInactiveTintColor:colors.muted}}>{menus[role].map(name=><Tabs.Screen key={name} name={name} component={name==='Profile'?Profile:ModuleScreen}/>)}</Tabs.Navigator>;
}
export default function RoleNavigator(){
 const user=useSelector(s=>s.auth.user);
 if(!user||!menus[user.role])return <Screen title="Account unavailable"><Button title="Sign out" onPress={logout}/></Screen>;
 return <NavigationContainer key={user.id+':'+user.role}><Stack.Navigator><Stack.Screen name="Main" component={RoleTabs} options={{headerShown:false}}/>{extras[user.role].map(name=><Stack.Screen key={name} name={name} component={ModuleScreen}/>)}</Stack.Navigator></NavigationContainer>;
}
