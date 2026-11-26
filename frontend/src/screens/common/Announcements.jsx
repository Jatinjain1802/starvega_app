import React,{useEffect,useState} from 'react';
import {Text,Switch,Alert} from 'react-native';
import {useSelector} from 'react-redux';
import {Screen,Card,Button,TextField,StatusPill,LoadingState,ErrorState,EmptyState} from '../../components';
import useProperties from '../../hooks/useProperties';
import {api} from '../../api/client';
import {colors} from '../../theme';
const categories=['GENERAL','FOOD','ELECTRICITY','WATER','MAINTENANCE','EMERGENCY'];
const blank=()=>({title:'',body:'',category:'GENERAL',pinned:false,publishAt:'',expiresAt:''});
const toIST=s=>s?new Date(Date.parse(s)+19800000).toISOString().slice(0,16).replace('T',' '):'';
function parseIST(s){
 if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s))return null;
 const n=Date.parse(s.replace(' ','T')+':00+05:30');
 return Number.isFinite(n)&&toIST(n===0?new Date(0).toISOString():new Date(n).toISOString())===s?new Date(n).toISOString():null;
}
function status(a){const now=Date.now();return a.archivedAt?'ARCHIVED':Date.parse(a.publishAt)>now?'SCHEDULED':a.expiresAt&&Date.parse(a.expiresAt)<=now?'EXPIRED':'PUBLISHED';}
export default function Announcements({route}){
 const resident=useSelector(s=>s.auth.user.role)==='RESIDENT',p=useProperties(route.params?.propertyId),id=p.selected,base='/properties/'+id+'/announcements';
 const [data,setData]=useState(null),[state,setState]=useState('loading'),[rev,setRev]=useState(0),[form,setForm]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[filter,setFilter]=useState('ALL');
 const reload=()=>setRev(n=>n+1);
 useEffect(()=>{if(!id)return;const c=new AbortController();setData(null);setState('loading');api.get(base,{signal:c.signal}).then(({data})=>{if(!c.signal.aborted){setData({id,items:data.items});setState('ready');}}).catch(()=>{if(!c.signal.aborted)setState('error');});return()=>c.abort();},[id,rev]);
 async function run(fn){if(busy)return;setBusy(true);setError('');try{await fn();reload();}catch{setError('Unable to complete request. Refresh before retrying.');}finally{setBusy(false);}}
 const change=(k,v)=>setForm(f=>({...f,[k]:v}));
 function save(){if(resident||!form||form.propertyId!==id)return;const start=form.publishAt?parseIST(form.publishAt):null,end=form.expiresAt?parseIST(form.expiresAt):null;if(!form.title.trim()||!form.body.trim()||(form.publishAt&&!start)||(form.expiresAt&&!end)||(end&&Date.parse(end)<=(start?Date.parse(start):Date.now()))){setError('Enter a title, message and valid IST dates. Expiry must follow publishing.');return;}const payload={title:form.title,body:form.body,category:form.category,pinned:form.pinned,...(start?{publishAt:start}:{}),expiresAt:end};run(async()=>{if(form.id)await api.put(base+'/'+form.id,payload);else await api.post(base,payload);setForm(null);});}
 const rows=data?.id===id?data.items:[],visible=rows.filter(a=>(!resident||status(a)==='PUBLISHED')&&(filter==='ALL'||(filter==='UNREAD'?!a.readAt:filter==='ARCHIVED'?!!a.archivedAt:a.category===filter)));
 return <Screen title={resident?'PG updates':'Announcements'} refreshing={p.state==='loading'||(!!id&&state==='loading')} onRefresh={()=>{p.reload();reload();}}>
 {error?<Text style={{color:colors.danger}} accessibilityLiveRegion="polite">{error}</Text>:null}
 {p.state==='loading'?<LoadingState/>:p.state==='error'?<ErrorState onRetry={p.reload}/>:!p.items.length?<EmptyState title="No accessible PG"/>:<>
 <Card><Text>Select PG</Text>{p.items.map(x=><Button key={x.id} title={x.name} variant={id===x.id?'primary':'secondary'} disabled={busy||!!form} onPress={()=>{p.setSelected(x.id);setError('');}}/>)}</Card>
 {!resident&&!form?<Button title="Create announcement" disabled={busy} onPress={()=>setForm({...blank(),propertyId:id})}/>:null}
 {!resident&&form?.propertyId===id?<Card><Text>{form.id?'Edit announcement':'New announcement'}</Text><TextField label="Title" value={form.title} maxLength={120} editable={!busy} onChangeText={v=>change('title',v)}/><TextField label="Message" value={form.body} maxLength={4000} multiline editable={!busy} onChangeText={v=>change('body',v)}/><Text>Category</Text>{categories.map(x=><Button key={x} title={x} disabled={busy} variant={form.category===x?'primary':'secondary'} onPress={()=>change('category',x)}/>)}<Text>Pin announcement</Text><Switch accessibilityLabel="Pin announcement" value={form.pinned} disabled={busy} onValueChange={v=>change('pinned',v)}/><TextField label="Publish at (IST, YYYY-MM-DD HH:mm; blank = now)" value={form.publishAt} editable={!busy} onChangeText={v=>change('publishAt',v)}/><TextField label="Expires at (IST, optional)" value={form.expiresAt} editable={!busy} onChangeText={v=>change('expiresAt',v)}/><Button title="Save announcement" loading={busy} onPress={save}/><Button title="Cancel" variant="secondary" disabled={busy} onPress={()=>setForm(null)}/></Card>:null}
 <Card><Text>Filter announcements</Text>{['ALL',...categories,resident?'UNREAD':'ARCHIVED'].map(x=><Button key={x} title={x} variant={filter===x?'primary':'secondary'} onPress={()=>setFilter(x)}/>)}</Card>
 {state==='error'?<ErrorState onRetry={reload}/>:data?.id!==id?<LoadingState/>:!visible.length?<EmptyState title="No matching announcements"/>:visible.map(a=><Card key={a.id}>{a.category==='EMERGENCY'?<StatusPill status="URGENT"/>:null}{a.pinned?<Text style={{color:colors.primary}}>Pinned notice</Text>:null}<Text style={{fontSize:18,fontWeight:'700'}}>{a.title}</Text><Text>{a.category} · {toIST(a.publishAt)} IST</Text><Text>{a.body}</Text>{a.expiresAt?<Text>Expires: {toIST(a.expiresAt)} IST</Text>:null}{resident?<>{a.readAt?<Text>Read</Text>:<Button title="Mark as read" disabled={busy} variant="secondary" onPress={()=>run(()=>api.put(base+'/'+a.id+'/read'))}/>}</>:<><StatusPill status={status(a)}/><Text>Published by: {a.author?.name||'PG staff'} · {a._count?.reads??0} reads</Text>{!a.archivedAt?<><Button title="Edit announcement" disabled={busy||!!form} variant="secondary" onPress={()=>setForm({propertyId:id,id:a.id,title:a.title,body:a.body,category:a.category,pinned:a.pinned,publishAt:toIST(a.publishAt),expiresAt:toIST(a.expiresAt)})}/><Button title="Archive announcement" disabled={busy||!!form} variant="secondary" onPress={()=>Alert.alert('Archive announcement?','Residents will no longer see this notice.',[{text:'Cancel',style:'cancel'},{text:'Archive',style:'destructive',onPress:()=>run(()=>api.delete(base+'/'+a.id))}])}/></>:null}</>}</Card>)}
 </>}
 </Screen>;
}
