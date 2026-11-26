import React,{useState} from 'react';
import {Text,StyleSheet} from 'react-native';
import {Screen,Card,TextField,Button} from '../../components';
import {colors} from '../../theme';
import {login} from '../../services/auth';
export default function Login({onInvite}){
 const [phone,setPhone]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(){
  if(busy)return;
  if(!/^[6-9]\d{9}$/.test(phone)||!password){setError('Enter a valid mobile number and password.');return;}
  setBusy(true);setError('');
  try{await login('+91'+phone,password);}catch(e){setError(e.response?.status===401?'Incorrect mobile number or password.':'Unable to sign in. Please try again.');}finally{setBusy(false);}
 }
 return <Screen title="Starvega PG" subtitle="Sign in to your account"><Card><TextField label="Mobile number (+91)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} editable={!busy}/><TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry editable={!busy} autoCapitalize="none"/>{error?<Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>:null}<Button title="Sign in" loading={busy} onPress={submit}/><Button title="Accept invitation" variant="secondary" disabled={busy} onPress={onInvite}/></Card></Screen>;
}
const styles=StyleSheet.create({error:{color:colors.danger}});
