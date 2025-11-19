import { account, state, APPWRITE_CONFIG } from './config.js';
import { fetchAllData, api } from './api.js';

// === STARTUP ===
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Auth
        try { await account.get(); } catch { await account.createAnonymousSession(); }
        
        // 2. Data
        await fetchAllData();
        
        // 3. UI Init
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        switchTab('formulas');
        setupEvents();
        updateUI();
        
    } catch (err) {
        document.getElementById('loading-text').innerText = "خطا: " + err.message;
        document.getElementById('loading-text').style.color = "red";
    }
});

// === EVENTS ===
function setupEvents() {
    // Tabs
    document.getElementById('btn-tab-formulas').onclick = () => switchTab('formulas');
    document.getElementById('btn-tab-materials').onclick = () => switchTab('materials');
    document.getElementById('btn-tab-categories').onclick = () => switchTab('categories');
    document.getElementById('btn-open-store').onclick = () => switchTab('store');

    // Formula Actions
    document.getElementById('btn-open-new-formula').onclick = () => openModal('new-formula-modal');
    document.getElementById('btn-create-formula').onclick = createFormula;
    document.getElementById('btn-cancel-formula').onclick = () => closeModal('new-formula-modal');
    
    document.getElementById('btn-print').onclick = printFormula;
    document.getElementById('btn-close-print').onclick = () => closeModal('print-modal');
    
    // Search
    document.getElementById('search-formulas').oninput = (e) => renderFormulaList(e.target.value);
    document.getElementById('search-materials').oninput = (e) => renderMaterials(e.target.value);
    document.getElementById('sort-materials').onchange = () => renderMaterials();
    
    // Forms (prevent default submit)
    document.getElementById('material-form').onsubmit = (e) => { e.preventDefault(); saveMaterial(); };
    document.getElementById('mat-cancel-btn').onclick = resetMatForm;
    document.getElementById('category-form').onsubmit = (e) => { e.preventDefault(); addCategory(); };
    document.getElementById('form-add-comp').onsubmit = (e) => { e.preventDefault(); addComp(); };

    // Inputs logic
    document.getElementById('inp-labor').onchange = (e) => updateCost('labor', e.target.value);
    document.getElementById('inp-overhead').onchange = (e) => updateCost('overhead', e.target.value);
    document.getElementById('inp-profit').onchange = (e) => updateCost('profit', e.target.value);
    document.getElementById('active-formula-name').onclick = renameFormula;
    document.getElementById('btn-delete-formula').onclick = deleteFormula;
    document.getElementById('comp-filter').onchange = updateCompSelect;
}

// === LOGIC FUNCTIONS ===
async function createFormula() {
    const name = document.getElementById('new-formula-name').value;
    if(!name) return;
    try {
        const res = await api.create(APPWRITE_CONFIG.COLS.FORMS, {
            name, components_json: '[]', labor: 0.0, overhead: 0.0, profit: 0.0, is_public: false
        });
        state.formulas.unshift(res);
        closeModal('new-formula-modal');
        document.getElementById('new-formula-name').value = '';
        selectFormula(res.$id);
    } catch(e) { alert(e.message); }
}

async function saveMaterial() {
    const id = document.getElementById('mat-id').value;
    const data = {
        name: document.getElementById('mat-name').value,
        unit: document.getElementById('mat-unit').value,
        price: parseFloat(document.getElementById('mat-price').value.replace(/,/g,'')) || 0,
        category_id: document.getElementById('mat-category').value || null
    };
    try {
        if(id) await api.update(APPWRITE_CONFIG.COLS.MATS, id, data);
        else await api.create(APPWRITE_CONFIG.COLS.MATS, data);
        resetMatForm();
        await fetchAllData(); updateUI();
    } catch(e){ alert(e.message); }
}

async function addCategory() {
    const name = document.getElementById('cat-name').value;
    if(!name) return;
    try {
        await api.create(APPWRITE_CONFIG.COLS.CATS, {name});
        document.getElementById('cat-name').value = '';
        await fetchAllData(); updateUI();
    } catch(e){ alert(e.message); }
}

// --- Rendering & UI ---
function updateUI() {
    renderFormulaList();
    renderMaterials();
    renderCategories();
    renderStore();
    updateDropdowns();
    
    if(state.activeFormulaId) {
        const f = state.formulas.find(x => x.$id === state.activeFormulaId);
        if(f) renderFormulaDetail(f);
        else {
            state.activeFormulaId = null;
            document.getElementById('formula-detail-view').classList.add('hidden');
            document.getElementById('formula-detail-empty').classList.remove('hidden');
        }
    }
}

