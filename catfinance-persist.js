/* ══════════════════════════════════════════════════
   Cat Finance — Persistência com localStorage
   Adicione ANTES de </body> no index.html:
   <script src="catfinance-persist.js"></script>
════════════════════════════════════════════════════ */

/* ── DADOS ── */
let transactions = [];
let metas        = [];
let gatoTx       = [];
let perfil       = { nome: '', email: '' };

const FMT = v => 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── LOCALSTORAGE ── */
function saveData() {
  try {
    localStorage.setItem('cf_tx',      JSON.stringify(transactions));
    localStorage.setItem('cf_metas',   JSON.stringify(metas));
    localStorage.setItem('cf_gato_tx', JSON.stringify(gatoTx));
    localStorage.setItem('cf_perfil',  JSON.stringify(perfil));
    // Predictor items: convert Dates to ISO strings
    const preds = (window.predictorItems || []).map(i => ({
      ...i,
      lastDate: i.lastDate instanceof Date ? i.lastDate.toISOString() : i.lastDate,
      nextDate: i.nextDate instanceof Date ? i.nextDate.toISOString() : i.nextDate
    }));
    localStorage.setItem('cf_predictor', JSON.stringify(preds));
  } catch(e) { console.warn('localStorage save error', e); }
}

function loadData() {
  try {
    transactions = JSON.parse(localStorage.getItem('cf_tx')      || '[]');
    metas        = JSON.parse(localStorage.getItem('cf_metas')   || '[]');
    gatoTx       = JSON.parse(localStorage.getItem('cf_gato_tx') || '[]');
    perfil       = JSON.parse(localStorage.getItem('cf_perfil')  || '{"nome":"","email":""}');
    const preds  = JSON.parse(localStorage.getItem('cf_predictor') || '[]');
    window.predictorItems = preds.map(i => ({
      ...i,
      lastDate: new Date(i.lastDate),
      nextDate: new Date(i.nextDate)
    }));
  } catch(e) { console.warn('localStorage load error', e); }
}

/* ── SALDOS ── */
function updateBalances() {
  const receitas = transactions.filter(t => t.type === 'Receita').reduce((s, t) => s + t.valor, 0);
  const despesas = transactions.filter(t => t.type === 'Despesa').reduce((s, t) => s + t.valor, 0);
  const saldo    = receitas - despesas;

  function setEl(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.dataset.real = FMT(value);
    if (!(window.hidden)) el.textContent = FMT(value);
  }
  setEl('bal-main', saldo);
  setEl('bal-rec',  receitas);
  setEl('bal-dep',  despesas);

  // Atualizar total gatos
  const totalGatos = gatoTx.reduce((s, t) => s + t.valor, 0);
  const elGatos = document.getElementById('gato-spent');
  if (elGatos) { elGatos.dataset.real = FMT(totalGatos); if(!window.hidden) elGatos.textContent = FMT(totalGatos); }

  renderTxList();
  renderGatoTx();
  renderMetas();
  updateHistorico();
}

