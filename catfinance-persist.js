/* ══════════════════════════════════════════════════
   Cat Finance — Persistência v3 (corrigido)
════════════════════════════════════════════════════ */

/* ── DADOS ── */
let transactions = [];
let metas        = [];
let gatoTx       = [];
let perfil       = { nome: '', email: '' };
let currentModal = null;

const FMT = v => 'R$ ' + Math.abs(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});

/* ── LOCALSTORAGE ── */
function saveData() {
  try {
    localStorage.setItem('cf_tx',      JSON.stringify(transactions));
    localStorage.setItem('cf_metas',   JSON.stringify(metas));
    localStorage.setItem('cf_gato_tx', JSON.stringify(gatoTx));
    localStorage.setItem('cf_perfil',  JSON.stringify(perfil));
    const preds = (window.predictorItems||[]).map(i=>({...i,
      lastDate: i.lastDate instanceof Date ? i.lastDate.toISOString() : i.lastDate,
      nextDate: i.nextDate instanceof Date ? i.nextDate.toISOString() : i.nextDate
    }));
    localStorage.setItem('cf_predictor', JSON.stringify(preds));
  } catch(e){}
}

function loadData() {
  try {
    transactions = JSON.parse(localStorage.getItem('cf_tx')       || '[]');
    metas        = JSON.parse(localStorage.getItem('cf_metas')    || '[]');
    gatoTx       = JSON.parse(localStorage.getItem('cf_gato_tx')  || '[]');
    perfil       = JSON.parse(localStorage.getItem('cf_perfil')   || '{"nome":"","email":""}');
    const preds  = JSON.parse(localStorage.getItem('cf_predictor')|| '[]');
    window.predictorItems = preds.map(i=>({...i, lastDate:new Date(i.lastDate), nextDate:new Date(i.nextDate)}));
  } catch(e){}
}

/* ── INJETA IDs NOS ELEMENTOS ESTÁTICOS DO HTML ── */
function injectIds() {
  // Últimas Transações (Home)
  document.querySelectorAll('#screen-home .section').forEach(sec => {
    if (sec.querySelector('.sec-title')?.textContent.includes('Últimas')) {
      if (!document.getElementById('tx-list')) {
        const list = document.createElement('div'); list.id = 'tx-list';
        sec.appendChild(list);
        sec.querySelector('.empty')?.setAttribute('id','tx-empty-state');
      }
    }
  });

  // Metas Ativas (Planejamento)
  document.querySelectorAll('#screen-planejamento .section').forEach(sec => {
    if (sec.querySelector('.sec-title')?.textContent.includes('Metas')) {
      if (!document.getElementById('metas-list')) {
        const list = document.createElement('div'); list.id = 'metas-list';
        sec.appendChild(list);
        const emptyEl = sec.querySelector('.empty');
        if (emptyEl) emptyEl.id = 'metas-empty-state';
        const pill = sec.querySelector('.pill.gray');
        if (pill) pill.id = 'metas-count-pill';
      }
    }
  });

  // Lançamentos de Gatos
  document.querySelectorAll('#screen-gatos .section').forEach(sec => {
    if (sec.querySelector('.sec-title')?.textContent.includes('Lançamentos')) {
      if (!document.getElementById('gato-tx-list')) {
        const list = document.createElement('div'); list.id = 'gato-tx-list';
        sec.appendChild(list);
        const emptyEl = sec.querySelector('.empty');
        if (emptyEl) emptyEl.id = 'gato-empty-state';
      }
    }
  });
}

/* ── OVERRIDE saveTx ── */
window.saveTx = function(msg) {
  const map = {
    'despesa':      saveDespesa,
    'receita':      saveReceita,
    'meta':         saveMeta,
    'gato-despesa': saveGatoDespesa,
    'edit-perfil':  savePerfil,
  };
  const fn = map[currentModal];
  if (fn) fn();
  else { closeModal(); setTimeout(()=>showToast(msg),300); }
};

/* ── OVERRIDE openModal ── */
const _origOpen = window.openModal;
window.openModal = function(type) {
  currentModal = type;
  _origOpen(type);
  if (type==='edit-perfil') {
    setTimeout(()=>{
      const inputs = document.querySelectorAll('#modal-body .form-input');
      if(inputs[0]&&perfil.nome)  inputs[0].value=perfil.nome;
      if(inputs[1]&&perfil.email) inputs[1].value=perfil.email;
    },60);
  }
};