function renderFormulaList(filter='') {
    const list = state.formulas.filter(f => f.name.includes(filter));
    const el = document.getElementById('formula-master-list');
    if(!list.length) { el.innerHTML = '<p class="text-center text-slate-400 text-xs mt-4">خالی</p>'; return; }
    
    el.innerHTML = list.map(f => `
        <div class="p-3 border-b border-slate-100 cursor-pointer hover:bg-teal-50 ${f.$id===state.activeFormulaId ? 'bg-teal-50 border-r-4 border-teal-600' : ''}" data-id="${f.$id}">
            <div class="font-bold text-xs text-slate-700 pointer-events-none">${f.name}</div>
            <div class="text-[10px] text-slate-400 mt-0.5 pointer-events-none">${new Date(f.$updatedAt).toLocaleDateString('fa-IR')}</div>
        </div>
    `).join('');
    
    Array.from(el.children).forEach(child => {
        child.onclick = () => selectFormula(child.dataset.id);
    });
}

function selectFormula(id) {
    state.activeFormulaId = id;
    renderFormulaList();
    document.getElementById('formula-detail-empty').classList.add('hidden');
    document.getElementById('formula-detail-view').classList.remove('hidden');
    document.getElementById('formula-detail-view').classList.add('flex');
    
    const f = state.formulas.find(x => x.$id === id);
    if(f) renderFormulaDetail(f);
    
    // Mobile scroll
    if(window.innerWidth < 1024) document.getElementById('detail-panel').scrollIntoView({behavior: 'smooth'});
}

function renderFormulaDetail(f) {
    const calc = calculateCost(f);
    const comps = JSON.parse(f.components_json || '[]');
    
    document.getElementById('active-formula-name').innerText = f.name;
    document.getElementById('inp-labor').value = formatPrice(f.labor);
    document.getElementById('inp-overhead').value = formatPrice(f.overhead);
    document.getElementById('inp-profit').value = f.profit;
    document.getElementById('lbl-final-price').innerText = formatPrice(calc.final);
    
    updateCompSelect();
    
    const el = document.getElementById('formula-comps-list');
    el.innerHTML = comps.map((c, idx) => {
        let name='-', unit='-', price=0, total=0;
        if(c.type==='mat') {
            const m = state.materials.find(x=>x.$id===c.id);
            name = m ? m.name : 'حذف شده';
            unit = m ? m.unit : '-';
            price = m ? m.price : 0;
        } else {
            const sub = state.formulas.find(x=>x.$id===c.id);
            name = sub ? '🔗 '+sub.name : 'حذف شده';
            unit = 'عدد';
            price = sub ? calculateCost(sub).final : 0;
        }
        total = price * c.qty;
        
        return `
        <div class="flex justify-between items-center p-3 text-sm border-b border-slate-50 hover:bg-slate-50">
            <div>
                <div class="font-bold text-slate-700 text-xs">${name}</div>
                <div class="text-[10px] text-slate-400 mt-0.5">${c.qty} ${unit} × ${formatPrice(price)}</div>
            </div>
            <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-slate-600 text-xs">${formatPrice(total)}</span>
                <button class="text-rose-400 px-2 btn-del-comp" data-idx="${idx}">×</button>
            </div>
        </div>`;
    }).join('');
    
    el.querySelectorAll('.btn-del-comp').forEach(b => {
        b.onclick = () => removeComp(f.$id, b.dataset.idx);
    });
}

// --- Recursive Cost ---
function calculateCost(f) {
    if(!f) return {matCost:0, sub:0, profit:0, final:0};
    let matCost=0; 
    const comps = JSON.parse(f.components_json || '[]');
    comps.forEach(c => {
        if(c.type==='mat') {
            const m = state.materials.find(x => x.$id === c.id);
            if(m) matCost += m.price * c.qty;
        } else {
            const sub = state.formulas.find(x => x.$id === c.id);
            if(sub) matCost += calculateCost(sub).final * c.qty;
        }
    });
    const sub = matCost + (f.labor||0) + (f.overhead||0);
    const profit = (f.profit||0)/100 * sub;
    return {matCost, sub, profit, final: sub+profit};
}

