import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,startStage,completeStage,approveStage,recordPublication,failStage,retryStage,cancelRun,getStatus,validateRun,STAGES} from '../src/engine.mjs';

const setup=()=>createRun({campaignId:'owvip-proposal-pilot',segment:'romance',format:'microdrama',platform:'instagram',maxBudgetCents:15000});
const next=(run,stage)=>completeStage(startStage(run,{stageId:stage,actor:'agent',expectedVersion:run.version}),{stageId:stage,actor:'agent',expectedVersion:run.version+1,receipt:{uri:`test://evidence/${stage}`}});
const review=(run,stage,decision='approved')=>approveStage(run,{stageId:stage,actor:'human-reviewer',role:'authorized_reviewer',decision,expectedVersion:run.version,evidenceUri:`test://approval/${stage}`});
const prepared=()=>{let r=setup();for(const s of ['research','segmentation','brief'])r=next(r,s);r=review(r,'rights');r=next(r,'storyboard');r=review(r,'creative_review');return r;};
test('initial state is gated; cannot skip dependencies',()=>{
 const r=setup(); assert.deepEqual(getStatus(r).nextStages.map(x=>x.id),['research']);
 assert.throws(()=>startStage(r,{stageId:'generation',actor:'bot',expectedVersion:r.version}),/not ready/);
 assert.throws(()=>approveStage(r,{stageId:'rights',actor:'someone',expectedVersion:r.version,decision:'approved',evidenceUri:'test://x'}),/not awaiting/);
 assert.equal(r.events[0].type,'workflow_created');assert.equal(validateRun(r),true);
});
test('start, evidence completion, and human review unlock stages',()=>{
 let r=setup();r=next(r,'research');r=next(r,'segmentation');r=next(r,'brief');
 assert.equal(r.stages.rights.status,'awaiting_approval');
 assert.throws(()=>approveStage(r,{stageId:'rights',actor:'agent',role:'ai',expectedVersion:r.version,decision:'approved',evidenceUri:'test://x'}),/Human reviewer/);
 r=review(r,'rights');r=next(r,'storyboard');r=review(r,'creative_review');
 assert.equal(r.stages.generation.status,'ready');
 assert.throws(()=>startStage(r,{stageId:'generation',actor:'agent',expectedVersion:r.version,estimateCents:20000}),/Budget cap/);
 assert.throws(()=>recordPublication(r,{actor:'agent',expectedVersion:r.version,authorizationRef:'test://approval',platformUrl:'https://example.com'}),/not eligible/);
});
test('bounded payment reservations, completion, QA and publication acknowledgment',()=>{
 let r=prepared();
 const old=r.version;r=startStage(r,{stageId:'generation',actor:'operator',expectedVersion:old,estimateCents:3000,provider:'manual_approved'});
 assert.equal(r.budget.reservedCents,3000);
 assert.throws(()=>completeStage(r,{stageId:'generation',actor:'operator',expectedVersion:r.version,receipt:{uri:'test://render'},actualCents:4000}),/exceeds authorized/);
 r=completeStage(r,{stageId:'generation',actor:'operator',expectedVersion:r.version,receipt:{uri:'test://render'},actualCents:2400});
 assert.equal(r.budget.spentCents,2400);assert.equal(r.budget.reservedCents,0);
 r=review(r,'quality_review');assert.equal(r.stages.publishing.status,'ready');
 assert.throws(()=>recordPublication(r,{actor:'human',expectedVersion:r.version,platformUrl:'https://example.com/clip'}),/authorization/);
 r=recordPublication(r,{actor:'human',expectedVersion:r.version,authorizationRef:'test://written-client-approval',platformUrl:'https://example.com/clip'});
 assert.equal(r.stages.measurement.status,'ready');r=next(r,'measurement');
 assert.equal(r.status,'completed');assert.equal(r.stages.publishing.output.uri,'https://example.com/clip');
 assert.ok(r.events.some(e=>e.type==='workflow_completed'));
});
test('optimistic version checks and immutable source state',()=>{
 const r=setup();const before=JSON.stringify(r);
 assert.throws(()=>startStage(r,{stageId:'research',actor:'bot',expectedVersion:r.version-1}),/Stale version/);
 const nextRun=startStage(r,{stageId:'research',actor:'bot',expectedVersion:r.version});
 assert.equal(JSON.stringify(r),before);assert.equal(nextRun.stages.research.status,'running');
});
test('failure releases reserved funds, retry bounded',()=>{
 let r=prepared();r=startStage(r,{stageId:'generation',actor:'operator',expectedVersion:r.version,estimateCents:3000});
 r=failStage(r,{stageId:'generation',actor:'operator',expectedVersion:r.version,reason:'Provider timeout'});
 assert.equal(r.budget.reservedCents,0);r=retryStage(r,{stageId:'generation',actor:'human',expectedVersion:r.version});
 assert.equal(r.stages.generation.status,'ready');
});
test('rejected human approval blocks downstream and cancel terminates pending steps',()=>{
 let r=setup();r=next(r,'research');r=next(r,'segmentation');r=next(r,'brief');r=review(r,'rights','rejected');
 assert.equal(r.stages.storyboard.status,'pending');
 r=cancelRun(r,{actor:'owner',expectedVersion:r.version,reason:'Rights rejected'});
 assert.equal(r.status,'cancelled');
 assert.throws(()=>startStage(r,{stageId:'storyboard',actor:'bot',expectedVersion:r.version}),/not active/);
});
test('all dependency keys refer to real stages; no direct publishing adapter',()=>{
 const ids=new Set(STAGES.map(s=>s.id));for(const s of STAGES)for(const dep of s.deps)assert.ok(ids.has(dep));
 assert.equal(STAGES.find(s=>s.id==='publishing').kind,'external');
});
