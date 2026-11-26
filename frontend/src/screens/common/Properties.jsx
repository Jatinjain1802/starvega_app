import React,{useState} from 'react';
import {Text,Alert} from 'react-native';
import {useSelector} from 'react-redux';
import {Screen,Card,Button,TextField,LoadingState,ErrorState,EmptyState} from '../../components';
import useProperties from '../../hooks/useProperties';
import {api} from '../../api/client';
export default function Properties({navigation}){
 const owner=useSelector(s=>s.auth.user.role)==='OWNER';
 const {items,state,reload}=useProperties();
 const [form,setForm]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const edit=p=>{setError('');setForm(p?{...p}:{name:'',address:''});};
 async function save(){
  if(busy||!owner||!form)return;
  const name=form.name.trim(),address=form.address.trim();
  if(!name||name.length>120||!address||address.length>500){setError('Enter a valid property name and address.');return;}
  setBusy(true);setError('');
  try{if(form.id)await api.patch('/properties/'+form.id,{name,address});else await api.post('/properties',{name,address});setForm(null);reload();}catch{setError('Unable to save property. Refresh before retrying if the request timed out.');}finally{setBusy(false);}
 }
 return <Screen title="Properties" subtitle={owner?'Your PG properties':'Assigned PG properties'} onRefresh={reload} refreshing={state==='loading'}>
 {owner&&!form?<Button title="Add PG property" onPress={()=>edit(null)}/>:null}
 {owner&&form?<Card><Text>{form.id?'Edit property':'New property'}</Text><TextField label="PG name" value={form.name} maxLength={120} editable={!busy} onChangeText={name=>setForm(f=>({...f,name}))}/><TextField label="Address" value={form.address} maxLength={500} multiline editable={!busy} onChangeText={address=>setForm(f=>({...f,address}))}/>{error?<Text>{error}</Text>:null}<Button title="Save property" loading={busy} onPress={save}/><Button title="Cancel" variant="secondary" disabled={busy} onPress={()=>setForm(null)}/></Card>:null}
 {state==='loading'?<LoadingState/>:state==='error'?<ErrorState onRetry={reload}/>:!items.length?<EmptyState title="No properties available"/>:items.map(p=><Card key={p.id}><Text style={{fontSize:18,fontWeight:'700'}}>{p.name}</Text><Text>{p.address}</Text><Button title="View rooms and beds" onPress={()=>navigation.navigate('Rooms',{propertyId:p.id})}/>{owner?<Button title="Edit property" variant="secondary" disabled={busy} onPress={()=>edit(p)}/>:null}</Card>)}
 </Screen>;
}
