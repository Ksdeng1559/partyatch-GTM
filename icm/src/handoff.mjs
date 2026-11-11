import {createRun} from './engine.mjs';
export const HANDOFF_SCHEMA='klicksmartai.oceanwave.icm-handoff.v1';
const FORMAT=new Set(['ugc','microdrama','authentic','carousel','explainer','stories']);
const SEGMENTS=new Set(['romance','birthdays','stag','corporate','visitors','management','repair']);
const PLATFORMS=new Set(['instagram','tiktok','youtube','facebook']);
const LANGUAGES=new Set(['en-CA','zh-Hans','zh-Hant','pa','tl','hi','ko','es','fr-CA']);
function check(ok,message){if(!ok)throw new Error(`Handoff validation: ${message}`);}
function safeText(value,max,label){
 check(typeof value==='string'&&value.trim().length>0&&value.length<=max,`${label} must be nonempty text <= ${max} characters`);
 return value;
}
/** Accept unapproved marketing drafts; never map checkboxes to ICM approvals. */
export function validateCreativeHandoff(data){
 check(data&&typeof data==='object'&&!Array.isArray(data),'expected a JSON object');
 check(data.schema===HANDOFF_SCHEMA,'unsupported schema');
 check(data.origin?.app==='Klicksmartai.VideoAd.Agent','unrecognized origin');
 check(data.origin?.creativeSchema==='klicksmartai.oceanwave.social-content.v1','unsupported creative schema');
 check(data.controls?.state==='UNREVIEWED_DRAFT','only unreviewed drafts can be imported');
 check(data.controls.allowPaidGeneration===false && data.controls.allowAutomaticPublishing===false &&
  data.controls.humanApprovalsTransfer===false && data.controls.requiresSourceRightsReview===true,
  'unsafe controls; no external actions or transferred approvals allowed');
 const c=data.creative, i=data.icm;
 check(c && i && typeof c==='object' && typeof i==='object','missing creative or ICM envelope');
 const campaignId=safeText(i.campaignId,80,'campaignId');
 check(/^[a-z0-9][a-z0-9_-]{2,79}$/i.test(campaignId),'invalid campaignId characters');
 for(const key of ['segment','format','platform'])check(i[key]===c[key],`creative/${key} mismatch`);
 check(SEGMENTS.has(i.segment),'unknown audience segment');
 check(FORMAT.has(i.format),'unknown content format');
 check(PLATFORMS.has(i.platform),'unknown social channel');
 const language=i.language||'en-CA';
 check(LANGUAGES.has(language),'unsupported locale');
 check(!c.language || c.language===language,'creative and ICM locale mismatch');
 check(i.maxBudgetCents===0,'imports must start with a zero budget');
 safeText(c.id,100,'creative.id');safeText(c.topic,200,'topic');safeText(c.hook,500,'hook');
 safeText(c.cta,200,'cta');safeText(c.script,12000,'script');safeText(c.leadMagnet,200,'lead magnet');
 check(Array.isArray(c.storyboard)&&c.storyboard.length>0&&c.storyboard.length<=20,'storyboard must contain 1–20 scenes');
 for(const scene of c.storyboard)safeText(scene,1000,'storyboard entry');
 check(Array.isArray(i.sourceRefs)&&i.sourceRefs.length<=12,'sourceRefs must be an array of <=12 URLs');
 for(const url of i.sourceRefs){
  safeText(url,500,'source URL');check(/^https:\/\//.test(url),'source refs must be HTTPS');
 }
 check(Array.isArray(data.origin.sourceLinks)&&data.origin.sourceLinks.length>0,'origin sourceLinks are required');
 check(i.sourceRefs.every(s=>data.origin.sourceLinks.includes(s)),'sourceRefs must have matching origin source links');
 return {
  campaignId,segment:i.segment,format:i.format,platform:i.platform,maxBudgetCents:0,
  sourceRefs:[...i.sourceRefs],createdBy:'local-operator',
  briefSeed:{
   id:c.id,topic:c.topic,hook:c.hook,cta:c.cta,script:c.script,
   storyboard:[...c.storyboard],leadMagnet:c.leadMagnet,
   language,translationStatus:language==='en-CA'?'SOURCE_ENGLISH':'DRAFT_NEEDS_NATIVE_REVIEW',
   handoffSchema:HANDOFF_SCHEMA,importedStatus:'UNREVIEWED_DRAFT',
   sourceApp:data.origin.app,sourceCreatedAt:data.origin.createdAt||null
  }
 };
}
export function createRunFromHandoff(data,{actor='local-operator'}={}){
 const p=validateCreativeHandoff(data);
 return createRun({...p,createdBy:actor});
}
