import React,{useEffect,useState} from 'react';
import {View,Text,Linking,Alert,StyleSheet} from 'react-native';
import {Screen,Card,StatCard,Button,LoadingState,ErrorState,EmptyState} from '../../components';
import {api} from '../../api/client';
import {colors,spacing} from '../../theme';
const money=n=>'₹'+(n/100).toLocaleString('en-IN',{maximumFractionDigits:2});
async function openContact(phone,whatsapp){
 if(!/^\+91[6-9]\d{9}$/.test(phone)){Alert.alert('Contact unavailable','Ask your PG staff for an updated number.');return;}
 try{await Linking.openURL(whatsapp?'https://wa.me/'+phone.slice(1):'tel:'+phone);}catch{Alert.alert('Unable to open contact','You can use the displayed phone number instead.');}
}
export default function ResidentDashboard({navigation}){
 const [data,setData]=useState(null),[state,setState]=useState('loading'),[revision,setRevision]=useState(0);
 const reload=()=>setRevision(n=>n+1);
 useEffect(()=>{
  const c=new AbortController();setState('loading');
  api.get('/resident/dashboard',{signal:c.signal}).then(({data})=>{if(!c.signal.aborted){setData(data);setState('ready');}}).catch(()=>{if(!c.signal.aborted){setData(null);setState('error');}});
  return ()=>c.abort();
 },[revision]);
 const bed=data?.allocation?.bed,property=bed?.room?.property;
 const go=name=>navigation.navigate(name,property?{propertyId:property.id}:undefined);
 return <Screen title={data?'Hello, '+data.resident.name:'Resident home'} subtitle="Your PG at a glance" refreshing={state==='loading'} onRefresh={reload} action={<Button title="Notifications" variant="secondary" onPress={()=>go('Notifications')}/>}>
 {state==='loading'?<LoadingState/>:state==='error'?<ErrorState onRetry={reload}/>:data?<>
 <StatCard label="Total outstanding rent" value={money(data.outstandingPaise)} tone={data.outstandingPaise>0?'danger':'positive'}/>
 <Button title={data.outstandingPaise>0?'View and pay rent':'View rent details'} onPress={()=>go('Rent')}/>
 <Button title="Payment history" variant="secondary" onPress={()=>go('PaymentHistory')}/>
 {property?<><Card><Text style={styles.heading}>Your accommodation</Text><Text style={styles.heading}>{property.name}</Text><Text style={styles.muted}>{property.address}</Text><View style={styles.row}><Text style={styles.label}>Room: {bed.room.label}</Text><Text style={styles.label}>Bed: {bed.label}</Text></View></Card>
 <Text style={styles.heading}>Contact your manager</Text>{property.managers.length?property.managers.map(({manager:m})=><Card key={m.id}><Text style={styles.heading}>{m.name}</Text><Text selectable style={styles.label}>{m.phone}</Text><View style={styles.row}><View style={styles.flex}><Button title="Call" onPress={()=>openContact(m.phone,false)}/></View><View style={styles.flex}><Button title="WhatsApp" variant="secondary" onPress={()=>openContact(m.phone,true)}/></View></View></Card>):<EmptyState title="No manager assigned" message="Contact your PG owner for assistance."/>}
 <Text style={styles.heading}>PG services</Text><Button title="Complaints" variant="secondary" onPress={()=>go('Complaints')}/><Button title="PG announcements" variant="secondary" onPress={()=>go('Updates')}/></>:<EmptyState title="No active room allocation" message="Contact your PG staff to confirm your accommodation."/>}
 </>:null}
 </Screen>;
}
const styles=StyleSheet.create({heading:{fontSize:17,fontWeight:'700',color:colors.text},label:{fontSize:15,color:colors.text},muted:{fontSize:14,color:colors.muted},row:{flexDirection:'row',gap:spacing.sm,alignItems:'center',justifyContent:'space-between'},flex:{flex:1}});
