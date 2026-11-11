/**
 * Demo file-backed ICM repository. Intended for one local writer only.
 * NOT safe for multi-host concurrency, shared filesystem or PII.
 * Supabase schema in db/migrations is the production target.
 */
import {mkdir,readFile,writeFile,rename,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {createRun,validateRun} from './engine.mjs';

const validId=id=>/^[a-f0-9-]{36}$/.test(id);
export class DemoFileStore{
 constructor(directory='.icm-local-runs'){this.directory=directory;}
 path(id){if(!validId(id))throw new Error('Invalid run ID');return join(this.directory,`${id}.json`);}
 async get(id){const item=JSON.parse(await readFile(this.path(id),'utf8'));validateRun(item);return item;}
 async create(input){
  await mkdir(this.directory,{recursive:true});
  const run=createRun(input);
  // File store writes exclusively at create; duplicate campaign IDs are NOT an idempotency guarantee.
  await writeFile(this.path(run.id),JSON.stringify(run,null,2),{flag:'wx',mode:0o600});
  return run;
 }
 async save(run,expectedVersion){
  validateRun(run);
  const previous=await this.get(run.id);
  if(previous.version!==expectedVersion)throw new Error(`Concurrent modification: current ${previous.version}, expected ${expectedVersion}`);
  if(run.version<=expectedVersion)throw new Error('No new state to save');
  const tmp=this.path(run.id)+'.tmp';
  try{
   await writeFile(tmp,JSON.stringify(run,null,2),{flag:'wx',mode:0o600});
   await rename(tmp,this.path(run.id));
  }finally{await rm(tmp,{force:true}).catch(()=>{});}
  // This check + rename is NOT atomic across processes.
  return run;
 }
}
