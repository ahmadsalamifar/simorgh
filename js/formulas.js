import { api, fetchSingleFormula, fetchAllData } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { formatPrice, formatDate, getDateBadge, openModal, closeModal } from './utils.js';

// --- Setup Listeners ---
export function setupFormulas(refreshCallback) {
    // Modal Actions
    document.getElementById('btn-open-new-formula').onclick = () => openModal('new-formula-modal');
    document.getElementById('btn-cancel-formula').onclick = () => closeModal('new-formula-modal');
    document.getElementById('btn-create-formula').onclick = () => createFormula(refreshCallback);
    
    // Search
    document.getElementById('search-formulas').oninput = (e) => renderFormulaList(e.target.value);
    
    // Add Item Form
    document.getElementById('form-add-comp').onsubmit = (e) => { 
        e.preventDefault(); 
        addComp(refreshCallback); 
    };

    // Cost Inputs
    ['labor', 'overhead', 'profit'].forEach(key => {
        document.getElementById('inp-' + key).onchange = (e) => updateCost(key, e.target.value, refreshCallback);
    });
    
    // Actions
    document.getElementById('active-formula-name').onclick = () => renameFormula(refreshCallback);
    document.getElementById('btn-delete-formula').onclick = () => deleteFormula(refreshCallback);
    
    // Filter Dropdown
    document.getElementById('comp-filter').onchange = updateCompSelect;
}

// --- Create ---
async function createFormula(cb) {
    const name = document.getElementById('new-formula-name').value;
    if(!name) return;
    try {
        const res = await api.create(APPWRITE_CONFIG.COLS.FORMS, {
            name, components: '[]', labor: 0.0, overhead: 0.0, profit: 0.0, is_public: false
        });
        state.formulas.unshift(res);
        closeModal('new-formula-modal');
        document.getElementById('new-formula-name').value = '';
        selectFormula(res.$id);
    } catch(e) { alert("Error creating: " + e.message); }
}

// --- Render List ---
export function renderFormulaList(filter='') {
    const list = state.formulas.filter(f => f.name.includes(filter));
    const el = document.getElementById('formula-master-list');
    if(!list.length) { el.innerHTML = '<p class="text-center text-slate-400 text-xs mt-4">یافت نشد</p>'; return; }
    
    el.innerHTML = list.map(f => `
        <div class="p-3 border-b border-slate-100 cursor-pointer hover:bg-teal-50 transition-colors ${f.$id===state.activeFormulaId ? 'bg-teal-50 border-r-4 border-teal-600' : ''}" id="f-item-${f.$id}">
            <div class="font-bold text-xs text-slate-700 pointer-events-none">${f.name}</div>
            <div class="text-[10px] text-slate-400 mt-0.5 pointer-events-none">${formatDate(f.$updatedAt)}</div>
        </div>
    `).join('');
    
    // Attach click events properly
    state.formulas.forEach(f => {
        const item = document.getElementById(`f-item-${f.$id}`);
        if(item) item.onclick = () => selectFormula(f.$id);
    });
}

// --- Select & Render Detail ---
export function selectFormula(id) {
    state.activeFormulaId = id;
    renderFormulaList(); // Update active class
    
    const emptyEl = document.getElementById('formula-detail-empty');
    const viewEl = document.getElementById('formula-detail-view');
    
    emptyEl.classList.add('hidden');
    viewEl.classList.remove('hidden');
    viewEl.classList.add('flex');
    
    const f = state.formulas.find(x => x.$id === id);
    if(f) renderFormulaDetail(f);

    if(window.innerWidth < 1024) document.getElementById('detail-panel').scrollIntoView({behavior: 'smooth'});
}

export function renderFormulaDetail(f) {
    // 1. Basic Info
    document.getElementById('active-formula-name').innerText = f.name;
    document.getElementById('inp-labor').value = formatPrice(f.labor);
    document.getElementById('inp-overhead').value = formatPrice(f.overhead);
    document.getElementById('inp-profit').value = f.profit;

    // 2. Populate Dropdowns (CRITICAL FIX)
    // We call this here to ensure dropdowns are populated when the formula view loads
    if(document.getElementById('comp-select').options.length <= 1) {
        updateDropdowns(); // Populate filters
        updateCompSelect(); // Populate items
    }

    // 3. Parse Components
    let comps = [];
    try { comps = JSON.parse(f.components || '[]'); } catch(e) { console.error('Parse Error', e); }
    
    // 4. Render List
    const listEl = document.getElementById('formula-comps-list');
    if(comps.length === 0) {
        listEl.innerHTML = '<div class="p-8 text-center text-slate-400 text-xs">لیست خالی است. کالایی اضافه کنید.</div>';
    } else {
        listEl.innerHTML = comps.map((c, idx) => {
            let name = '?', unit = '-', price = 0, total = 0, badge = '';
            
            if(c.type === 'mat') {
                const m = state.materials.find(x => x.$id === c.id);
                if(m) { name = m.name; unit = m.unit; price = m.price; badge = getDateBadge(m.$updatedAt); }
                else { name = '(کالا حذف شده)'; badge = '<span class="text-rose-500 text-[10px]">!</span>'; }
            } else {
                const sub = state.formulas.find(x => x.$id === c.id);
                if(sub) { name = `🔗 ${sub.name}`; unit = 'عدد'; price = calculateCost(sub).final; badge = getDateBadge(sub.$updatedAt); }
                else { name = '(فرمول حذف شده)'; }
            }
            total = price * c.qty;
            
            return `
            <div class="flex justify-between items-center p-3 text-sm border-b border-slate-50 hover:bg-slate-50">
                <div class="flex-grow">
                    <div class="font-bold text-slate-700 text-xs flex items-center gap-2">
                        ${name} ${badge}
                    </div>
                    <div class="text-[10px] text-slate-400 mt-0.5">
                        <span class="bg-white border px-1 rounded">${c.qty}</span> ${unit} × ${formatPrice(price)}
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="font-mono font-bold text-slate-600 text-xs">${formatPrice(total)}</span>
                    <button class="text-rose-400 px-2 py-1 rounded hover:bg-rose-50 btn-del-comp" id="del-btn-${idx}">×</button>
                </div>
            </div>`;
        }).join('');

        // Attach Delete Listeners
        comps.forEach((_, idx) => {
            const btn = document.getElementById(`del-btn-${idx}`);
            if(btn) btn.onclick = () => removeComp(f.$id, idx);
        });
    }

    // 5. Update Final Price
    const calc = calculateCost(f);
    document.getElementById('lbl-final-price').innerText = formatPrice(calc.final);
}

