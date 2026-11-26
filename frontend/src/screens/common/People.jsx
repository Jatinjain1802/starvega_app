import React,{useEffect,useState} from 'react';
import {Text,Alert,Share} from 'react-native';
import {useSelector} from 'react-redux';
import {Screen,Card,Button,TextField,LoadingState,ErrorState,EmptyState} from '../../components';
import useProperties from '../../hooks/useProperties';
import {api} from '../../api/client';
export default function People({route}){
 const managers=route.name==='Managers',owner=useSelector(s=>s.auth.user.role)==='OWNER';
 const p=useProperties(route.params?.propertyId),id=p.selected;
 const [data,setData]=useState(null),[state,setState]=useState('loading'),[revision,setRevision]=useState(0),[mode,setMode]=useState(null),[phone,setPhone]=useState(''),[bed,setBed]=useState(null),[target,setTarget]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[invite,setInvite]=useState(null),[history,setHistory]=useState(null),[search,setSearch]=useState('');
 const base='/properties/'+id+'/people';
 const reload=()=>setRevision(n=>n+1);
 function reset(){setMode(null);setPhone('');setBed(null);setTarget(null);setError('');setInvite(null);setHistory(null);}
 useEffect(()=>{
  if(!id)return;
  const c=new AbortController();setData(null);setState('loading');
  (async()=>{const {data:people}=await api.get(base+(managers?'/managers':'/residents'),{signal:c.signal});let beds=[],candidates=[];
   if(!managers){const {data:rooms}=await api.get('/properties/'+id+'/rooms',{signal:c.signal});beds=rooms.items.flatMap(r=>r.beds.filter(b=>!b.occupied).map(b=>({...b,room:r.label})));}
   else if(owner){const others=await Promise.all(p.items.filter(x=>x.id!==id).map(x=>api.get('/properties/'+x.id+'/people/managers',{signal:c.signal})));candidates=[...new Map(others.flatMap(x=>x.data.items).map(m=>[m.id,m])).values()].filter(m=>!people.items.some(x=>x.id===m.id));}
   if(!c.signal.aborted){setData({id,items:people.items,beds,candidates});setState('ready');}
  })().catch(()=>{if(!c.signal.aborted)setState('error');});return()=>c.abort();
 },[id,revision,managers,owner,p.items]);
 async function mutate(fn){if(busy)return;setBusy(true);setError('');try{await fn();reload();}catch(e){setError(e.response?.data?.error==='BED_UNAVAILABLE'?'Bed is no longer available. Refresh and choose another.':'Unable to complete action. Refresh before retrying.');}finally{setBusy(false);}}
 function issue(){if(!/^[6-9]\d{9}$/.test(phone)||(!managers&&!bed)){setError('Enter a valid mobile number and select a vacant bed if required.');return;}mutate(async()=>{const {data}=await api.post(base+'/invitations',{phone:'+91'+phone,role:managers?'MANAGER':'RESIDENT',...(managers?{}:{bedId:bed})});setInvite(data);setMode(null);setPhone('');setBed(null);});}
 function confirm(title,message,fn){Alert.alert(title,message,[{text:'Cancel',style:'cancel'},{text:'Confirm',style:'destructive',onPress:()=>mutate(fn)}]);}
 async function showHistory(person){if(busy)return;setBusy(true);setError('');try{let cursor=null,items=[];do{const {data}=await api.get(base+'/residents/'+person.resident.id+'/allocations',{params:cursor?{cursor}:{}});items.push(...data.items);cursor=data.nextCursor;}while(cursor);setHistory({name:person.resident.name,items});}catch{setError('Unable to load allocation history.');}finally{setBusy(false);}}
 const d=data?.id===id?data:null;
 return <Screen title={managers?'Managers':'Residents'} onRefresh={()=>{p.reload();reload();}} refreshing={p.state==='loading'||(!!id&&state==='loading')}>
 {p.state==='loading'?<LoadingState/>:p.state==='error'?<ErrorState onRetry={p.reload}/>:!p.items.length?<EmptyState title="No properties available"/>:<>
 <Card><Text>Select PG</Text>{p.items.map(x=><Button key={x.id} title={x.name} variant={id===x.id?'primary':'secondary'} disabled={busy} onPress={()=>{reset();p.setSelected(x.id);}}/>)}</Card>
 {error?<Text accessibilityLiveRegion="polite">{error}</Text>:null}
 {state==='error'?<ErrorState onRetry={reload}/>:!d?<LoadingState/>:<>
 {(!managers||owner)?<Button title={managers?'Invite manager':'Invite resident'} disabled={busy} onPress={()=>{reset();setMode('invite');}}/>:null}
 {managers&&owner?<Button title="Assign existing manager" variant="secondary" disabled={busy} onPress={()=>{reset();setMode('assign');}}/>:null}
 {mode==='invite'?<Card><TextField label="Mobile number (+91)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} editable={!busy}/>{!managers?<><Text>Choose vacant bed</Text>{d.beds.length?d.beds.map(b=><Button key={b.id} title={'Room '+b.room+' · Bed '+b.label} variant={bed===b.id?'primary':'secondary'} disabled={busy} onPress={()=>setBed(b.id)}/>):<Text>No vacant beds.</Text>}</>:null}<Button title="Generate invitation" loading={busy} onPress={issue}/><Button title="Cancel" disabled={busy} variant="secondary" onPress={reset}/></Card>:null}
 {invite?<Card><Text>Invitation expires: {new Date(invite.invitation.expiresAt).toLocaleString()}</Text><Text selectable>{invite.token}</Text><Text>Share privately with the intended recipient. A bed is not reserved until acceptance.</Text><Button title="Share invitation code" onPress={()=>Share.share({message:'Starvega PG invitation code: '+invite.token}).catch(()=>Alert.alert('Unable to share','Use the displayed code.'))}/><Button title="Dismiss" variant="secondary" onPress={()=>setInvite(null)}/></Card>:null}
 {mode==='assign'?<Card><Text>Managers assigned to your other PGs</Text>{d.candidates.length?d.candidates.map(m=><Button key={m.id} title={m.name+' · '+m.phone} disabled={busy} onPress={()=>mutate(async()=>{await api.post(base+'/managers',{managerId:m.id});reset();})}/>):<Text>No eligible managers found.</Text>}<Button title="Cancel" disabled={busy} variant="secondary" onPress={reset}/></Card>:null}
 {mode==='transfer'&&target?<Card><Text>Transfer {target.resident.name}</Text>{d.beds.map(b=><Button key={b.id} title={'Room '+b.room+' · Bed '+b.label} variant={bed===b.id?'primary':'secondary'} disabled={busy} onPress={()=>setBed(b.id)}/>)}<Button title="Confirm transfer" disabled={!bed} loading={busy} onPress={()=>mutate(async()=>{await api.post(base+'/allocations/'+target.id+'/transfer',{bedId:bed});reset();})}/><Button title="Cancel" disabled={busy} variant="secondary" onPress={reset}/></Card>:null}
 {history?<Card><Text>Allocation history: {history.name}</Text>{history.items.map(h=><Text key={h.id}>Room {h.bed.room.label}, bed {h.bed.label} · {new Date(h.startedAt).toLocaleDateString()} – {h.endedAt?new Date(h.endedAt).toLocaleDateString():'Current'}</Text>)}<Button title="Close history" variant="secondary" onPress={()=>setHistory(null)}/></Card>:null}
 <TextField label="Search by name or phone" value={search} onChangeText={setSearch}/>
 {d.items.filter(x=>{const m=managers?x:x.resident;return (m.name+' '+m.phone).toLowerCase().includes(search.toLowerCase());}).map(x=>{const m=managers?x:x.resident;return <Card key={x.id}><Text style={{fontSize:17,fontWeight:'700'}}>{m.name}</Text><Text>{m.phone}</Text>{managers?(owner?<Button title="Remove assignment" variant="secondary" disabled={busy} onPress={()=>confirm('Remove manager?','This removes access to this PG only.',()=>api.delete(base+'/managers/'+m.id))}/>:null):<><Text>Room {x.bed.room.label} · Bed {x.bed.label}</Text><Button title="Transfer room or bed" variant="secondary" disabled={busy} onPress={()=>{reset();setTarget(x);setMode('transfer');}}/><Button title="Allocation history" variant="secondary" disabled={busy} onPress={()=>showHistory(x)}/><Button title="Checkout" variant="secondary" disabled={busy} onPress={()=>confirm('Checkout resident?','This ends the current allocation. Rent and deposit settlement are separate.',()=>api.post(base+'/allocations/'+x.id+'/checkout'))}/></>}</Card>;})}
 {!d.items.length?<EmptyState title={managers?'No assigned managers':'No active residents'}/>:null}
 </>}
 </>}
 </Screen>;
}