/* ── FUNÇÕES DE SALVAR ── */
function saveDespesa() {
  const inputs = document.querySelectorAll('#modal-body .form-input');
  const valor  = parseFloat(inputs[0]?.value)||0;
  const desc   = inputs[1]?.value?.trim()||'';
  const cat    = inputs[2]?.value||'Outros';
  const pag    = inputs[3]?.value||'';
  const data   = inputs[4]?.value||new Date().toISOString().split('T')[0];
  if(!valor){showToast('Preencha o valor');return;}
  transactions.push({type:'Despesa',valor,desc,categoria:cat,pagamento:pag,data});
  saveData(); updateBalances(); closeModal();
  setTimeout(()=>showToast('Despesa salva!'),300);
}

function saveReceita() {
  const inputs = document.querySelectorAll('#modal-body .form-input');
  const valor  = parseFloat(inputs[0]?.value)||0;
  const desc   = inputs[1]?.value?.trim()||'';
  const tipo   = inputs[2]?.value||'Outro';
  const data   = inputs[3]?.value||new Date().toISOString().split('T')[0];
  if(!valor){showToast('Preencha o valor');return;}
  transactions.push({type:'Receita',valor,desc,categoria:tipo,data});
  saveData(); updateBalances(); closeModal();
  setTimeout(()=>showToast('Receita salva!'),300);
}

function saveMeta() {
  const inputs   = document.querySelectorAll('#modal-body .form-input');
  const nome     = inputs[0]?.value?.trim()||'';
  const objetivo = parseFloat(inputs[1]?.value)||0;
  const contrib  = parseFloat(inputs[2]?.value)||0;
  const prazo    = inputs[3]?.value||'';
  if(!nome||!objetivo){showToast('Preencha nome e valor objetivo');return;}
  metas.push({nome,objetivo,contribuicao:contrib,prazo,atual:0});
  saveData(); renderMetas(); closeModal();
  setTimeout(()=>showToast('Meta criada!'),300);
}

function saveGatoDespesa() {
  const inputs = document.querySelectorAll('#modal-body .form-input');
  const valor  = parseFloat(inputs[0]?.value)||0;
  const desc   = inputs[1]?.value?.trim()||'';
  const cat    = inputs[2]?.value||'Outro';
  const gato   = inputs[3]?.value?.trim()||'';
  const data   = inputs[4]?.value||new Date().toISOString().split('T')[0];
  if(!valor){showToast('Preencha o valor');return;}
  gatoTx.push({valor,desc,categoria:cat,gato,data});
  transactions.push({type:'Despesa',valor,desc:desc||cat,categoria:'Gatos 🐾',pagamento:'',data});
  saveData(); updateBalances(); closeModal();
  setTimeout(()=>showToast('Gasto registrado! 🐾'),300);
}

function savePerfil() {
  const inputs = document.querySelectorAll('#modal-body .form-input');
  perfil.nome  = inputs[0]?.value?.trim()||perfil.nome;
  perfil.email = inputs[1]?.value?.trim()||perfil.email;
  saveData(); updatePerfilUI(); closeModal();
  setTimeout(()=>showToast('Perfil atualizado!'),300);
}

/* ── SALDOS ── */
function updateBalances() {
  const receitas = transactions.filter(t=>t.type==='Receita').reduce((s,t)=>s+t.valor,0);
  const despesas = transactions.filter(t=>t.type==='Despesa').reduce((s,t)=>s+t.valor,0);
  const saldo    = receitas - despesas;

  function setEl(id,v){
    const el=document.getElementById(id);
    if(!el)return;
    el.dataset.real=FMT(v);
    if(!window.hidden) el.textContent=FMT(v);
  }
  setEl('bal-main',saldo);
  setEl('bal-rec', receitas);
  setEl('bal-dep', despesas);

  // Gatos total
  const totalGatos = gatoTx.reduce((s,t)=>s+t.valor,0);
  const elGatos = document.getElementById('cat-spent');
  if(elGatos){elGatos.dataset.real=FMT(totalGatos); if(!window.hidden) elGatos.textContent=FMT(totalGatos);}

  renderTxList();
  renderMetas();
  renderGatoTx();
  updateGatoCategorias();
  updateHistorico();
  updatePieChart();
}

