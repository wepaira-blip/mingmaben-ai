import { API_BASE_URL, SUPPORT_URL } from './config.js';

export function chooseView(bundle,view='reading'){
  return {bundle,showEvidence:view==='evidence'};
}

export async function requestAnalysis(fetchImpl,apiBase,text){
  if(!apiBase || apiBase==='REPLACE_WITH_WORKER_URL') throw new Error('AI backend is not configured yet.');
  const response=await fetchImpl(`${apiBase.replace(/\/$/,'')}/api/analyze`,{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text})
  });
  let data={};
  try{data=await response.json();}catch{}
  if(!response.ok) throw new Error(data.error || `Analysis request failed (${response.status}).`);
  return data;
}

export async function sendFeedback(fetchImpl,apiBase,frozenId,rating){
  const response=await fetchImpl(`${apiBase.replace(/\/$/,'')}/api/feedback`,{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({frozen_id:frozenId,rating})
  });
  let data={}; try{data=await response.json();}catch{}
  if(!response.ok) throw new Error(data.error || `Feedback failed (${response.status}).`);
  return data;
}

function escapeHtml(value=''){
  return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function section(label,text){return `<div class="result-section"><strong>${escapeHtml(label)}</strong><div>${escapeHtml(text||'—')}</div></div>`;}

function renderLanguage(r,lang){
  const en=lang==='en';
  return `<h3>${en?'English Analysis':'中文分析'}</h3>`+
    section(en?'Surface Meaning':'表面层',r[en?'surface_meaning_en':'surface_meaning_zh'])+
    section(en?'Canonical Reading':'冻结核心显影',r[en?'canonical_reading_en':'canonical_reading_zh'])+
    section(en?'Whole-form Mechanism':'整体机制',r[en?'whole_form_mechanism_en':'whole_form_mechanism_zh'])+
    section(en?'Incremental Information':'隐藏 / 增量信息',r[en?'incremental_information_en':'incremental_information_zh'])+
    section(en?'Uncertainty':'不确定性',r[en?'uncertainties_en':'uncertainties_zh'])+
    section(en?'Structural Evidence Strength':'结构证据强度',r.structural_evidence_strength)+
    section(en?'Later Outcome Confirmation':'后来效果确认',r.later_outcome_confirmation)+
    section(en?'Reality Boundary':'现实边界',r[en?'reality_boundary_en':'reality_boundary_zh']);
}

function renderEvidence(bundle){
  const r=bundle.result;
  const evidence=(r.structural_evidence||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join('')||'<li>—</li>';
  const layer0=(r.layer0_relevance||[]).map(x=>`<div class="code-row"><strong>${escapeHtml(x.code)}</strong> · ${escapeHtml(x.relevance_en)} / ${escapeHtml(x.relevance_zh)}<br><span class="micro">${escapeHtml(x.relation_to_whole_en)} / ${escapeHtml(x.relation_to_whole_zh)}</span></div>`).join('')||'<p>—</p>';
  return `<p class="mono">Model: ${escapeHtml(bundle.model)} · Reasoning: ${escapeHtml(bundle.reasoning_effort)} · Method: ${escapeHtml(bundle.method_version)} · Prompt: ${escapeHtml(bundle.prompt_version)}</p><h3>Structural evidence / 结构证据</h3><ul>${evidence}</ul><h3>Relevant Layer 0 / 相关原码</h3>${layer0}`;
}

function init(){
  const $=s=>document.querySelector(s);
  const source=$('#source');
  const analyzeBtn=$('#analyze');
  const error=$('#error');
  let bundle=null;

  function setError(message=''){
    error.textContent=message;
    error.classList.toggle('hidden',!message);
  }

  function applyView(){
    if(!bundle) return;
    const view=document.querySelector('input[name="view"]:checked')?.value || 'reading';
    const {showEvidence}=chooseView(bundle,view);
    $('#evidence-panel').classList.toggle('hidden',!showEvidence);
  }

  function render(next){
    bundle=next;
    $('#frozen-id').textContent=`Frozen ID / 冻结编号: ${next.frozen_id}`;
    $('#metadata').textContent=`${next.model} · ${next.reasoning_effort} · ${next.method_version} · ${next.created_at}${next.cached?' · cached frozen result':''}`;
    $('#result-en').innerHTML=renderLanguage(next.result,'en');
    $('#result-zh').innerHTML=renderLanguage(next.result,'zh');
    $('#evidence-content').innerHTML=renderEvidence(next);
    $('#results').classList.remove('hidden');
    applyView();
    $('#results').scrollIntoView({behavior:'smooth',block:'start'});
  }

  analyzeBtn.addEventListener('click',async()=>{
    const text=source.value.trim();
    if(!text){source.focus();return;}
    setError(''); analyzeBtn.disabled=true; analyzeBtn.textContent='Analyzing… / 解译中…';
    try{ render(await requestAnalysis(fetch,API_BASE_URL,text)); }
    catch(e){ bundle=null; $('#results').classList.add('hidden'); setError(e.message || 'Temporary analysis error.'); }
    finally{ analyzeBtn.disabled=false; analyzeBtn.textContent='Analyze / 开始解译'; }
  });

  source.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter') analyzeBtn.click();});
  for(const radio of document.querySelectorAll('input[name="view"]')) radio.addEventListener('change',applyView);

  $('#copy').addEventListener('click',async()=>{
    if(!bundle) return;
    const r=bundle.result;
    const text=[`Frozen ID: ${bundle.frozen_id}`,r.canonical_reading_en,r.whole_form_mechanism_en,r.incremental_information_en,'',r.canonical_reading_zh,r.whole_form_mechanism_zh,r.incremental_information_zh].join('\n');
    try{await navigator.clipboard.writeText(text);$('#copy').textContent='Copied / 已复制';setTimeout(()=>$('#copy').textContent='Copy / 复制',1300);}catch{}
  });

  for(const btn of document.querySelectorAll('[data-feedback]')) btn.addEventListener('click',async()=>{
    if(!bundle) return;
    const status=$('#feedback-status');
    try{await sendFeedback(fetch,API_BASE_URL,bundle.frozen_id,btn.dataset.feedback);status.textContent='Feedback saved. Thank you. / 反馈已保存，谢谢。';}
    catch(e){status.textContent=e.message;}
  });

  const support=$('#support-link');
  if(SUPPORT_URL){support.href=SUPPORT_URL;support.classList.remove('hidden');support.target='_blank';}
}

if(typeof document!=='undefined') init();
