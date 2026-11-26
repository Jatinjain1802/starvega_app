import React,{useEffect,useState} from 'react';
import {View,Text,Pressable,StyleSheet} from 'react-native';
import {Screen,Card,StatCard,Button,LoadingState,ErrorState,EmptyState,StatusPill} from '../../components';
import {api} from '../../api/client';
import {colors,spacing} from '../../theme';
const money=n=>'₹'+(n/100).toLocaleString('en-IN',{maximumFractionDigits:2});
export default function ManagerDashboard({navigation}){
 const [properties,setProperties]=useState([]),[selected,setSelected]=useState(null),[revision,setRevision]=useState(0),[listState,setListState]=useState('loading'),[detail,setDetail]=useState(null),[detailState,setDetailState]=useState('loading');
 const reload=()=>setRevision(n=>n+1);
 useEffect(()=>{
  const c=new AbortController();setListState('loading');
  (async()=>{let cursor=null,items=[];do{const {data}=await api.get('/properties',{params:cursor?{cursor}:{},signal:c.signal});items.push(...data.items);cursor=data.nextCursor;}while(cursor&&!c.signal.aborted);
  if(!c.signal.aborted){setProperties(items);setSelected(old=>items.some(p=>p.id===old)?old:items[0]?.id??null);setListState('ready');}})().catch(()=>{if(!c.signal.aborted)setListState('error');});
  return ()=>c.abort();
 },[revision]);
 useEffect(()=>{
  if(!selected)return;
  const c=new AbortController();setDetail(null);setDetailState('loading');
  const base='/properties/'+selected;
  Promise.all(['/rooms','/people/residents','/rent','/complaints'].map(path=>api.get(base+path,{signal:c.signal}))).then(([rooms,residents,rent,complaints])=>{if(!c.signal.aborted){setDetail({id:selected,rooms:rooms.data.occupancy,residents:residents.data.items,rent:rent.data,complaints:complaints.data.items});setDetailState('ready');}}).catch(()=>{if(!c.signal.aborted)setDetailState('error');});
  return ()=>c.abort();
 },[selected,revision]);
 const d=detail?.id===selected?detail:null;
 const go=(name,params={})=>navigation.navigate(name,{propertyId:selected,...params});
 return <Screen title="Manager dashboard" subtitle="Daily PG operations" refreshing={listState==='loading'||(!!selected&&detailState==='loading')} onRefresh={reload} action={<Button title="Updates" variant="secondary" onPress={()=>navigation.navigate('Notifications')}/>}>
 {listState==='loading'?<LoadingState/>:listState==='error'?<ErrorState onRetry={reload}/>:!properties.length?<EmptyState title="No assigned properties" message="Contact your owner to get a PG assignment."/>:<>
 <Card><Text style={styles.heading}>Assigned properties</Text>{properties.map(p=><Pressable key={p.id} accessibilityRole="button" accessibilityState={{selected:selected===p.id}} onPress={()=>setSelected(p.id)} style={[styles.option,selected===p.id&&styles.selected]}><Text style={styles.heading}>{p.name}</Text><Text style={styles.muted}>{p.address}</Text></Pressable>)}</Card>
 {detailState==='error'?<ErrorState onRetry={reload}/>:!d||detailState==='loading'?<LoadingState/>:<>
 <Text style={styles.heading}>Current occupancy</Text><View style={styles.grid}>{[['Residents',d.residents.length],['Total rooms',d.rooms.totalRooms],['Occupied rooms',d.rooms.occupiedRooms],['Vacant rooms',d.rooms.vacantRooms],['Occupied beds',d.rooms.occupiedBeds],['Vacant beds',d.rooms.vacantBeds]].map(([label,value])=><StatCard key={label} label={label} value={String(value)} style={styles.stat}/>)}</View>
 <Text style={styles.heading}>Rent collection · {d.rent.month}</Text><View style={styles.grid}>{[['Pending rent',money(d.rent.summary.outstandingPaise)],['Overdue rent',money(d.rent.summary.overduePaise)],['Residents with dues',String(d.rent.items.filter(x=>x.outstandingPaise>0).length)]].map(([label,value])=><StatCard key={label} label={label} value={value} style={styles.stat}/>)}</View>
 {d.rent.items.filter(x=>x.outstandingPaise>0).slice(0,5).map(x=><Card key={x.id}><Text style={styles.heading}>{x.resident.name}</Text><Text style={styles.muted}>Pending: {money(x.outstandingPaise)}</Text><StatusPill status={x.status}/></Card>)}
 <Button title="View rent collection" variant="secondary" onPress={()=>go('Rent')}/>
 <Text style={styles.heading}>Urgent safety complaints</Text>{d.complaints.filter(x=>x.safety&&x.status!=='RESOLVED').length===0?<Text style={styles.muted}>No unresolved safety complaints in the returned list.</Text>:d.complaints.filter(x=>x.safety&&x.status!=='RESOLVED').slice(0,5).map(x=><Card key={x.id}><StatusPill status="URGENT"/><Text style={styles.heading}>{x.title}</Text><StatusPill status={x.status}/></Card>)}
 <Button title="View complaints" variant="secondary" onPress={()=>go('Complaints')}/>
 </>}
 <Text style={styles.heading}>Quick access</Text>{[['Rooms','Manage rooms'],['Residents','Manage residents'],['Expenses','Expenses and receipts'],['Announcements','Announcements'],['Maintenance','Maintenance'],['Reports','Reports']].map(([route,label])=><Button key={route} title={label} variant="secondary" onPress={()=>go(route)}/>)}
 </>}
 </Screen>;
}
const styles=StyleSheet.create({heading:{fontSize:17,fontWeight:'700',color:colors.text},muted:{fontSize:13,color:colors.muted},option:{padding:spacing.sm,borderRadius:8,borderWidth:1,borderColor:colors.border},selected:{borderColor:colors.primary,backgroundColor:'#E4F4EA'},grid:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},stat:{width:'48%',flexGrow:1}});