// --- Material & Categories Render ---
function renderMaterials(filter='') {
    const sort = document.getElementById('sort-materials').value;
    let list = state.materials.filter(m => m.name.includes(filter));
    list.sort((a,b) => sort==='date_desc' ? new Date(b.$updatedAt)-new Date(a.$updatedAt) : a.name.localeCompare(b.name));
    
    const el = document.getElementById('materials-container');
    if(!list.length) { el.innerHTML='<p class="col-span-full text-center text-slate-400 text-xs mt-4">خالی</p>'; return; }
    
    el.innerHTML = list.map(m => {
        const cat = state.categories.find(c => c.$id === m.category_id)?.name || '-';
        return `
        <div class="bg-white p-3 rounded-xl border border-slate-100 group relative">
            <div class="flex justify-between mb-1">
                <span class="text-[10px] bg-slate-50 px-1 rounded text-slate-400">${cat}</span>
                <div class="flex gap-1"><button class="text-amber-500 px-1 btn-edit-mat" data-id="${m.$id}">✎</button><button class="text-rose-500 px-1 btn-del-mat" data-id="${m.$id}">×</button></div>
            </div>
            <div class="font-bold text-xs text-slate-800 truncate">${m.name}</div>
            <div class="flex justify-between items-end mt-1">
                <span class="text-[10px] text-slate-400">${m.unit}</span>
                <span class="font-mono font-bold text-teal-700">${formatPrice(m.price)}</span>
            </div>
        </div>`;
    }).join('');
    
    el.querySelectorAll('.btn-edit-mat').forEach(b => b.onclick = () => editMat(b.dataset.id));
    el.querySelectorAll('.btn-del-mat').forEach(b => b.onclick = () => delItem(APPWRITE_CONFIG.COLS.MATS, b.dataset.id));
}

function renderCategories() {
    const el = document.getElementById('category-list');
    el.innerHTML = state.categories.map(c => `
        <div class="flex justify-between p-2 bg-slate-50 rounded border mb-1 text-xs">
            <span>${c.name}</span>
            <button class="text-rose-500 btn-del-cat" data-id="${c.$id}">🗑</button>
        </div>
    `).join('');
    el.querySelectorAll('.btn-del-cat').forEach(b => b.onclick = () => delItem(APPWRITE_CONFIG.COLS.CATS, b.dataset.id));
}

function renderStore() {
    const el = document.getElementById('store-container');
    if(!state.publicFormulas.length) { el.innerHTML = '<p class="col-span-full text-center text-slate-400">خالی</p>'; return; }
    el.innerHTML = state.publicFormulas.map(f => `
        <div class="bg-white p-3 rounded border text-center">
            <div class="font-bold mb-2">${f.name}</div>
            <button class="btn btn-secondary text-xs w-full btn-copy-store" data-id="${f.$id}">افزودن</button>
        </div>
    `).join('');
    el.querySelectorAll('.btn-copy-store').forEach(b => b.onclick = () => copyStore(b.dataset.id));
}

// --- Helpers & Logic Parts ---
function formatPrice(n) { return Number(n).toLocaleString('en-US'); }

function switchTab(id) {
    ['formulas', 'materials', 'categories', 'store'].forEach(t => {
        document.getElementById('tab-'+t).classList.add('hidden');
        document.getElementById('btn-tab-'+t)?.classList.remove('active');
    });
    document.getElementById('tab-'+id).classList.remove('hidden');
    document.getElementById('btn-tab-'+id)?.classList.add('active');
}

function openModal(id) { const el = document.getElementById(id); el.style.display = 'flex'; }
function closeModal(id) { const el = document.getElementById(id); el.style.display = 'none'; }

function updateDropdowns() {
    const c = state.categories.map(x => `<option value="${x.$id}">${x.name}</option>`).join('');
    document.getElementById('mat-category').innerHTML = '<option value="">بدون دسته</option>' + c;
    document.getElementById('comp-filter').innerHTML = '<option value="">همه...</option>' + c + '<option value="FORM">فرمول‌ها</option>';
    updateCompSelect();
}

function updateCompSelect() {
    const sel = document.getElementById('comp-select');
    const f = document.getElementById('comp-filter').value;
    let h = '<option value="">انتخاب...</option>';
    
    if(f === 'FORM') {
        h += state.formulas.filter(x => x.$id !== state.activeFormulaId)
            .map(x => `<option value="FORM:${x.$id}">🔗 ${x.name}</option>`).join('');
    } else {
        state.categories.forEach(cat => {
            if(f && f !== cat.$id) return;
            const m = state.materials.filter(x => x.category_id === cat.$id);
            if(m.length) h += `<optgroup label="${cat.name}">` + m.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + `</optgroup>`;
        });
        const o = state.materials.filter(x => !x.category_id);
        if((!f || f === 'null') && o.length) h += `<optgroup label="سایر">` + o.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + `</optgroup>`;
    }
    sel.innerHTML = h;
}

