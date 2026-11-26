import React,{useEffect,useState} from 'react';
import {Provider,useSelector} from 'react-redux';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {store} from './src/store';
import {refresh,logout} from './src/services/auth';
import {Screen,LoadingState,ErrorState,Button} from './src/components';
import Login from './src/screens/auth/Login';
import Invitation from './src/screens/auth/Invitation';
function Root(){
 const user=useSelector(s=>s.auth.user);
 const [state,setState]=useState('loading'),[invite,setInvite]=useState(false);
 async function restore(){setState('loading');try{await refresh();setState('ready');}catch(e){setState(e.response?.status===401?'ready':'error');}}
 useEffect(()=>{restore();},[]);
 if(state==='loading')return <Screen title="Starvega PG"><LoadingState message="Restoring session…"/></Screen>;
 if(state==='error')return <Screen title="Starvega PG"><ErrorState onRetry={restore}/><Button title="Return to login" onPress={async()=>{await logout();setState('ready');}}/></Screen>;
 if(!user)return invite?<Invitation onBack={()=>setInvite(false)}/>:<Login onInvite={()=>setInvite(true)}/>;
 return <Screen title={user.role+' dashboard'} subtitle={user.name}><Button title="Sign out" onPress={logout}/></Screen>;
}
export default function App(){return <Provider store={store}><SafeAreaProvider><Root/></SafeAreaProvider></Provider>;}
