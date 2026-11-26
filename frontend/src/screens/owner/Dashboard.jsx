import React,{useCallback,useEffect,useState} from 'react';
import {View,Text,Pressable,StyleSheet} from 'react-native';
import {Screen,Card,StatCard,Button,LoadingState,ErrorState,EmptyState} from '../../components';
import {api} from '../../api/client';
import {colors,spacing} from '../../theme';
const money=n=>'₹'+(Number(n||0)/100).toLocaleString('en-IN',{maximumFractionDigits:2});
const percent=n=>n==null?'—':n+'%';
const currentMonth=()=>{const d=new Date(Date.now()+19800000);return d.toISOString().slice(0,7);};
function shift(month,delta){const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m-1+delta,1)).toISOString().slice(0,7);}
export default function OwnerDashboard({navigation}){
 const [month,setMonth]=useState(currentMonth),[property,setProperty]=useState(null),[data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(false),[revision,setRevision]=useState(0);
 const reload=useCallback(()=>setRevision(n=>n+1),[]);
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError(false);
  api.get('/owner/finance',{params:{month},signal:controller.signal}).then(({data:d})=>{if(!controller.signal.aborted){setData(d);setProperty(p=>d.properties.some(x=>x.id===p)?p:null);}}).catch(()=>{if(!controller.signal.aborted){setError(true);setData(null);}}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return ()=>controller.abort();
 },[month,revision]);
 const summary=property?data?.properties.find(p=>p.id===property):data?.totals;
 return <Screen title="Owner dashboard" subtitle="Your PG portfolio" refreshing={loading} onRefresh={reload} action={<Button title="Updates" variant="secondary" onPress={()=>navigation.navigate('Notifications')}/>}>
 <Card><View style={styles.row}><Button title="Previous" variant="secondary" disabled={month==='2000-01'} onPress={()=>setMonth(m=>shift(m,-1))}/><Text style={styles.heading}>{month}</Text><Button title="Next" variant="secondary" disabled={month>=currentMonth()} onPress={()=>setMonth(m=>shift(m,1))}/></View></Card>
 {loading?<LoadingState/>:error?<ErrorState onRetry={reload}/>:!data?.properties.length?<EmptyState title="No properties yet" actionLabel="Manage properties" onAction={()=>navigation.navigate('Properties')}/>:<>
 <Card><Text style={styles.heading}>Select property</Text>{[{id:null,name:'All properties'},...data.properties].map(p=><Pressable key={p.id||'all'} accessibilityRole="button" accessibilityState={{selected:property===p.id}} onPress={()=>setProperty(p.id)} style={[styles.option,property===p.id&&styles.selected]}><Text style={styles.label}>{p.name}</Text>{p.address?<Text style={styles.muted}>{p.address}</Text>:null}</Pressable>)}</Card>
 {summary?<><Text style={styles.heading}>Monthly financial overview</Text><View style={styles.grid}>{[['Rent received',money(summary.collectedPaise)],['Expenses',money(summary.expensePaise)],['Receipts less recorded expenses',money(summary.netCashPaise)],['Outstanding rent',money(summary.outstandingPaise)],['Rent billed',money(summary.billedPaise)],['Collection rate',percent(summary.collectionPercent)],['Maintenance',money(summary.maintenancePaise)]].map(([label,value])=><StatCard key={label} label={label} value={value} style={styles.stat}/>)}</View>
 <Text style={styles.heading}>Current occupancy</Text><View style={styles.grid}>{[['Total rooms',summary.rooms],['Occupied rooms',summary.occupiedRooms],['Vacant rooms',summary.rooms-summary.occupiedRooms],['Occupied beds',summary.occupiedBeds],['Vacant beds',summary.beds-summary.occupiedBeds],['Bed occupancy',percent(summary.occupancyPercent)]].map(([label,value])=><StatCard key={label} label={label} value={String(value)} style={styles.stat}/>)}</View></>:null}
 <Text style={styles.heading}>Property comparison</Text>{data.properties.map(p=><Card key={p.id}><Text style={styles.heading}>{p.name}</Text><Text style={styles.muted}>{p.address}</Text><Text style={styles.label}>Received: {money(p.collectedPaise)}</Text><Text style={styles.label}>Expenses: {money(p.expensePaise)}</Text><Text style={styles.label}>Outstanding: {money(p.outstandingPaise)}</Text><Text style={styles.label}>Occupancy: {percent(p.occupancyPercent)}</Text></Card>)}
 </>}
 <Text style={styles.heading}>Quick access</Text>{['Properties','Finance','Complaints','Reports','Rooms','Residents','Rent','Managers','Maintenance','Announcements','ExpenseDetails'].map(name=><Button key={name} title={name} variant="secondary" onPress={()=>navigation.navigate(name,property?{propertyId:property}:undefined)}/>)}
 </Screen>;
}
const styles=StyleSheet.create({row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.sm},heading:{fontSize:17,fontWeight:'700',color:colors.text},label:{color:colors.text,fontSize:14},muted:{color:colors.muted,fontSize:13},option:{padding:spacing.sm,borderRadius:8,borderWidth:1,borderColor:colors.border},selected:{borderColor:colors.primary,backgroundColor:'#E4F4EA'},grid:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},stat:{width:'48%',flexGrow:1}});
