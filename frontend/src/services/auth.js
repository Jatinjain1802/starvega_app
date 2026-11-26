import axios from 'axios';
import * as Keychain from 'react-native-keychain';
import { API_BASE_URL } from '../config/api';
import { api,setAccessToken } from '../api/client';
import { store,signedIn,signedOut } from '../store';
const authApi=axios.create({baseURL:API_BASE_URL,timeout:15000});
const service='starvega.refresh';
let refreshToken=null, pending=null, generation=0;
async function accept(data,epoch){
 if(epoch!==generation)throw new Error('Session changed');
 await Keychain.setGenericPassword('session',data.refreshToken,{service});
 if(epoch!==generation){await Keychain.resetGenericPassword({service});throw new Error('Session changed');}
 refreshToken=data.refreshToken;setAccessToken(data.accessToken);store.dispatch(signedIn(data.user));
 return data.user;
}
export async function login(phone,password){
 const epoch=++generation;
 const {data}=await authApi.post('/auth/login',{phone,password});
 return accept(data,epoch);
}
export function refresh(){
 if(pending)return pending;
 const epoch=generation;
 pending=(async()=>{
  const saved=refreshToken||(await Keychain.getGenericPassword({service}))?.password;
  if(!saved)return null;
  try{const {data}=await authApi.post('/auth/refresh',{refreshToken:saved});return await accept(data,epoch);}
  catch(e){if(epoch===generation&&e.response?.status===401){refreshToken=null;setAccessToken(null);store.dispatch(signedOut());await Keychain.resetGenericPassword({service});}throw e;}
 })().finally(()=>{pending=null;});
 return pending;
}
export async function logout(){
 ++generation;
 if(pending)try{await pending;}catch{}
 const token=refreshToken||(await Keychain.getGenericPassword({service}))?.password;
 refreshToken=null;setAccessToken(null);store.dispatch(signedOut());
 await Keychain.resetGenericPassword({service});
 if(token)try{await authApi.post('/auth/logout',{refreshToken:token});}catch{}
}
export async function acceptInvitation(payload){return authApi.post('/auth/invitations/accept',payload);}
api.interceptors.response.use(r=>r,async error=>{
 const config=error.config;
 if(error.response?.status!==401||!config||config._retried||!store.getState().auth.user)throw error;
 config._retried=true;
 if(!await refresh())throw error;
 return api(config);
});
