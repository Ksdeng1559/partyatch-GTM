import test from 'node:test';
import assert from 'node:assert/strict';
import {createRunFromHandoff,validateCreativeHandoff} from '../src/handoff.mjs';
import {getStatus,startStage,approveStage} from '../src/engine.mjs';

const sample=()=>({
 schema:'klicksmartai.oceanwave.icm-handoff.v1',
 origin:{app:'Klicksmartai.VideoAd.Agent',creativeSchema:'klicksmartai.oceanwave.social-content.v1',createdAt:'2026-11-11T12:00:00.000Z',sourceLinks:['https://app.notion.com/p/content-bible']},
 creative:{id:'OWVIP-ROMANCE-MICRODRAMA-A',topic:'The Secret Proposal',hook:'The secret proposal',cta:'Request a charter quote',
  script:'Start with a plan, then request an actual quote.',storyboard:['intro fictional scene','verified yacht reveal'],leadMagnet:'Proposal checklist',
  format:'microdrama',platform:'instagram',segment:'romance'},
 icm:{campaignId:'owvip-social-pilot',segment:'romance',format:'microdrama',platform:'instagram',sourceRefs:['https://app.notion.com/p/content-bible'],maxBudgetCents:0},
 controls:{state:'UNREVIEWED_DRAFT',allowPaidGeneration:false,allowAutomaticPublishing:false,humanApprovalsTransfer:false,requiresSourceRightsReview:true}
});
test('accepts VideoAd export and starts research gate with zero budget',()=>{
 const input=validateCreativeHandoff(sample());
 const run=createRunFromHandoff(sample(),{actor:'campaign-producer'});
 assert.equal(input.briefSeed.handoffSchema,'klicksmartai.oceanwave.icm-handoff.v1');
 assert.equal(run.briefSeed.topic,'The Secret Proposal');
 assert.equal(run.briefSeed.importedStatus,'UNREVIEWED_DRAFT');
 assert.equal(run.budget.capCents,0);
 assert.deepEqual(getStatus(run).nextStages.map(x=>x.id),['research']);
 assert.equal(run.stages.rights.status,'pending');
 assert.throws(()=>approveStage(run,{stageId:'rights',actor:'operator',expectedVersion:run.version,decision:'approved',evidenceUri:'test://approval'}),/not awaiting/);
 assert.throws(()=>startStage(run,{stageId:'generation',actor:'operator',expectedVersion:run.version}),/not ready/);
});
test('rejects forged approvals and unsafe provider defaults',()=>{
 for(const edit of [
  x=>{x.controls.humanApprovalsTransfer=true;},
  x=>{x.controls.allowPaidGeneration=true;},
  x=>{x.controls.allowAutomaticPublishing=true;},
  x=>{x.controls.state='APPROVED';},
  x=>{x.icm.maxBudgetCents=1200;},
  x=>{x.icm.segment='corporate';},
  x=>{x.icm.format='unknown-format';},
  x=>{x.icm.sourceRefs=['http://untrusted.example'];},
  x=>{x.schema='unsupported';}
 ]){
  const x=sample();edit(x);assert.throws(()=>validateCreativeHandoff(x));
 }
});
test('preserves draft scene notes and blocks arbitrary oversized payloads',()=>{
 const x=sample();x.creative.script='x'.repeat(13000);
 assert.throws(()=>validateCreativeHandoff(x),/script/);
 x.creative.script='Safe draft';x.creative.storyboard=[];
 assert.throws(()=>validateCreativeHandoff(x),/storyboard/);
});