// --- Calculate ---
export function calculateCost(f) {
    if(!f) return {matCost:0, sub:0, profit:0, final:0};
    let matCost=0;
    const comps = JSON.parse(f.components || '[]');
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

// --- CRUD Actions ---

async function addComp(refreshCb) {
    if(!state.activeFormulaId) return;
    const val = document.getElementById('comp-select').value;
    const qty = parseFloat(document.getElementById('comp-qty').value);
    
    if(!val || !qty) { alert('لطفاً کالا و تعداد را انتخاب کنید'); return; }

    const [typePrefix, id] = val.split(':');
    const type = typePrefix === 'MAT' ? 'mat' : 'form';
    if(type === 'form' && id === state.activeFormulaId) { alert('خطا: انتخاب خود محصول مجاز نیست'); return; }

    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    let comps = JSON.parse(f.components || '[]');
    
    const exist = comps.find(c => c.id === id && c.type === type);
    if(exist) exist.qty += qty; else comps.push({id, type, qty});
    
    try {
        // آپدیت دیتابیس
        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { components: JSON.stringify(comps) });
        
        // ریست فیلدها
        document.getElementById('comp-qty').value = '';
        
        // رفرش سریع
        const updatedF = await fetchSingleFormula(state.activeFormulaId);
        renderFormulaDetail(updatedF);
    } catch(e) { alert("خطا: " + e.message); }
}

async function removeComp(fid, idx) {
    const f = state.formulas.find(x => x.$id === fid);
    let comps = JSON.parse(f.components || '[]');
    comps.splice(idx, 1);
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, fid, { components: JSON.stringify(comps) });
        const updatedF = await fetchSingleFormula(fid);
        renderFormulaDetail(updatedF);
    } catch(e) { alert("خطا: " + e.message); }
}

async function updateCost(key, val, cb) {
    if(!state.activeFormulaId) return;
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { [key]: parseFloat(val.replace(/,/g,'')) || 0 });
        // رفرش سریع
        const updatedF = await fetchSingleFormula(state.activeFormulaId);
        renderFormulaDetail(updatedF);
    } catch(e) { console.error(e); }
}

async function renameFormula(cb) {
    const cur = document.getElementById('active-formula-name').innerText;
    const n = prompt('نام جدید:', cur);
    if(n && n !== cur) {
        try { 
            await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { name: n });
            // رفرش کامل نیاز است چون نام در لیست هم هست
            cb(); 
        } catch(e) { alert(e.message); }
    }
}

async function deleteFormula(cb) {
    if(confirm('حذف شود؟')) {
        try {
            await api.delete(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId);
            state.activeFormulaId = null;
            cb();
        } catch(e) { alert(e.message); }
    }
}

// --- Dropdown Logic ---

export function updateDropdowns() {
    // این تابع لیست دسته‌بندی‌ها را در فیلتر پر می‌کند
    const c = state.categories.map(x => `<option value="${x.$id}">${x.name}</option>`).join('');
    const filterEl = document.getElementById('comp-filter');
    
    // حفظ انتخاب فعلی
    const cur = filterEl.value;
    filterEl.innerHTML = '<option value="">همه دسته‌ها...</option>' + c + '<option value="FORM">فرمول‌ها</option>';
    filterEl.value = cur;
}

export function updateCompSelect() {
    const sel = document.getElementById('comp-select');
    const f = document.getElementById('comp-filter').value;
    if(!sel) return;
    
    let h = '<option value="">انتخاب کالا...</option>';
    
    if(f === 'FORM') {
        h += `<optgroup label="فرمول‌ها">` + 
             state.formulas.filter(x => x.$id !== state.activeFormulaId)
             .map(x => `<option value="FORM:${x.$id}">🔗 ${x.name}</option>`).join('') + 
             `</optgroup>`;
    } else {
        // اگر فیلتری انتخاب نشده یا دسته خاصی انتخاب شده
        state.categories.forEach(cat => {
            if(f && f !== 'FORM' && f !== cat.$id) return; // اگر فیلتر داریم و این دسته نیست، رد کن
            
            const m = state.materials.filter(x => x.category_id === cat.$id);
            if(m.length) {
                h += `<optgroup label="${cat.name}">` + 
                     m.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + 
                     `</optgroup>`;
            }
        });
        
        // کالاهای بدون دسته
        const o = state.materials.filter(x => !x.category_id);
        if((!f || f === 'null') && o.length) {
            h += `<optgroup label="سایر">` + 
                 o.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + 
                 `</optgroup>`;
        }
    }
    sel.innerHTML = h;
}