/* ── ÚLTIMAS TRANSAÇÕES (Home) ── */
function renderTxList() {
  const list  = document.getElementById('tx-list');
  const empty = document.getElementById('tx-empty-state');
  if(!list) return;
  if(transactions.length===0){
    list.innerHTML='';
    if(empty) empty.style.display='';
    return;
  }
  if(empty) empty.style.display='none';
  list.innerHTML=[...transactions].reverse().slice(0,10).map(t=>{
    const isRec = t.type==='Receita';
    const cor   = isRec?'var(--yellow)':'var(--danger)';
    const sinal = isRec?'+':'-';
    const d     = t.data?new Date(t.data+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}):'';
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-size:14px;font-weight:600;color:var(--white)">${t.desc||t.categoria}</div>
        <div style="font-size:12px;color:var(--gray)">${t.categoria}${d?' · '+d:''}</div>
      </div>
      <div style="font-size:15px;font-weight:800;color:${cor}">${sinal} ${FMT(t.valor)}</div>
    </div>`;
  }).join('');
}

/* ── METAS ── */
function renderMetas() {
  const list  = document.getElementById('metas-list');
  const empty = document.getElementById('metas-empty-state');
  const pill  = document.getElementById('metas-count-pill');
  if(!list) return;
  if(pill) pill.textContent = metas.length+' meta'+(metas.length!==1?'s':'');
  if(metas.length===0){
    list.innerHTML='';
    if(empty) empty.style.display='';
    return;
  }
  if(empty) empty.style.display='none';
  list.innerHTML=metas.map((m,idx)=>{
    const pct=m.objetivo>0?Math.min(100,Math.round((m.atual/m.objetivo)*100)):0;
    return `<div style="background:var(--card);border-radius:var(--radius);padding:16px;border:1px solid var(--border);margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:15px;font-weight:700;color:var(--white)">${m.nome}</div>
        <div style="font-size:13px;color:var(--yellow);font-weight:700">${pct}%</div>
      </div>
      <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;margin-bottom:8px">
        <div style="height:100%;width:${pct}%;background:var(--yellow);border-radius:3px"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--gray)">
        <span>${FMT(m.atual)} economizados</span><span>Meta: ${FMT(m.objetivo)}</span>
      </div>
      ${m.prazo?`<div style="font-size:11px;color:var(--gray);margin-top:4px">Prazo: ${m.prazo}</div>`:''}
      <div style="margin-top:10px;display:flex;gap:8px">
        <button onclick="abonarMeta(${idx})" style="flex:1;padding:8px;border-radius:8px;border:1px solid var(--yellow);background:transparent;color:var(--yellow);font-size:12px;font-weight:700;cursor:pointer">+ Abonar</button>
        <button onclick="deleteMeta(${idx})" style="padding:8px 14px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--gray);font-size:12px;cursor:pointer">✕</button>
      </div>
    </div>`;
  }).join('');
}

window.abonarMeta = function(idx){
  const val=parseFloat(prompt('Valor a abonar (R$):')||'0');
  if(!val||val<=0)return;
  metas[idx].atual=(metas[idx].atual||0)+val;
  saveData(); renderMetas();
};
window.deleteMeta = function(idx){
  if(!confirm('Remover esta meta?'))return;
  metas.splice(idx,1); saveData(); renderMetas();
};

/* ── GATOS LANÇAMENTOS ── */
function renderGatoTx() {
  const list  = document.getElementById('gato-tx-list');
  const empty = document.getElementById('gato-empty-state');
  if(!list) return;
  if(gatoTx.length===0){
    list.innerHTML='';
    if(empty) empty.style.display='';
    return;
  }
  if(empty) empty.style.display='none';
  list.innerHTML=[...gatoTx].reverse().slice(0,20).map(t=>{
    const d=t.data?new Date(t.data+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}):'';
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-size:14px;font-weight:600;color:var(--white)">${t.desc||t.categoria}${t.gato?' · '+t.gato:''}</div>
        <div style="font-size:12px;color:var(--gray)">${t.categoria}${d?' · '+d:''}</div>
      </div>
      <div style="font-size:15px;font-weight:800;color:var(--danger)">- ${FMT(t.valor)}</div>
    </div>`;
  }).join('');
}

/* ── GATOS CATEGORIAS ── */
function updateGatoCategorias() {
  const cats = ['Ração','Veterinário','Petisco','Acessórios','Higiene','Medicamentos'];
  cats.forEach(cat=>{
    const total = gatoTx.filter(t=>t.categoria===cat).reduce((s,t)=>s+t.valor,0);
    document.querySelectorAll('#screen-gatos .cat-name').forEach(el=>{
      if(el.textContent===cat){
        const valEl = el.closest('.cat-item')?.querySelector('.cat-val');
        if(valEl) valEl.textContent = total>0?FMT(total):'R$ —';
      }
    });
  });
}