/* ── LISTA DE LANÇAMENTOS ── */
function renderTxList() {
  const container = document.getElementById('tx-list');
  if (!container) return;
  if (transactions.length === 0) { container.innerHTML = ''; return; }
  const recent = [...transactions].reverse().slice(0, 30);
  container.innerHTML = recent.map(t => {
    const isRec = t.type === 'Receita';
    const sinal = isRec ? '+' : '-';
    const cor   = isRec ? 'var(--yellow)' : 'var(--danger)';
    const d     = t.data ? new Date(t.data + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' }) : '';
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-size:14px;font-weight:600;color:var(--white)">${t.desc || t.categoria}</div>
        <div style="font-size:12px;color:var(--gray)">${t.categoria}${d ? ' · ' + d : ''}</div>
      </div>
      <div style="font-size:15px;font-weight:800;color:${cor}">${sinal} ${FMT(t.valor)}</div>
    </div>`;
  }).join('');
}

/* ── GASTOS COM GATOS ── */
function renderGatoTx() {
  const container = document.getElementById('gato-tx-list');
  if (!container) return;
  if (gatoTx.length === 0) { container.innerHTML = '<div style="color:var(--gray);font-size:13px;text-align:center;padding:16px 0">Nenhum lançamento ainda</div>'; return; }
  const recent = [...gatoTx].reverse().slice(0, 20);
  container.innerHTML = recent.map(t => {
    const d = t.data ? new Date(t.data + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' }) : '';
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-size:14px;font-weight:600;color:var(--white)">${t.desc || t.categoria}${t.gato ? ' · ' + t.gato : ''}</div>
        <div style="font-size:12px;color:var(--gray)">${t.categoria}${d ? ' · ' + d : ''}</div>
      </div>
      <div style="font-size:15px;font-weight:800;color:var(--danger)">- ${FMT(t.valor)}</div>
    </div>`;
  }).join('');
}

/* ── METAS ── */
function renderMetas() {
  const container = document.getElementById('metas-list');
  if (!container) return;
  if (metas.length === 0) { container.innerHTML = ''; return; }
  container.innerHTML = metas.map((m, idx) => {
    const pct = m.objetivo > 0 ? Math.min(100, Math.round((m.atual / m.objetivo) * 100)) : 0;
    return `<div style="background:var(--card);border-radius:var(--radius);padding:16px;border:1px solid var(--border);margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:15px;font-weight:700;color:var(--white)">${m.nome}</div>
        <div style="font-size:13px;color:var(--yellow);font-weight:700">${pct}%</div>
      </div>
      <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;margin-bottom:8px">
        <div style="height:100%;width:${pct}%;background:var(--yellow);border-radius:3px;transition:.4s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--gray)">
        <span>${FMT(m.atual)} economizados</span>
        <span>Meta: ${FMT(m.objetivo)}</span>
      </div>
      ${m.prazo ? `<div style="font-size:11px;color:var(--gray);margin-top:4px">Prazo: ${m.prazo}</div>` : ''}
      <div style="margin-top:10px;display:flex;gap:8px">
        <button onclick="abonarMeta(${idx})" style="flex:1;padding:8px;border-radius:8px;border:1px solid var(--yellow);background:transparent;color:var(--yellow);font-size:12px;font-weight:700;cursor:pointer">+ Abonar</button>
        <button onclick="deleteMeta(${idx})" style="padding:8px 14px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--gray);font-size:12px;cursor:pointer">✕</button>
      </div>
    </div>`;
  }).join('');
}

function abonarMeta(idx) {
  const val = parseFloat(prompt('Valor a abonar (R$):') || '0');
  if (!val || val <= 0) return;
  metas[idx].atual = (metas[idx].atual || 0) + val;
  saveData();
  renderMetas();
}

function deleteMeta(idx) {
  if (!confirm('Remover esta meta?')) return;
  metas.splice(idx, 1);
  saveData();
  renderMetas();
}

/* ── HISTÓRICO ── */
function updateHistorico() {
  const cards = document.querySelectorAll('.hist-card');
  const MONTHS_LIST = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const now = new Date();
  cards.forEach((card, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthTx = transactions.filter(t => {
      if (!t.data) return false;
      const td = new Date(t.data + 'T12:00:00');
      return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
    });
    const rec = monthTx.filter(t => t.type === 'Receita').reduce((s, t) => s + t.valor, 0);
    const dep = monthTx.filter(t => t.type === 'Despesa').reduce((s, t) => s + t.valor, 0);
    const bal = rec - dep;
    const rowEls = card.querySelectorAll('.hist-row strong');
    if (rowEls[0]) rowEls[0].textContent = rec > 0 ? FMT(rec) : 'R$ —';
    if (rowEls[1]) rowEls[1].textContent = dep > 0 ? FMT(dep) : 'R$ —';
    const balEl = card.querySelector('.hist-balance');
    if (balEl) {
      balEl.textContent = (rec > 0 || dep > 0) ? FMT(bal) : 'R$ —';
      balEl.className = 'hist-balance ' + (bal >= 0 ? 'pos' : 'neg');
    }
  });
}

/* ── PERFIL UI ── */
function updatePerfilUI() {
  if (perfil.nome) {
    document.querySelectorAll('[data-perfil-nome]').forEach(el => el.textContent = perfil.nome);
    const nomeEls = document.querySelectorAll('#perfil-nome-display, .perfil-nome');
    nomeEls.forEach(el => el.textContent = perfil.nome);
  }
  if (perfil.email) {
    document.querySelectorAll('#perfil-email-display, .perfil-email').forEach(el => el.textContent = perfil.email);
  }
}

/* ── FUNÇÕES DE SALVAR (substituem saveTx) ── */
function saveDespesa() {
  const inputs = document.querySelectorAll('#modal-body .form-input');
  const valor  = parseFloat(inputs[0]?.value) || 0;
  const desc   = inputs[1]?.value?.trim() || '';
  const cat    = inputs[2]?.value || 'Outros';
  const pag    = inputs[3]?.value || '';
  const data   = inputs[4]?.value || new Date().toISOString().split('T')[0];
  if (!valor) { showToast('Preencha o valor'); return; }
  transactions.push({ type: 'Despesa', valor, desc, categoria: cat, pagamento: pag, data });
  saveData();
  updateBalances();
  closeModal();
  setTimeout(() => showToast('Despesa salva!'), 300);
}

function saveReceita() {
  const inputs = document.querySelectorAll('#modal-body .form-input');
  const valor  = parseFloat(inputs[0]?.value) || 0;
  const desc   = inputs[1]?.value?.trim() || '';
  const tipo   = inputs[2]?.value || 'Outro';
  const data   = inputs[3]?.value || new Date().toISOString().split('T')[0];
  if (!valor) { showToast('Preencha o valor'); return; }
  transactions.push({ type: 'Receita', valor, desc, categoria: tipo, data });
  saveData();
  updateBalances();
  closeModal();
  setTimeout(() => showToast('Receita salva!'), 300);
}

function saveMeta() {
  const inputs  = document.querySelectorAll('#modal-body .form-input');
  const nome    = inputs[0]?.value?.trim() || '';
  const objetivo = parseFloat(inputs[1]?.value) || 0;
  const contrib  = parseFloat(inputs[2]?.value) || 0;
  const prazo    = inputs[3]?.value || '';
  if (!nome || !objetivo) { showToast('Preencha nome e valor objetivo'); return; }
  metas.push({ nome, objetivo, contribuicao: contrib, prazo, atual: 0 });
  saveData();
  renderMetas();
  closeModal();
  setTimeout(() => showToast('Meta criada!'), 300);
}

function saveGatoDespesa() {
  const inputs = document.querySelectorAll('#modal-body .form-input');
  const valor  = parseFloat(inputs[0]?.value) || 0;
  const desc   = inputs[1]?.value?.trim() || '';
  const cat    = inputs[2]?.value || 'Outro';
  const gato   = inputs[3]?.value?.trim() || '';
  const data   = inputs[4]?.value || new Date().toISOString().split('T')[0];
  if (!valor) { showToast('Preencha o valor'); return; }
  gatoTx.push({ valor, desc, categoria: cat, gato, data });
  transactions.push({ type: 'Despesa', valor, desc: desc || cat, categoria: 'Gatos 🐾', pagamento: '', data });
  saveData();
  updateBalances();
  closeModal();
  setTimeout(() => showToast('Gasto registrado! 🐾'), 300);
}

function savePerfil() {
  const inputs = document.querySelectorAll('#modal-body .form-input');
  perfil.nome  = inputs[0]?.value?.trim() || perfil.nome;
  perfil.email = inputs[1]?.value?.trim() || perfil.email;
  saveData();
  updatePerfilUI();
  closeModal();
  setTimeout(() => showToast('Perfil atualizado!'), 300);
}

/* ── Patch: interceptar openModal para trocar botões ── */
const _origOpenModal = window.openModal;
window.openModal = function(type) {
  _origOpenModal(type);
  // Corrigir botões após renderização
  setTimeout(() => {
    const body = document.getElementById('modal-body');
    if (!body) return;
    // Preencher perfil com dados salvos
    if (type === 'edit-perfil') {
      const inputs = body.querySelectorAll('.form-input');
      if (inputs[0] && perfil.nome)  inputs[0].value = perfil.nome;
      if (inputs[1] && perfil.email) inputs[1].value = perfil.email;
    }
    // Substituir botões
    const btn = body.querySelector('.btn-primary');
    if (!btn) return;
    const map = {
      'despesa':      saveDespesa,
      'receita':      saveReceita,
      'meta':         saveMeta,
      'gato-despesa': saveGatoDespesa,
      'edit-perfil':  savePerfil,
    };
    if (map[type]) {
      const newBtn = btn.cloneNode(true);
      newBtn.onclick = map[type];
      btn.replaceWith(newBtn);
    }
  }, 50);
};

/* Patch: salvar predictor também */
const _origAddPred = window.addPreditorItem;
window.addPreditorItem = function(...args) {
  _origAddPred?.(...args);
  saveData();
};
const _origUpdateInterval = window.updateItemInterval;
window.updateItemInterval = function(...args) {
  _origUpdateInterval?.(...args);
  saveData();
};

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  // Esperar app iniciar para aplicar dados
  setTimeout(() => {
    updateBalances();
    if (window.renderPreditorItems) renderPreditorItems();
    updatePerfilUI();
  }, 3500); // após splash
});
