import React,{useState} from 'react';
import {Text} from 'react-native';
import {Screen,Card,TextField,Button} from '../../components';
import {acceptInvitation} from '../../services/auth';
import {colors} from '../../theme';
export default function Invitation({onBack}){
 const [form,setForm]=useState({name:'',phone:'',token:'',password:''}),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const field=k=>({value:form[k],onChangeText:v=>setForm(old=>({...old,[k]:v})),editable:!busy});
 async function submit(){
  if(busy)return;
  if(!form.name.trim()||!/^[6-9]\d{9}$/.test(form.phone)||!/^[a-f0-9]{64}$/.test(form.token.trim())||form.password.length<12){setMessage('Check your details and use a password of at least 12 characters.');return;}
  setBusy(true);setMessage('');
  try{await acceptInvitation({...form,name:form.name.trim(),phone:'+91'+form.phone,token:form.token.trim()});onBack();}catch{setMessage('Unable to accept invitation. Check the code or contact your PG staff.');}finally{setBusy(false);}
 }
 return <Screen title="Accept invitation"><Card><TextField label="Full name" {...field('name')}/><TextField label="Mobile number (+91)" {...field('phone')} keyboardType="phone-pad" maxLength={10}/><TextField label="Invitation code" {...field('token')} autoCapitalize="none" autoCorrect={false}/><TextField label="Create password" {...field('password')} secureTextEntry/>{message?<Text style={{color:colors.danger}}>{message}</Text>:null}<Button title="Create account" loading={busy} onPress={submit}/><Button title="Back to login" variant="secondary" disabled={busy} onPress={onBack}/></Card></Screen>;
}
