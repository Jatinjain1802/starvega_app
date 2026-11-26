import React,{useEffect,useState} from 'react';
import {Text,View,Pressable,StyleSheet} from 'react-native';
import {Screen,Card,Button,TextField,StatCard,LoadingState,ErrorState,EmptyState,StatusPill} from '../../components';
import useProperties from '../../hooks/useProperties';
import {api} from '../../api/client';
import {colors,spacing} from '../../theme';
export default function Rooms({route}){
 const props=useProperties(route.params?.propertyId);
 const {items,selected,setSelected,state}=props;
 const [data,setData]=useState(null),[status,setStatus]=useState('loading'),[revision,setRevision]=useState(0),[form,setForm]=useState(false),[label,setLabel]=useState(''),[capacity,setCapacity]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[filter,setFilter]=useState('ALL');
 useEffect(()=>{
  if(!selected)return;
  const c=new AbortController();setData(null);setStatus('loading');
  api.get('/properties/'+selected+'/rooms',{signal:c.signal}).then(({data})=>{if(!c.signal.aborted){setData({id:selected,...data});setStatus('ready');}}).catch(()=>{if(!c.signal.aborted)setStatus('error');});
  return ()=>c.abort();
 },[selected,revision]);
 const reload=()=>{props.reload();setRevision(n=>n+1);};
 async function save(){
  if(busy||!selected)return;
  const n=Number(capacity);
  if(!label.trim()||label.trim().length>80||!/^\d+$/.test(capacity)||!Number.isInteger(n)||n<1||n>20){setError('Enter a room label and capacity from 1 to 20.');return;}
  setBusy(true);setError('');
  try{await api.post('/properties/'+selected+'/rooms',{label:label.trim(),capacity:n});setForm(false);setLabel('');setCapacity('');setRevision(x=>x+1);}catch(e){setError(e.response?.status===409?'This room label already exists.':'Unable to create room. Refresh before retrying.');}finally{setBusy(false);}
 }
 const d=data?.id===selected?data:null;
 const rooms=d?.items.filter(r=>filter==='ALL'||(filter==='VACANT'?r.beds.every(b=>!b.occupied):filter==='AVAILABLE'?r.beds.some(b=>!b.occupied):r.beds.some(b=>b.occupied)))||[];
 return <Screen title="Rooms and beds" onRefresh={reload} refreshing={state==='loading'||(!!selected&&status==='loading')}>
 {state==='loading'?<LoadingState/>:state==='error'?<ErrorState onRetry={reload}/>:!items.length?<EmptyState title="No properties available"/>:<>
 <Card><Text style={styles.heading}>Select PG</Text>{items.map(p=><Pressable key={p.id} disabled={busy} accessibilityRole="button" accessibilityState={{selected:p.id===selected,disabled:busy}} onPress={()=>{setSelected(p.id);setForm(false);setError('');setLabel('');setCapacity('');}} style={[styles.option,p.id===selected&&styles.selected]}><Text>{p.name}</Text></Pressable>)}</Card>
 {selected?<Button title="Create room" disabled={busy} onPress={()=>{setForm(true);setError('');}}/>:null}
 {form?<Card><TextField label="Room label" value={label} maxLength={80} editable={!busy} onChangeText={setLabel}/><TextField label="Number of beds (1–20)" value={capacity} keyboardType="number-pad" maxLength={2} editable={!busy} onChangeText={setCapacity}/>{error?<Text style={{color:colors.danger}}>{error}</Text>:null}<Button title="Create room and beds" loading={busy} onPress={save}/><Button title="Cancel" variant="secondary" disabled={busy} onPress={()=>setForm(false)}/></Card>:null}
 {status==='error'?<ErrorState onRetry={reload}/>:!d?<LoadingState/>:<><View style={styles.grid}>{Object.entries({ 'Total rooms':d.occupancy.totalRooms,'Occupied rooms':d.occupancy.occupiedRooms,'Vacant rooms':d.occupancy.vacantRooms,'Total beds':d.occupancy.totalBeds,'Occupied beds':d.occupancy.occupiedBeds,'Vacant beds':d.occupancy.vacantBeds}).map(([label,value])=><StatCard key={label} label={label} value={String(value)} style={styles.stat}/>)}</View>
 <Card><Text style={styles.heading}>Filter rooms</Text>{[['ALL','All rooms'],['VACANT','Completely vacant'],['AVAILABLE','Has vacant beds'],['OCCUPIED','At least one occupied bed']].map(([key,title])=><Button key={key} title={title} variant={filter===key?'primary':'secondary'} onPress={()=>setFilter(key)}/>)}</Card>
 {!rooms.length?<EmptyState title="No matching rooms"/>:rooms.map(r=><Card key={r.id}><Text style={styles.heading}>Room {r.label}</Text><Text>{r.beds.filter(b=>b.occupied).length} / {r.beds.length} beds occupied</Text>{r.beds.map(b=><View key={b.id} style={styles.row}><Text>Bed {b.label}</Text><StatusPill status={b.occupied?'OCCUPIED':'VACANT'} tone={b.occupied?'warning':'success'}/></View>)}</Card>)}</>}
 </>}
 </Screen>;
}
const styles=StyleSheet.create({heading:{fontSize:17,fontWeight:'700',color:colors.text},option:{padding:spacing.sm,borderWidth:1,borderColor:colors.border,borderRadius:8},selected:{borderColor:colors.primary,backgroundColor:'#E4F4EA'},grid:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},stat:{width:'48%',flexGrow:1},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}});
