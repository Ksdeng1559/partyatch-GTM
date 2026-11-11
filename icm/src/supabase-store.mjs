/** Server-side Supabase REST RPC adapter for Ocean Wave ICM workflow snapshots.
 * Strictly server-only. Never import into Astro/React or expose the secret key.
 * Database migration must be applied to an approved project before use.
 */
import {createRun,validateRun} from './engine.mjs';

function required(name,value){
 if(typeof value!=='string'||!value.trim())throw new Error(`Missing ${name}`);
 return value;
}
export class SupabaseIcmStore{
 constructor({url,serviceKey,tenantId,fetchImpl=fetch}={}){
  this.url=required('SUPABASE_URL',url).replace(/\/+$/,'');
  this.serviceKey=required('SUPABASE_SERVICE_ROLE_KEY',serviceKey);
  this.tenantId=required('ICM_TENANT_ID',tenantId);
  if(!/^https:\/\/[^/]+\.supabase\.co$/.test(this.url))throw new Error('Supabase URL must be https://<ref>.supabase.co');
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(this.tenantId))throw new Error('Tenant must be an explicit UUID');
  this.fetchImpl=fetchImpl;
 }
 async rpc(method,args){
  const res=await this.fetchImpl(`${this.url}/rest/v1/rpc/${method}`,{
   method:'POST',headers:{'apikey':this.serviceKey,'Authorization':`Bearer ${this.serviceKey}`,
    'Content-Type':'application/json','Accept':'application/json'},
   body:JSON.stringify(args)
  });
  let body;try{body=await res.json();}catch{throw new Error(`ICM RPC ${method}: malformed server response`);}
  if(!res.ok){
   // Do not output DB response or secrets. Only sanitize a small set of diagnostic categories.
   const category=res.status===401||res.status===403?'auth_or_grant_failure':res.status===404?'rpc_not_deployed':
    res.status===409?'conflict':'rpc_error';
   throw new Error(`ICM RPC ${method} failed: ${category} (HTTP ${res.status})`);
  }
  if(body===null)throw new Error('ICM run not found in tenant');
  validateRun(body);return body;
 }
 async get(id){return this.rpc('icm_snapshot_get',{p_tenant:this.tenantId,p_id:id});}
 async create(input){
  const run=createRun(input);
  return this.rpc('icm_snapshot_create',{p_tenant:this.tenantId,p_run:run});
 }
 async save(run,expectedVersion){
  validateRun(run);
  if(!Number.isInteger(expectedVersion)||run.version<=expectedVersion)throw new Error('Stale or invalid update revision');
  return this.rpc('icm_snapshot_cas',{p_tenant:this.tenantId,p_id:run.id,p_expected_revision:expectedVersion,p_run:run});
 }
}
export function storeFromEnvironment(env=process.env,fetchImpl=fetch){
 if(env.ICM_STORE_BACKEND!=='supabase')throw new Error('ICM_STORE_BACKEND must be supabase');
 return new SupabaseIcmStore({url:env.SUPABASE_URL,serviceKey:env.SUPABASE_SERVICE_ROLE_KEY,
   tenantId:env.ICM_TENANT_ID,fetchImpl});
}