/* ── GRÁFICO PIZZA (atualizar com dados reais) ── */
function updatePieChart() {
  if(!window.pieChart) return;
  const catMap = {
    'Alimentação':0,'Moradia':1,'Autocuidado':2,'Gatos 🐾':3,'Transporte':4
  };
  const data = [0,0,0,0,0,0]; // ordem: Alimentação,Moradia,Autocuidado,Gatos,Transporte,Outros
  transactions.filter(t=>t.type==='Despesa').forEach(t=>{
    const idx = catMap[t.categoria];
    if(idx!==undefined) data[idx]+=t.valor;
    else data[5]+=t.valor;
  });
  window.pieChart.data.datasets[0].data = data;
  window.pieChart.update();
}

/* ── HISTÓRICO (mês atual aparece por último) ── */
const _origBuildHistorico = window.buildHistorico;
window.buildHistorico = function() {
  const list      = document.getElementById('hist-list');
  const yearBadge = document.getElementById('hist-year-badge');
  if(!list) return;
  const now = new Date();
  if(yearBadge) yearBadge.textContent = now.getFullYear();
  list.innerHTML='';
  const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  // Gera do mais antigo (11 meses atrás) até o atual (i=0 por último)
  for(let i=11;i>=0;i--){
    const d = new Date(now.getFullYear(),now.getMonth()-i,1);
    const isCurrent = i===0;
    const card = document.createElement('div');
    card.className='hist-card'+(isCurrent?' current':'');
    card.innerHTML=`
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div class="hist-month">${MONTHS[d.getMonth()]}</div>
          <div class="hist-year">${d.getFullYear()}</div>
        </div>
        ${isCurrent?'<span class="pill yel">Mês atual</span>':''}
      </div>
      <div style="border-top:1px solid var(--border);margin:10px 0"></div>
      <div class="hist-row"><span>Receitas</span><strong style="color:var(--yellow)">R$ —</strong></div>
      <div class="hist-row" style="margin-top:4px"><span>Despesas</span><strong style="color:var(--danger)">R$ —</strong></div>
      <div class="hist-balance ${isCurrent?'pos':''}">R$ —</div>`;
    list.appendChild(card);
  }
  // Scroll para o mês atual (último)
  setTimeout(()=>{ list.lastElementChild?.scrollIntoView({block:'nearest'}); },200);
};

function updateHistorico() {
  const cards = [...document.querySelectorAll('.hist-card')];
  const now   = new Date();
  // Cards foram gerados do mais antigo (index 0) ao atual (index 11)
  cards.forEach((card,i)=>{
    // i=0 é 11 meses atrás, i=11 é o atual
    const monthsAgo = 11 - i;
    const d = new Date(now.getFullYear(),now.getMonth()-monthsAgo,1);
    const monthTx = transactions.filter(t=>{
      if(!t.data) return false;
      const td = new Date(t.data+'T12:00:00');
      return td.getMonth()===d.getMonth()&&td.getFullYear()===d.getFullYear();
    });
    const rec = monthTx.filter(t=>t.type==='Receita').reduce((s,t)=>s+t.valor,0);
    const dep = monthTx.filter(t=>t.type==='Despesa').reduce((s,t)=>s+t.valor,0);
    const bal = rec-dep;
    const rows = card.querySelectorAll('.hist-row strong');
    if(rows[0]) rows[0].textContent=rec>0?FMT(rec):'R$ —';
    if(rows[1]) rows[1].textContent=dep>0?FMT(dep):'R$ —';
    const balEl = card.querySelector('.hist-balance');
    if(balEl){
      balEl.textContent=(rec>0||dep>0)?FMT(bal):'R$ —';
      balEl.className='hist-balance '+(bal>=0?'pos':'neg');
    }
  });
}

/* ── PERFIL ── */
function updatePerfilUI() {
  if(perfil.nome){
    document.querySelectorAll('[id*="perfil-nome"],.perfil-nome').forEach(el=>el.textContent=perfil.nome);
  }
  if(perfil.email){
    document.querySelectorAll('[id*="perfil-email"],.perfil-email').forEach(el=>el.textContent=perfil.email);
  }
}

/* ── PREDICTOR — salvar ao adicionar ── */
const _origAdd = window.addPreditorItem;
window.addPreditorItem = function(...a){_origAdd?.(...a); saveData();};
const _origUpd = window.updateItemInterval;
window.updateItemInterval = function(...a){_origUpd?.(...a); saveData();};

/* ── INIT ── */
document.addEventListener('DOMContentLoaded',()=>{
  loadData();
  // Espera o splash terminar (~3.5s) para aplicar dados na UI
  setTimeout(()=>{
    injectIds();
    buildHistorico(); // versão corrigida (mês atual por último)
    updateBalances();
    if(window.renderPreditorItems) renderPreditorItems();
    updatePerfilUI();
  }, 3600);
});
