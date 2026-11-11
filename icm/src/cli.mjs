#!/usr/bin/env node
/** Safe single-user demo CLI. Records workflow state; never calls external providers. */
import {DemoFileStore} from './demo-store.mjs';
import {validateCreativeHandoff} from './handoff.mjs';
import {readFile} from 'node:fs/promises';
import {startStage,completeStage,approveStage,recordPublication,failStage,retryStage,cancelRun,getStatus} from './engine.mjs';
const [, , command, ...rest]=process.argv;
const args=Object.fromEntries(rest.filter(s=>s.startsWith('--')&&s.includes('=')).map(s=>{const i=s.indexOf('=');return [s.slice(2,i),s.slice(i+1)];}));
const store=new DemoFileStore(process.env.ICM_STORE||'.icm-local-runs');
const required=(key)=>{if(!args[key])throw new Error(`Missing --${key}=...`);return args[key];};
async function main(){
 if(command==='import-creative'){
  const file=required('file');
  const raw=await readFile(file,'utf8');
  if(raw.length>200000)throw new Error('Creative handoff exceeds 200 KB');
  const handoff=JSON.parse(raw);
  const input=validateCreativeHandoff(handoff);
  const r=await store.create({...input,createdBy:args.actor||'local-operator'});
  console.log(JSON.stringify({...getStatus(r),briefSeed:r.briefSeed,imported:true,approvalStatus:'NOT_APPROVED',nextAction:'Complete research with sourced evidence, then segmentation and brief; rights review is still required.'},null,2));
  return;
 }
 if(command==='init'){
  const r=await store.create({campaignId:required('campaign'),segment:required('segment'),format:required('format'),
    platform:required('platform'),maxBudgetCents:Number(args.budget||0),createdBy:args.actor||'local-operator'});
  console.log(JSON.stringify(getStatus(r),null,2));return;
 }
 const r=await store.get(required('id'));
 if(command==='status'){console.log(JSON.stringify(getStatus(r),null,2));return;}
 const props={actor:required('actor'),expectedVersion:r.version};
 const map={
  start:()=>startStage(r,{...props,stageId:required('stage'),estimateCents:Number(args.estimate||0),provider:args.provider||'manual'}),
  complete:()=>completeStage(r,{...props,stageId:required('stage'),receipt:{uri:required('receipt')},actualCents:Number(args.actual||0)}),
  approve:()=>approveStage(r,{...props,stageId:required('stage'),decision:required('decision'),role:args.role||'client_approver',evidenceUri:required('evidence')}),
  'record-publication':()=>recordPublication(r,{...props,authorizationRef:required('authorization'),platformUrl:required('url')}),
  fail:()=>failStage(r,{...props,stageId:required('stage'),reason:required('reason')}),
  retry:()=>retryStage(r,{...props,stageId:required('stage')}),
  cancel:()=>cancelRun(r,{...props,reason:required('reason')})
 };
 if(!map[command])throw new Error('Commands: import-creative, init, status, start, complete, approve, record-publication, fail, retry, cancel');
 const updated=map[command]();await store.save(updated,r.version);
 console.log(JSON.stringify(getStatus(updated),null,2));
}
main().catch(e=>{console.error('ICM ERROR:',e.message);process.exitCode=1;});
