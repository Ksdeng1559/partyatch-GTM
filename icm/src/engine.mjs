/**
 * ICM = Intent → Context → Model/Make → human-gated execution → Measurement.
 * A deterministic orchestrator for Ocean Wave VIP. No external effects.
 * Production provider integrations must be separate, manually authorized adapters.
 */
import { randomUUID } from 'node:crypto';

export const STAGES = Object.freeze([
  { id:'research', deps:[], owner:'research', kind:'work' },
  { id:'segmentation', deps:['research'], owner:'leados', kind:'work' },
  { id:'brief', deps:['segmentation'], owner:'viral-content-engine', kind:'work' },
  { id:'rights', deps:['brief'], owner:'human', kind:'approval', approval:'rights' },
  { id:'storyboard', deps:['rights'], owner:'creative', kind:'work' },
  { id:'creative_review', deps:['storyboard'], owner:'human', kind:'approval', approval:'creative' },
  { id:'generation', deps:['creative_review'], owner:'higgsfield-krea', kind:'work', paid:true },
  { id:'quality_review', deps:['generation'], owner:'human', kind:'approval', approval:'quality' },
  { id:'publishing', deps:['quality_review'], owner:'publisher', kind:'external', approval:'publish' },
  { id:'measurement', deps:['publishing'], owner:'analytics', kind:'work' }
]);
const index = new Map(STAGES.map(s=>[s.id,s]));
export const WORKFLOW_VERSION='icm.oceanwave.content.v1';
const copy = value=>structuredClone(value);
const now=()=>new Date().toISOString();
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const allowedStatus=['pending','ready','running','awaiting_approval','completed','failed','cancelled'];
function event(run,type,actor,details={}) {
  const e={seq:run.events.length+1,at:now(),type,actor,details:copy(details)};
  run.events.push(e);run.version++;run.updatedAt=e.at;
}
function recalc(run) {
  if(run.status==='cancelled')return;
  for(const def of STAGES){
    const s=run.stages[def.id];
    if(s.status==='pending' && def.deps.every(d=>run.stages[d].status==='completed')){
      s.status=def.kind==='approval'?'awaiting_approval':'ready';
      event(run,'stage_ready','icm',{stage:def.id,status:s.status});
    }
  }
  if(STAGES.every(s=>run.stages[s.id].status==='completed')){run.status='completed';event(run,'workflow_completed','icm');}
}
export function createRun({campaignId,segment,format,platform,sourceRefs=[],maxBudgetCents=0,idempotencyKey,createdBy='operator'}={}){
  assert(typeof campaignId==='string'&&/^[a-z0-9][a-z0-9_-]{2,79}$/i.test(campaignId),'Invalid campaignId');
  assert(typeof segment==='string'&&segment.length>0&&segment.length<100,'segment required');
  assert(typeof format==='string'&&format.length>0&&format.length<100,'format required');
  assert(typeof platform==='string'&&platform.length>0&&platform.length<100,'platform required');
  assert(Number.isSafeInteger(maxBudgetCents)&&maxBudgetCents>=0,'Budget must be a nonnegative integer in cents');
  assert(Array.isArray(sourceRefs)&&sourceRefs.every(s=>typeof s==='string'&&s.length<500),'sourceRefs must be strings');
  const t=now();
  const run={id:randomUUID(),workflowVersion:WORKFLOW_VERSION,version:0,status:'active',campaignId,segment,format,platform,
    sourceRefs:copy(sourceRefs),idempotencyKey:idempotencyKey||null,createdAt:t,updatedAt:t,createdBy,
    budget:{capCents:maxBudgetCents,reservedCents:0,spentCents:0,currency:'CAD'},
    stages:Object.fromEntries(STAGES.map(s=>[s.id,{status:'pending',attempts:0,output:null,approval:null,providerJobId:null,receipts:[]}])),
    events:[]};
  event(run,'workflow_created',createdBy,{campaignId,workflowVersion:WORKFLOW_VERSION});
  recalc(run);return run;
}
export function validateRun(run){
  assert(run?.workflowVersion===WORKFLOW_VERSION,'Unknown ICM workflow version');
  assert(Number.isSafeInteger(run.version)&&run.version>=0,'Invalid revision');
  assert(run.budget && Number.isSafeInteger(run.budget.capCents) && run.budget.capCents>=0,'Invalid budget');
  assert(Number.isSafeInteger(run.budget.reservedCents)&&run.budget.reservedCents>=0,'Invalid reserved amount');
  assert(Number.isSafeInteger(run.budget.spentCents)&&run.budget.spentCents>=0,'Invalid spent amount');
  assert(run.budget.spentCents+run.budget.reservedCents<=run.budget.capCents,'Budget invariant failed');
  assert(Array.isArray(run.events)&&run.events.every((e,i)=>e.seq===i+1),'Invalid audit sequence');
  for(const def of STAGES){
    const stage=run.stages?.[def.id];
    assert(stage && allowedStatus.includes(stage.status),`Invalid stage: ${def.id}`);
    assert(!['ready','running','awaiting_approval','completed'].includes(stage.status)||
      def.deps.every(d=>run.stages[d].status==='completed'),`Dependency violation: ${def.id}`);
  }
  return true;
}
function check(run,stageId,expectedVersion){
  validateRun(run);
  assert(expectedVersion===run.version,`Stale version: expected ${expectedVersion}, found ${run.version}`);
  assert(run.status==='active','Workflow is not active');
  const def=index.get(stageId);assert(def,`Unknown stage ${stageId}`);
  return [def,run.stages[stageId]];
}
function requireActor(actor){assert(typeof actor==='string'&&actor.trim().length>=2,'Actor ID required');}
function mutate(run,fn){const next=copy(run);fn(next);validateRun(next);return next;}
/** Start a permitted internal step. External publication must be explicitly approved and manually acknowledged. */
export function startStage(run,{stageId,actor,expectedVersion,estimateCents=0,provider='manual'}){
 return mutate(run,next=>{
  const [def,stage]=check(next,stageId,expectedVersion);requireActor(actor);
  assert(def.kind==='work','Approvals and external actions cannot be started as ordinary jobs');
  assert(stage.status==='ready','Stage is not ready');assert(Number.isSafeInteger(estimateCents)&&estimateCents>=0,'Invalid estimate');
  if(def.paid){
    assert(next.stages.creative_review.status==='completed'&&next.stages.rights.status==='completed','Approval gates missing');
    assert(next.budget.capCents>0,'Paid generation requires an approved nonzero budget cap');
    assert(next.budget.spentCents+next.budget.reservedCents+estimateCents<=next.budget.capCents,'Budget cap exceeded');
    next.budget.reservedCents+=estimateCents;
  } else assert(estimateCents===0,'Only paid generation may reserve budget');
  stage.status='running';stage.attempts++;stage.estimateCents=estimateCents;stage.provider=provider;
  event(next,'stage_started',actor,{stageId,provider,estimateCents,attempt:stage.attempts});
 });
}
/** Complete with evidence URIs and structured metadata, never raw private data or secrets. */
export function completeStage(run,{stageId,actor,expectedVersion,receipt,actualCents=0}){
 return mutate(run,next=>{
  const [def,stage]=check(next,stageId,expectedVersion);requireActor(actor);
  assert(def.kind==='work'&&stage.status==='running','Stage is not running');
  assert(receipt&&typeof receipt.uri==='string'&&receipt.uri.length>0&&receipt.uri.length<=500,'Evidence receipt URI required');
  assert(Number.isSafeInteger(actualCents)&&actualCents>=0,'Invalid actual spend');
  if(def.paid){
    assert(actualCents<=stage.estimateCents,'Actual spend exceeds authorized reservation');
    next.budget.reservedCents-=stage.estimateCents;next.budget.spentCents+=actualCents;
  } else assert(actualCents===0,'Nonpaid stages cannot charge spend');
  stage.status='completed';stage.output={uri:receipt.uri,sha256:receipt.sha256||null,notes:receipt.notes||null};
  stage.receipts.push({actor,at:now(),...stage.output});
  event(next,'stage_completed',actor,{stageId,output:stage.output,actualCents});
  recalc(next);
 });
}
/** An approval is a distinct human action, never self-approved by an AI adapter. */
export function approveStage(run,{stageId,actor,expectedVersion,decision,evidenceUri,role='client_approver'}){
 return mutate(run,next=>{
  const [def,stage]=check(next,stageId,expectedVersion);requireActor(actor);
  assert(def.kind==='approval'&&stage.status==='awaiting_approval','Approval stage is not awaiting review');
  assert(role==='client_approver'||role==='authorized_reviewer','Human reviewer role required');
  assert(decision==='approved'||decision==='rejected','Explicit decision required');
  assert(typeof evidenceUri==='string'&&evidenceUri.length>0&&evidenceUri.length<=500,'Approval evidence URI required');
  stage.approval={decision,by:actor,role,at:now(),evidenceUri};
  stage.status=decision==='approved'?'completed':'failed';
  event(next,'approval_decided',actor,{stageId,decision,evidenceUri,role});
  if(decision==='approved')recalc(next);
 });
}
/** Publish receipt is recorded only after an independently authorized provider action. */
export function recordPublication(run,{actor,expectedVersion,authorizationRef,platformUrl}){
 return mutate(run,next=>{
  const [def,stage]=check(next,'publishing',expectedVersion);requireActor(actor);
  assert(def.kind==='external'&&stage.status==='ready','Publishing is not eligible');
  assert(next.stages.quality_review.approval?.decision==='approved','Quality approval required');
  assert(typeof authorizationRef==='string'&&authorizationRef.length>0,'Written human publishing authorization reference required');
  assert(typeof platformUrl==='string'&&/^https:\/\//.test(platformUrl),'Verified publication URL required');
  stage.status='completed';stage.approval={decision:'approved',by:actor,at:now(),evidenceUri:authorizationRef};
  stage.output={uri:platformUrl};
  event(next,'publication_recorded',actor,{authorizationRef,platformUrl});
  recalc(next);
 });
}
export function failStage(run,{stageId,actor,expectedVersion,reason}){
 return mutate(run,next=>{
  const [def,stage]=check(next,stageId,expectedVersion);requireActor(actor);
  assert(def.kind==='work'&&stage.status==='running','Only running work may fail');
  assert(typeof reason==='string'&&reason.length>0,'Reason required');
  if(def.paid){next.budget.reservedCents-=stage.estimateCents;stage.estimateCents=0;}
  stage.status='failed';event(next,'stage_failed',actor,{stageId,reason});
 });
}
export function retryStage(run,{stageId,actor,expectedVersion}){
 return mutate(run,next=>{
  const [def,stage]=check(next,stageId,expectedVersion);requireActor(actor);
  assert(def.kind==='work'&&stage.status==='failed','Only failed work can retry');
  assert(stage.attempts<3,'Retry limit reached; human intervention required');
  stage.status='ready';stage.output=null;event(next,'stage_retry_ready',actor,{stageId,attempts:stage.attempts});
 });
}
export function cancelRun(run,{actor,expectedVersion,reason}){
 return mutate(run,next=>{
  validateRun(next);assert(expectedVersion===next.version,'Stale version');requireActor(actor);
  assert(next.status==='active','Workflow not active');
  assert(typeof reason==='string'&&reason.length>0,'Reason required');
  for(const def of STAGES){const s=next.stages[def.id];
    if(s.status==='running'&&def.paid){next.budget.reservedCents-=s.estimateCents;s.estimateCents=0;}
    if(s.status!=='completed')s.status='cancelled';
  }
  next.status='cancelled';event(next,'workflow_cancelled',actor,{reason});
 });
}
export function getStatus(run){validateRun(run);return {id:run.id,campaignId:run.campaignId,status:run.status,version:run.version,budget:run.budget,
  nextStages:STAGES.filter(s=>['ready','awaiting_approval'].includes(run.stages[s.id].status)).map(s=>({id:s.id,status:run.stages[s.id].status,owner:s.owner,kind:s.kind})),
  stages:STAGES.map(s=>({id:s.id,status:run.stages[s.id].status,attempts:run.stages[s.id].attempts})),events:run.events.length};}
