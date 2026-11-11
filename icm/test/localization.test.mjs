import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {validateCreativeHandoff,createRunFromHandoff} from '../src/handoff.mjs';
const script=await readFile(new URL('../../apps/ocean-wave-vip-preview/i18n.js',import.meta.url),'utf8');
const win={};vm.runInNewContext(script,{window:win,URLSearchParams});
const l=win.OceanWaveI18n;
const locales=['en-CA','zh-Hans','zh-Hant','pa','tl','hi','ko','es','fr-CA'];
test('translations are complete and locale ids are supported',()=>{
 assert.deepEqual([...l.locales],locales);
 const base=Object.keys(l.messages['en-CA']);
 for(const locale of locales){
  assert.deepEqual(Object.keys(l.messages[locale]),base);
  for(const key of base)assert.ok(l.translate(locale,key).trim(),`${locale}/${key}`);
  assert.equal(l.resolve(locale),locale);
 }
});
test('language detection chooses explicit supported URL over browser locale',()=>{
 assert.equal(l.detectLanguage('?lang=pa','fr-CA'),'pa');
 assert.equal(l.detectLanguage('?lang=zh-Hant','zh-CN'),'zh-Hant');
 assert.equal(l.detectLanguage('','zh-HK'),'zh-Hant');
 assert.equal(l.detectLanguage('','fil-PH'),'tl');
 assert.equal(l.detectLanguage('?lang=unsupported','en-US'),'en-CA');
});
test('both demos contain localization controls and safe noindex markers',async()=>{
 for(const file of ['../../index.html','../../apps/ocean-wave-vip-preview/index.html']){
  const html=await readFile(new URL(file,import.meta.url),'utf8');
  assert.ok(html.includes('id="languagePicker"'));
  assert.ok(html.includes('data-i18n="footer"'));
  assert.ok(html.includes('data-i18n="disclaimer"'));
  assert.ok(html.includes('noindex,nofollow,noarchive'));
  assert.ok(html.includes('window.OceanWaveI18n'));
 }
});
const sample=()=>({
 schema:'klicksmartai.oceanwave.icm-handoff.v1',
 origin:{app:'Klicksmartai.VideoAd.Agent',creativeSchema:'klicksmartai.oceanwave.social-content.v1',sourceLinks:['https://example.org/bible']},
 creative:{id:'OWVIP-ROMANCE-UGC-A',topic:'Proposal',hook:'Plan it',cta:'Request a quote',script:'A sourced brief',storyboard:['scene 1'],leadMagnet:'Checklist',segment:'romance',format:'ugc',platform:'instagram'},
 icm:{campaignId:'owvip-localized',segment:'romance',format:'ugc',platform:'instagram',sourceRefs:['https://example.org/bible'],maxBudgetCents:0},
 controls:{state:'UNREVIEWED_DRAFT',allowPaidGeneration:false,allowAutomaticPublishing:false,humanApprovalsTransfer:false,requiresSourceRightsReview:true}
});
test('ICM handoff locale is optional, safe and never approves content',()=>{
 const d=sample();assert.equal(validateCreativeHandoff(d).briefSeed.language,'en-CA');
 d.icm.language='pa';d.creative.language='pa';
 const r=createRunFromHandoff(d);assert.equal(r.briefSeed.language,'pa');assert.equal(r.briefSeed.translationStatus,'DRAFT_NEEDS_NATIVE_REVIEW');
 assert.equal(r.stages.rights.status,'pending');assert.equal(r.budget.capCents,0);
 d.creative.language='zh-Hans';assert.throws(()=>validateCreativeHandoff(d),/locale mismatch/);
 d.creative.language='pa';d.icm.language='xx';assert.throws(()=>validateCreativeHandoff(d),/unsupported locale/);
});
