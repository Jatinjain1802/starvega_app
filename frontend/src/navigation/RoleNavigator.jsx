import React from 'react';
import Profile,{ManagerContact} from '../screens/common/Profile';
import Reports,{Finance} from '../screens/common/Reports';
import Notifications from '../screens/common/Notifications';
import Maintenance from '../screens/common/Maintenance';
import Announcements from '../screens/common/Announcements';
import Expenses from '../screens/common/Expenses';
import Complaints from '../screens/common/Complaints';
import {ResidentRent,StaffRent} from '../screens/common/Rent';
import People from '../screens/common/People';
import Properties from '../screens/common/Properties';
import Rooms from '../screens/common/Rooms';
import ResidentDashboard from '../screens/resident/Dashboard';
import ManagerDashboard from '../screens/manager/Dashboard';
import OwnerDashboard from '../screens/owner/Dashboard';
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
const extras={OWNER:['Notifications','Rent','Reports','Rooms','Residents','Managers','Maintenance','Announcements','ExpenseDetails'],MANAGER:['Notifications','Properties','Rooms','Rent','Maintenance','Announcements','Reports'],RESIDENT:['Notifications','PaymentHistory','ManagerContact']};
function ModuleScreen({route,navigation}){
 const user=useSelector(s=>s.auth.user);
 return <Screen title={route.name} subtitle={user.name}><Card><Text>Module under development.</Text></Card>{['Dashboard','Home'].includes(route.name)?extras[user.role].map(name=><Button key={name} title={name} variant="secondary" onPress={()=>navigation.navigate(name)}/>):null}</Screen>;
}
function RoleTabs(){
 const role=useSelector(s=>s.auth.user.role);
 return <Tabs.Navigator screenOptions={{headerShown:false,tabBarActiveTintColor:colors.primary,tabBarInactiveTintColor:colors.muted}}>{menus[role].map(name=><Tabs.Screen key={name} name={name} component={name==='Profile'?Profile:name==='Finance'?Finance:name==='Updates'?Announcements:name==='Expenses'?Expenses:name==='Complaints'?Complaints:role==='OWNER'&&name==='Dashboard'?OwnerDashboard:role==='MANAGER'&&name==='Dashboard'?ManagerDashboard:role==='RESIDENT'&&name==='Home'?ResidentDashboard:name==='Properties'?Properties:['Residents','Managers'].includes(name)?People:name==='Rent'?(role==='RESIDENT'?ResidentRent:StaffRent):name==='PaymentHistory'?ResidentRent:ModuleScreen}/>)}</Tabs.Navigator>;
}
export default function RoleNavigator(){
 const user=useSelector(s=>s.auth.user);
 if(!user||!menus[user.role])return <Screen title="Account unavailable"><Button title="Sign out" onPress={logout}/></Screen>;
 return <NavigationContainer key={user.id+':'+user.role}><Stack.Navigator><Stack.Screen name="Main" component={RoleTabs} options={{headerShown:false}}/>{extras[user.role].map(name=><Stack.Screen key={name} name={name} component={name==='ManagerContact'?ManagerContact:name==='Reports'?Reports:name==='Notifications'?Notifications:name==='Maintenance'?Maintenance:name==='Announcements'?Announcements:name==='ExpenseDetails'?Expenses:name==='Rooms'?Rooms:name==='Properties'?Properties:['Residents','Managers'].includes(name)?People:name==='Rent'?(user.role==='RESIDENT'?ResidentRent:StaffRent):name==='PaymentHistory'?ResidentRent:ModuleScreen}/>)}</Stack.Navigator></NavigationContainer>;
}
