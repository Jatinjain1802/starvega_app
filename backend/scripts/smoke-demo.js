import 'dotenv/config';
import assert from 'node:assert/strict';
if(process.env.NODE_ENV!=='development'||process.env.ALLOW_DEMO_SEED!=='yes')throw Error('Development demo opt-in required');
const password=process.env.DEMO_PASSWORD;
if(!password)throw Error('DEMO_PASSWORD required');
const port=Number(process.env.PORT||3000);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
const base='http://127.0.0.1:'+port+'/api/v1';
const sessions=[];
let passed=0;
async function request(path,{token,method='GET',body,expected=[200]}={}){
 const res=await fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000),redirect:'error'});
 assert.ok(expected.includes(res.status),method+' '+path+': expected '+expected.join('/')+', got '+res.status);
 const data=res.status===204?null:await res.json();
 passed++;console.log('PASS',method,path,res.status);return data;
}
async function login(n,role){
 const data=await request('/auth/login',{method:'POST',body:{phone:'+91900000'+String(n).padStart(4,'0'),password}});
 sessions.push(data.refreshToken);
 assert.equal(data.user.role,role);
 assert.ok(data.accessToken);
 return data.accessToken;
}
const month=new Date(Date.now()+19800000).toISOString().slice(0,7);
try{
 assert.equal((await request('/health')).status,'ok');
 assert.equal((await request('/ready')).status,'ready');
 await request('/properties',{expected:[401]});
 const owner=await login(1,'OWNER'),manager=await login(2,'MANAGER'),resident=await login(10,'RESIDENT'),other=await login(3,'MANAGER');
 for(const [token,role] of [[owner,'OWNER'],[manager,'MANAGER'],[resident,'RESIDENT'],[other,'MANAGER']])assert.equal((await request('/auth/me',{token})).user.role,role);
 const properties=(await request('/properties',{token:owner})).items;
 assert.equal(properties.length,3);
 const assigned=(await request('/properties',{token:manager})).items;
 const unrelated=(await request('/properties',{token:other})).items;
 assert.equal(assigned.length,2);assert.equal(unrelated.length,1);
 assert.ok(!assigned.some(p=>p.id===unrelated[0].id));
 const own=(await request('/properties',{token:resident})).items;assert.equal(own.length,1);
 const id=own[0].id,foreign=unrelated[0].id;
 assert.ok(assigned.some(p=>p.id===id));
 await request('/properties/'+foreign,{token:manager,expected:[404]});
 await request('/properties/'+foreign+'/expenses',{token:manager,expected:[403,404]});
 await request('/properties/'+foreign+'/reports/rent?month='+month,{token:manager,expected:[403,404]});
 await request('/owner/finance?month='+month,{token:manager,expected:[403]});
 await request('/owner/finance?month='+month,{token:resident,expected:[403]});
 await request('/properties/'+id+'/expenses',{token:resident,expected:[403]});
 await request('/properties/'+id+'/expenses',{token:owner,method:'POST',body:{},expected:[403]});
 await request('/properties/'+id+'/rooms',{token:manager});
 await request('/properties/'+id+'/expenses',{token:owner});
 await request('/properties/'+id+'/reports/rent?month='+month,{token:manager});
 await request('/owner/finance?month='+month,{token:owner});
 await request('/resident/dashboard',{token:resident});
 await request('/resident/rent',{token:resident});
 await request('/notifications',{token:resident});
 console.log('Smoke checks passed:',passed);
}catch(e){console.error('Smoke check failed:',e.message);process.exitCode=1;}
finally{for(const refreshToken of sessions){try{await request('/auth/logout',{method:'POST',body:{refreshToken},expected:[204]});}catch(e){console.error('Session cleanup failed:',e.message);process.exitCode=1;}}}
