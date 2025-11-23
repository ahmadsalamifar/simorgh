import { api } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { parseLocaleNumber, openModal, closeModal } from './utils.js';
import * as UI from './formulas_ui.js';

export function setupFormulas(refreshCallback) {
    // --- مرحله ۱: تولید و تزریق HTML ---
    UI.initFormulaUI();

    // --- مرحله ۲: اتصال رویدادها (بعد از اینکه المنت‌ها ساخته شدند) ---
    
    // مدیریت مدال
    const btnNew = document.getElementById('btn-open-new-formula');
    if (btnNew) btnNew.onclick = () => openModal('new-formula-modal');
    
    const btnCancel = document.getElementById('btn-cancel-formula');
    if (btnCancel) btnCancel.onclick = () => closeModal('new-formula-modal');
    
    const btnCreate = document.getElementById('btn-create-formula');
    if (btnCreate) btnCreate.onclick = () => createFormula(refreshCallback);
    
    const searchEl = document.getElementById('search-formulas');
    if (searchEl) searchEl.oninput = (e) => UI.renderFormulaList(e.target.value);
    
    const formAdd = document.getElementById('form-add-comp');
    if (formAdd) formAdd.onsubmit = (e) => { e.preventDefault(); addComp(refreshCallback); };
    
    ['labor', 'overhead', 'profit'].forEach(key => {
        const input = document.getElementById('inp-' + key);
        if (input) input.onchange = (e) => updateCostVariables(key, e.target.value, refreshCallback);
    });
    
    const filterSel = document.getElementById('comp-filter');
    if (filterSel) filterSel.onchange = UI.updateCompSelect;
    
    const compSel = document.getElementById('comp-select');
    if (compSel) compSel.onchange = UI.updateCompUnitSelect;
    
    const masterList = document.getElementById('formula-master-list');
    if (masterList) masterList.addEventListener('click', (e) => {
        const item = e.target.closest('[data-id]');
        if (item) selectFormula(item.getAttribute('data-id'), refreshCallback);
    });
    
    const compsList = document.getElementById('formula-comps-list');
    if (compsList) compsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-del-comp')) {
            const idx = parseInt(e.target.getAttribute('data-idx'));
            removeComp(state.activeFormulaId, idx, refreshCallback);
        }
    });
    
    const btnDup = document.getElementById('btn-duplicate-formula');
    if (btnDup) btnDup.onclick = () => duplicateFormula(refreshCallback);
    
    const nameHeader = document.getElementById('active-formula-name');
    if (nameHeader) nameHeader.onclick = () => renameFormula(refreshCallback);
    
    const btnDel = document.getElementById('btn-delete-formula');
    if (btnDel) btnDel.onclick = () => deleteFormula(refreshCallback);
}

export { renderFormulaList, renderFormulaDetail, updateDropdowns, updateCompSelect } from './formulas_ui.js';

export function selectFormula(id, refreshCallback) {
    state.activeFormulaId = id;
    UI.renderFormulaList(); 
    
    document.getElementById('formula-detail-empty')?.classList.add('hidden');
    const view = document.getElementById('formula-detail-view');
    if (view) { view.classList.remove('hidden'); view.classList.add('flex'); }
    
    const f = state.formulas.find(x => x.$id === id);
    if (f) UI.renderFormulaDetail(f);
    
    if (window.innerWidth < 1024) document.getElementById('detail-panel')?.scrollIntoView({ behavior: 'smooth' });
}

async function createFormula(cb) {
    const nameInput = document.getElementById('new-formula-name');
    const name = nameInput?.value;
    if (!name) return alert("لطفا نام محصول را وارد کنید");
    try {
        await api.create(APPWRITE_CONFIG.COLS.FORMS, {
            name, components: '[]', labor: 0.0, overhead: 0.0, profit: 0.0, is_public: false
        });
        closeModal('new-formula-modal'); nameInput.value = ''; cb(); 
    } catch(e) { alert(e.message); }
}

async function addComp(refreshCb) {
    if (!state.activeFormulaId) return;
    const val = document.getElementById('comp-select').value;
    const qty = parseFloat(document.getElementById('comp-qty').value);
    const unit = document.getElementById('comp-unit-select').value;
    
    if (!val || !qty || isNaN(qty)) { alert('لطفا کالا و تعداد معتبر وارد کنید'); return; }
    
    const [typePrefix, id] = val.split(':');
    const type = typePrefix === 'MAT' ? 'mat' : 'form';
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    
    let comps = [];
    try { comps = typeof f.components === 'string' ? JSON.parse(f.components) : f.components; } catch(e){}
    if (!Array.isArray(comps)) comps = [];
    
    const exist = comps.find(c => c.id === id && c.type === type && c.unit === unit);
    if (exist) exist.qty += qty; else comps.push({ id, type, qty, unit });
    
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { components: JSON.stringify(comps) });
        document.getElementById('comp-qty').value = '';
        f.components = comps; UI.renderFormulaDetail(f); refreshCb(); 
    } catch(e) { alert("خطا در ذخیره: " + e.message); }
}

async function removeComp(formulaId, idx, cb) {
    const f = state.formulas.find(x => x.$id === formulaId);
    if (!f) return;
    let comps = Array.isArray(f.components) ? f.components : JSON.parse(f.components || '[]');
    comps.splice(idx, 1);
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, f.$id, { components: JSON.stringify(comps) });
        f.components = comps; UI.renderFormulaDetail(f); cb();
    } catch(e) { alert(e.message); }
}

async function updateCostVariables(key, val, cb) {
    if (!state.activeFormulaId) return;
    const numVal = parseLocaleNumber(val);
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { [key]: numVal });
        const f = state.formulas.find(x => x.$id === state.activeFormulaId);
        if (f) { f[key] = numVal; UI.renderFormulaDetail(f); cb(); }
    } catch(e) { console.error(e); }
}

async function duplicateFormula(cb) {
    if (!state.activeFormulaId) return;
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    if (!confirm('کپی از این فرمول ایجاد شود؟')) return;
    try {
        const compsStr = typeof f.components === 'string' ? f.components : JSON.stringify(f.components);
        await api.create(APPWRITE_CONFIG.COLS.FORMS, { 
            name: "کپی " + f.name, components: compsStr, labor: f.labor, overhead: f.overhead, profit: f.profit, is_public: false 
        });
        alert('کپی ایجاد شد'); cb(); 
    } catch(e) { alert(e.message); }
}

async function renameFormula(cb) {
    const el = document.getElementById('active-formula-name');
    const cur = el.innerText;
    const n = prompt('نام جدید:', cur);
    if (n && n !== cur) { try { await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { name: n }); cb(); } catch(e) { alert(e.message); } }
}

async function deleteFormula(cb) {
    if (confirm('این فرمول حذف شود؟')) {
        try { 
            await api.delete(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId); 
            state.activeFormulaId = null; 
            document.getElementById('formula-detail-view').classList.add('hidden'); 
            document.getElementById('formula-detail-view').classList.remove('flex');
            document.getElementById('formula-detail-empty').classList.remove('hidden'); 
            cb(); 
        } catch(e) { alert(e.message); }
    }
}