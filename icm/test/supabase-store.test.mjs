import test from 'node:test';
import assert from 'node:assert/strict';
import {SupabaseIcmStore,storeFromEnvironment} from '../src/supabase-store.mjs';
import {getStatus,startStage} from '../src/engine.mjs';

const key='test-service-role-token';
const tenant='e91cab1e-39d0-4c16-abdf-12ac52f9096e';
function mockStore(){
 let stored=null;const calls=[];
 const fake=async(url,opt)=>{
  const name=url.split('/').at(-1),request=JSON.parse(opt.body);
  calls.push({name,request,headers:opt.headers});
  if(name==='icm_snapshot_create'){if(stored)return {ok:false,status:409,json:async()=>({message:'duplicate'})};stored=request.p_run;return {ok:true,json:async()=>stored};}
  if(name==='icm_snapshot_get')return {ok:!!stored,status:stored?200:404,json:async()=>stored};
  if(name==='icm_snapshot_cas'){
   if(request.p_expected_revision!==stored.version)return {ok:false,status:409,json:async()=>({message:'conflict'})};
   stored=request.p_run;return {ok:true,json:async()=>stored};
  }
  return {ok:false,status:404,json:async()=>({})};
 };
 return {store:new SupabaseIcmStore({url:'https://example.supabase.co',serviceKey:key,tenantId:tenant,fetchImpl:fake}),calls};
}
test('server-only adapter persists and reads a tenant-scoped ICM run',async()=>{
 const {store,calls}=mockStore();
 const input={campaignId:'owvip-brief-demo',segment:'romance',format:'ugc',platform:'instagram'};
 const original=await store.create(input);
 assert.equal(original.status,'active');assert.equal(original.budget.capCents,0);
 const read=await store.get(original.id);assert.equal(read.id,original.id);
 const started=startStage(read,{stageId:'research',actor:'operator',expectedVersion:read.version});
 const result=await store.save(started,read.version);
 assert.equal(result.stages.research.status,'running');assert.equal(getStatus(result).version,started.version);
 assert.equal(calls[0].request.p_tenant,tenant);
 assert.equal(calls[0].headers.Authorization,'Bearer '+key);
 assert.equal(calls.at(-1).request.p_expected_revision,read.version);
});
test('stale save does not corrupt stored run',async()=>{
 const {store}=mockStore();
 const run=await store.create({campaignId:'owvip-second-demo',segment:'visitors',format:'authentic',platform:'youtube'});
 const run1=startStage(run,{stageId:'research',actor:'producer',expectedVersion:run.version});
 await store.save(run1,run.version);
 await assert.rejects(store.save(run1,run.version),/conflict/);
 const saved=await store.get(run.id);assert.equal(saved.version,run1.version);
});
test('invalid credentials, environment or run revision fail closed',async()=>{
 assert.throws(()=>storeFromEnvironment({ICM_STORE_BACKEND:'file'}),/supabase/);
 assert.throws(()=>new SupabaseIcmStore({url:'http://bad.test',serviceKey:key,tenantId:tenant}),/URL/);
 assert.throws(()=>new SupabaseIcmStore({url:'https://example.supabase.co',serviceKey:'',tenantId:tenant}),/KEY/);
 const {store}=mockStore();
 const run=await store.create({campaignId:'owvip-third-demo',segment:'corporate',format:'ugc',platform:'facebook'});
 await assert.rejects(store.save(run,run.version),/invalid update revision/);
});
test('malformed RPC JSON and unauthorized response do not leak credentials',async()=>{
 const store=new SupabaseIcmStore({url:'https://example.supabase.co',serviceKey:key,tenantId:tenant,
  fetchImpl:async()=>({ok:false,status:403,json:async()=>({message:'secret '+key})})});
 await assert.rejects(store.get('f897b9f1-7ab5-4271-baff-34b3220198c1'),e=>!e.message.includes(key)&&e.message.includes('auth_or_grant_failure'));
});
