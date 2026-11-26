import React,{useCallback,useState} from 'react';
import {Text,Share} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Screen,Card,Button,StatCard,LoadingState,ErrorState,EmptyState} from '../../components';
import useProperties from '../../hooks/useProperties';
import {api} from '../../api/client';
const now=()=>new Date(Date.now()+19800000).toISOString().slice(0,7);
const money=n=>'₹'+(n/100).toLocaleString('en-IN',{maximumFractionDigits:2});
const percent=n=>n==null?'N/A':n+'%';
const labels={rent:'Rent collection',expenses:'Expenses',occupancy:'Current occupancy',complaints:'Complaints'};
function Month({month,setMonth}){
 function shift(delta){const [y,m]=month.split('-').map(Number);setMonth(new Date(Date.UTC(y,m-1+delta,1)).toISOString().slice(0,7));}
 return <Card><Text>Reporting month: {month} (IST)</Text><Button title="Previous month" variant="secondary" disabled={month==='2000-01'} onPress={()=>shift(-1)}/><Button title="Next month" variant="secondary" disabled={month>=now()} onPress={()=>shift(1)}/></Card>;
}
function useReport(path,params){
 const [state,setState]=useState({key:null,status:'loading'}),[rev,setRev]=useState(0);
 const key=path?path+'?'+JSON.stringify(params):null;
 useFocusEffect(useCallback(()=>{if(!path)return;const c=new AbortController();setState({key,status:'loading'});api.get(path,{params,signal:c.signal}).then(({data})=>{if(!c.signal.aborted)setState({key,status:'ready',data});}).catch(e=>{if(!c.signal.aborted)setState({key,status:'error',large:e.response?.status===422});});return()=>c.abort();},[key,rev]));
 return {...(state.key===key?state:{status:'loading'}),reload:()=>setRev(n=>n+1)};
}
function FinanceCards({x}){
 return <><StatCard label="Rent received during month" value={money(x.collectedPaise)}/><StatCard label="Recorded expenses" value={money(x.expensePaise)}/><StatCard label="Receipts less recorded expenses" value={money(x.netCashPaise)}/><StatCard label="Rent billed for month" value={money(x.billedPaise)}/><StatCard label="Outstanding on month's dues" value={money(x.outstandingPaise)}/><StatCard label="Collection against month's dues" value={percent(x.collectionPercent)}/><StatCard label="Current bed occupancy" value={percent(x.occupancyPercent)} detail={x.occupiedBeds+' / '+x.beds+' beds'}/><StatCard label="Maintenance expenses" value={money(x.maintenancePaise)}/></>;
}
export function Finance({navigation}){
 const [month,setMonth]=useState(now),[selected,setSelected]=useState(null);
 const q=useReport('/owner/finance',{month}),d=q.data;
 const current=d?.properties.find(x=>x.id===selected);
 const categories=new Map();for(const p of current?[current]:d?.properties||[])for(const e of p.expenseCategories)categories.set(e.category,(categories.get(e.category)||0)+e.totalPaise);
 return <Screen title="Finance and analytics" refreshing={q.status==='loading'} onRefresh={q.reload}><Month month={month} setMonth={setMonth}/>{q.status==='loading'?<LoadingState/>:q.status==='error'?<ErrorState onRetry={q.reload}/>:!d.properties.length?<EmptyState title="No properties yet"/>:<><Card><Text>Property scope</Text><Button title="All properties" variant={!current?'primary':'secondary'} onPress={()=>setSelected(null)}/>{d.properties.map(p=><Button key={p.id} title={p.name} variant={current?.id===p.id?'primary':'secondary'} onPress={()=>setSelected(p.id)}/>)}</Card><FinanceCards x={current||d.totals}/><Text>Occupancy is current, not historical. Payments against monthly dues include payments recorded after the selected month. Receipts less expenses is not accounting profit.</Text><Card><Text>Expense categories</Text>{[...categories].sort((a,b)=>b[1]-a[1]).map(([k,v])=><Text key={k}>{k}: {money(v)}</Text>)}{!categories.size?<Text>No recorded expenses.</Text>:null}</Card><Text>Property comparison</Text>{d.properties.map(p=><Card key={p.id}><Text style={{fontWeight:'700'}}>{p.name}</Text><Text>Received: {money(p.collectedPaise)}</Text><Text>Expenses: {money(p.expensePaise)}</Text><Text>Outstanding: {money(p.outstandingPaise)}</Text><Text>Collection: {percent(p.collectionPercent)} · Occupancy: {percent(p.occupancyPercent)}</Text><Button title="Detailed reports" variant="secondary" onPress={()=>navigation.navigate('Reports',{propertyId:p.id})}/></Card>)}</>}</Screen>;
}
export default function Reports({route}){
 const p=useProperties(route.params?.propertyId),[month,setMonth]=useState(now),[kind,setKind]=useState('rent'),[limit,setLimit]=useState(50),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const path=p.selected?'/properties/'+p.selected+'/reports/'+kind:null,q=useReport(path,{month}),d=q.data;
 async function share(){if(busy||!path)return;setBusy(true);setError('');try{const {data}=await api.get(path,{params:{month,format:'csv'},responseType:'text'});await Share.share({message:data,title:labels[kind]+' report'});}catch{setError('Unable to share CSV report.');}finally{setBusy(false);}}
 const format=(column,value)=>column.endsWith('Paise')?money(value):column==='date'?new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}):String(value??'');
 return <Screen title="Property reports" refreshing={p.state==='loading'||q.status==='loading'} onRefresh={()=>{p.reload();q.reload();}}>{error?<Text>{error}</Text>:null}{p.state==='loading'?<LoadingState/>:p.state==='error'?<ErrorState onRetry={p.reload}/>:!p.items.length?<EmptyState title="No accessible PG"/>:<><Card><Text>Select PG</Text>{p.items.map(x=><Button key={x.id} title={x.name} disabled={busy} variant={p.selected===x.id?'primary':'secondary'} onPress={()=>{p.setSelected(x.id);setLimit(50);}}/>)}</Card><Card>{Object.entries(labels).map(([k,v])=><Button key={k} title={v} disabled={busy} variant={kind===k?'primary':'secondary'} onPress={()=>{setKind(k);setLimit(50);}}/>)}</Card>{kind!=='occupancy'?<Month month={month} setMonth={setMonth}/>:<Text>Current occupancy snapshot, not historical occupancy.</Text>}{q.status==='loading'?<LoadingState/>:q.status==='error'?<ErrorState message={q.large?'Report exceeds the server limit of 10,000 rows.':'Unable to load report.'} onRetry={q.reload}/>:<><Card><Text>{labels[kind]} · {d.rows.length} records</Text><Text>As of {new Date(d.asOf).toLocaleString()}</Text><Button title="Share CSV text" loading={busy} disabled={!d.rows.length} onPress={share}/><Text>CSV monetary values are in paise. Sharing sends text, not a downloadable file.</Text></Card>{!d.rows.length?<EmptyState title="No report records"/>:d.rows.slice(0,limit).map((row,i)=><Card key={i}>{d.columns.map((c,j)=><Text key={c}>{c.replace(/Paise$/,'').replace(/([a-z])([A-Z])/g,'$1 $2')}: {format(c,row[j])}</Text>)}</Card>)}{d.rows.length>limit?<Button title="Show more records" variant="secondary" onPress={()=>setLimit(n=>n+50)}/>:null}</>}</>}</Screen>;
}
