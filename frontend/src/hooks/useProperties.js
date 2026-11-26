import {useEffect,useState} from 'react';
import {api} from '../api/client';
export default function useProperties(preferredId){
 const [items,setItems]=useState([]),[selected,setSelected]=useState(null),[state,setState]=useState('loading'),[revision,setRevision]=useState(0);
 useEffect(()=>{
  const c=new AbortController();setState('loading');
  (async()=>{let cursor=null,rows=[];do{const {data}=await api.get('/properties',{params:cursor?{cursor}:{},signal:c.signal});rows.push(...data.items);cursor=data.nextCursor;}while(cursor&&!c.signal.aborted);
  if(!c.signal.aborted){setItems(rows);setSelected(old=>rows.some(p=>p.id===preferredId)?preferredId:rows.some(p=>p.id===old)?old:rows[0]?.id??null);setState('ready');}})().catch(()=>{if(!c.signal.aborted)setState('error');});
  return ()=>c.abort();
 },[preferredId,revision]);
 return {items,selected,setSelected,state,reload:()=>setRevision(n=>n+1)};
}
