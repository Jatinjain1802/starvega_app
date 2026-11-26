import {Platform,PermissionsAndroid} from 'react-native';
import {getApp} from '@react-native-firebase/app';
import {getMessaging,requestPermission,AuthorizationStatus,getToken,onTokenRefresh,deleteToken,registerDeviceForRemoteMessages} from '@react-native-firebase/messaging';
import {api} from '../api/client';
let unsubscribe=null,registered=null,epoch=0;
export async function enablePush(){
 const generation=++epoch;
 unsubscribe?.();unsubscribe=null;
 if(Platform.OS==='android'&&Number(Platform.Version)>=33){
  const result=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  if(result!==PermissionsAndroid.RESULTS.GRANTED)return false;
 }
 const messaging=getMessaging(getApp());
 if(Platform.OS==='ios'){
  const status=await requestPermission(messaging);
  if(![AuthorizationStatus.AUTHORIZED,AuthorizationStatus.PROVISIONAL].includes(status))return false;
  await registerDeviceForRemoteMessages(messaging);
 }
 async function register(token){
  if(generation!==epoch)return;
  await api.put('/notifications/devices',{token,platform:Platform.OS==='ios'?'IOS':'ANDROID'});
  if(generation===epoch)registered=token;
 }
 await register(await getToken(messaging));
 if(generation!==epoch)return false;
 unsubscribe=onTokenRefresh(messaging,token=>{register(token).catch(()=>{});});
 return true;
}
export async function disablePush(){
 ++epoch;unsubscribe?.();unsubscribe=null;
 const token=registered;registered=null;
 try{if(token)await api.delete('/notifications/devices',{data:{token}});}
 finally{await deleteToken(getMessaging(getApp()));}
}