// --- Detailed Interactions ---
async function addComp() {
    if(!state.activeFormulaId) return;
    const val = document.getElementById('comp-select').value;
    const qty = parseFloat(document.getElementById('comp-qty').value);
    if(!val || !qty) return;
    
    const [typePrefix, id] = val.split(':');
    const type = typePrefix === 'MAT' ? 'mat' : 'form';
    
    // Prevent recursion
    if(type === 'form' && id === state.activeFormulaId) { alert('خطا: لوپ!'); return; }
    
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    let comps = JSON.parse(f.components_json || '[]');
    
    // Check exist
    const exist = comps.find(c => c.id === id && c.type === type);
    if(exist) exist.qty += qty; else comps.push({id, type, qty});
    
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { components_json: JSON.stringify(comps) });
        document.getElementById('comp-qty').value = '';
        await fetchAllData(); updateUI();
    } catch(e) { alert(e.message); }
}

async function removeComp(fid, idx) {
    const f = state.formulas.find(x => x.$id === fid);
    let comps = JSON.parse(f.components_json || '[]');
    comps.splice(idx, 1);
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, fid, { components_json: JSON.stringify(comps) });
        await fetchAllData(); updateUI();
    } catch(e) { alert(e.message); }
}

async function updateCost(key, val) {
    if(!state.activeFormulaId) return;
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { [key]: parseFloat(val.replace(/,/g,'')) || 0 });
        await fetchAllData(); updateUI();
    } catch(e) { alert(e.message); }
}

async function renameFormula() {
    const cur = document.getElementById('active-formula-name').innerText;
    const n = prompt('نام جدید:', cur);
    if(n && n !== cur) {
        try {
            await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { name: n });
            await fetchAllData(); updateUI();
        } catch(e) { alert(e.message); }
    }
}

async function deleteFormula() {
    if(confirm('حذف شود؟')) {
        try {
            await api.delete(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId);
            state.activeFormulaId = null;
            await fetchAllData(); updateUI();
        } catch(e) { alert(e.message); }
    }
}

async function delItem(col, id) {
    if(confirm('حذف؟')) {
        try { await api.delete(col, id); await fetchAllData(); updateUI(); }
        catch(e) { alert(e.message); }
    }
}

function editMat(id) {
    const m = state.materials.find(x => x.$id === id);
    document.getElementById('mat-id').value = m.$id;
    document.getElementById('mat-name').value = m.name;
    document.getElementById('mat-unit').value = m.unit;
    document.getElementById('mat-price').value = formatPrice(m.price);
    document.getElementById('mat-category').value = m.category_id || '';
    
    document.getElementById('mat-submit-btn').innerText = 'ویرایش';
    document.getElementById('mat-submit-btn').className = 'btn btn-primary w-full'; 
    document.getElementById('mat-cancel-btn').classList.remove('hidden');
    if(window.innerWidth < 768) document.getElementById('tab-materials').scrollIntoView({behavior:'smooth'});
}

function resetMatForm() {
    document.getElementById('material-form').reset();
    document.getElementById('mat-id').value = '';
    document.getElementById('mat-submit-btn').innerText = 'ذخیره';
    document.getElementById('mat-cancel-btn').classList.add('hidden');
}

async function copyStore(id) {
    if(!confirm('کپی شود؟')) return;
    const t = state.publicFormulas.find(x => x.$id === id);
    try {
        await api.create(APPWRITE_CONFIG.COLS.FORMS, {
            name: t.name + ' (کپی)', components_json: t.components_json, labor: t.labor, overhead: t.overhead, profit: t.profit, is_public: false
        });
        alert('انجام شد'); await fetchAllData(); updateUI(); switchTab('formulas');
    } catch(e) { alert(e.message); }
}

// --- Print ---
function printFormula() {
    if(!state.activeFormulaId) return;
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    const calc = calculateCost(f);
    const comps = JSON.parse(f.components_json || '[]');
    
    document.getElementById('print-title').innerText = f.name;
    document.getElementById('print-id').innerText = f.$id.substring(0,6).toUpperCase();
    document.getElementById('print-date').innerText = new Date().toLocaleDateString('fa-IR');
    
    document.getElementById('print-rows').innerHTML = comps.map(c => {
        let n='-', u='-';
        if(c.type==='mat') { const m = state.materials.find(x=>x.$id===c.id); n=m?m.name:'-'; u=m?m.unit:'-'; }
        else { const s = state.formulas.find(x=>x.$id===c.id); n=s?s.name:'-'; u='عدد'; }
        return `<tr><td class="py-2 text-right">${n}</td><td class="text-center">${c.qty}</td><td class="text-center text-xs text-slate-400">${u}</td></tr>`;
    }).join('');
    
    const sub = calc.final; 
    const vat = Math.round(sub * 0.1);
    document.getElementById('print-profit').innerText = formatPrice(calc.profit);
    document.getElementById('print-subtotal').innerText = formatPrice(sub);
    document.getElementById('print-vat').innerText = formatPrice(vat);
    document.getElementById('print-final').innerText = formatPrice(sub+vat);
    
    openModal('print-modal');
}