import { api, fetchSingleFormula } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { formatPrice, formatDate, getDateBadge, openModal, closeModal } from './utils.js';

export function setupFormulas(refreshCallback) {
    console.log("🔧 Setup Formulas Init");

    // 1. اتصال دکمه‌های مودال
    const btnNew = document.getElementById('btn-open-new-formula');
    if(btnNew) btnNew.onclick = () => openModal('new-formula-modal');
    
    const btnCreate = document.getElementById('btn-create-formula');
    if(btnCreate) btnCreate.onclick = () => createFormula(refreshCallback);
    
    const btnCancel = document.getElementById('btn-cancel-formula');
    if(btnCancel) btnCancel.onclick = () => closeModal('new-formula-modal');

    // 2. فرم افزودن کالا
    const addForm = document.getElementById('form-add-comp');
    if(addForm) addForm.onsubmit = (e) => { 
        e.preventDefault(); 
        addComp(refreshCallback); 
    };

    // 3. تغییر نام و حذف (با بررسی وجود المنت)
    const nameEl = document.getElementById('active-formula-name');
    if(nameEl) {
        nameEl.style.cursor = 'pointer';
        nameEl.onclick = () => {
            console.log("✏️ Rename clicked");
            renameFormula(refreshCallback);
        };
    }

    const delBtn = document.getElementById('btn-delete-formula');
    if(delBtn) {
        delBtn.onclick = () => {
            console.log("🗑 Delete clicked");
            deleteFormula(refreshCallback);
        };
    }
    
    // 4. فیلتر
    const filterEl = document.getElementById('comp-filter');
    if(filterEl) filterEl.onchange = updateCompSelect;

    // 5. جستجو
    const searchEl = document.getElementById('search-formulas');
    if(searchEl) searchEl.oninput = (e) => renderFormulaList(e.target.value);
    
    // 6. انتخاب از لیست (Delegation)
    const listEl = document.getElementById('formula-master-list');
    if(listEl) {
        listEl.addEventListener('click', (e) => {
            const item = e.target.closest('[data-id]');
            if(item) selectFormula(item.getAttribute('data-id'));
        });
    }
}

// --- توابع رندر ---

export function renderFormulaList(filter='') {
    const list = state.formulas.filter(f => f.name.includes(filter));
    const el = document.getElementById('formula-master-list');
    
    if(!list.length) { el.innerHTML = '<p class="text-center text-slate-400 text-xs mt-10">خالی</p>'; return; }
    
    el.innerHTML = list.map(f => `
        <div class="p-3 border-b border-slate-100 cursor-pointer hover:bg-teal-50 transition-colors ${f.$id===state.activeFormulaId ? 'bg-teal-50 border-r-4 border-teal-600' : ''}" data-id="${f.$id}">
            <div class="font-bold text-xs text-slate-700 pointer-events-none">${f.name}</div>
            <div class="text-[10px] text-slate-400 mt-0.5 pointer-events-none">${formatDate(f.$updatedAt)}</div>
        </div>
    `).join('');
}

export function selectFormula(id) {
    console.log("👉 Selecting:", id);
    state.activeFormulaId = id;
    renderFormulaList(); // آپدیت استایل فعال
    
    document.getElementById('formula-detail-empty').classList.add('hidden');
    document.getElementById('formula-detail-view').classList.remove('hidden');
    document.getElementById('formula-detail-view').classList.add('flex');
    
    const f = state.formulas.find(x => x.$id === id);
    if(f) {
        // اگر کالاها هنوز لود نشده‌اند، هشدار بده
        if(state.materials.length === 0) console.warn("⚠️ Materials list is empty in state!");
        renderFormulaDetail(f);
    }
    
    // اسکرول موبایل
    if(window.innerWidth < 1024) {
        document.getElementById('detail-panel').scrollIntoView({behavior:'smooth'});
    }
}

export function renderFormulaDetail(f) {
    // 1. اطلاعات پایه
    document.getElementById('active-formula-name').innerText = f.name;
    document.getElementById('inp-labor').value = formatPrice(f.labor);
    document.getElementById('inp-overhead').value = formatPrice(f.overhead);
    document.getElementById('inp-profit').value = f.profit;

    // 2. پر کردن دراپ‌داون‌ها (اگر خالی بودند)
    const filterEl = document.getElementById('comp-filter');
    if(filterEl.options.length <= 1) updateDropdowns();
    updateCompSelect();

    // 3. پارس کردن اجزا
    let comps = [];
    try {
        if(f.components) comps = JSON.parse(f.components);
    } catch(e) { console.error("JSON Error", e); }
    
    console.log("📦 Rendering Comps:", comps.length, "items. Materials available:", state.materials.length);

    // 4. ساخت HTML لیست
    const listEl = document.getElementById('formula-comps-list');
    
    if (comps.length === 0) {
        listEl.innerHTML = '<div class="p-8 text-center text-slate-400 text-xs">لیست خالی است</div>';
    } else {
        listEl.innerHTML = comps.map((c, idx) => {
            let name = '?', unit = '-', price = 0, total = 0, badge = '';
            
            if(c.type === 'mat') {
                const m = state.materials.find(x => x.$id === c.id);
                if(m) {
                    name = m.name;
                    unit = m.unit;
                    price = m.price;
                    badge = getDateBadge(m.$updatedAt); // تاریخ کالا
                } else {
                    name = '(کالا حذف شده)';
                    badge = '<span class="text-rose-500">!</span>';
                }
            } else {
                const sub = state.formulas.find(x => x.$id === c.id);
                if(sub) {
                    name = `🔗 ${sub.name}`;
                    unit = 'عدد';
                    price = calculateCost(sub).final;
                    badge = getDateBadge(sub.$updatedAt); // تاریخ فرمول
                } else {
                    name = '(فرمول حذف شده)';
                }
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
                    <button class="text-rose-400 hover:text-rose-600 px-2 py-1 btn-del-comp" data-idx="${idx}">×</button>
                </div>
            </div>`;
        }).join('');

        // اتصال دکمه حذف
        listEl.querySelectorAll('.btn-del-comp').forEach(btn => {
            btn.onclick = () => removeComp(f.$id, parseInt(btn.dataset.idx));
        });
    }

    // 5. قیمت نهایی
    const calc = calculateCost(f);
    document.getElementById('lbl-final-price').innerText = formatPrice(calc.final);
}

// --- محاسبات و عملیات ---

export function calculateCost(f) {
    if(!f) return {matCost:0, sub:0, profit:0, final:0};
    let matCost=0;
    let comps = [];
    try { if(f.components) comps = JSON.parse(f.components); } catch(e){}
    
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
    } catch(e) { alert(e.message); }
}

async function addComp(cb) {
    if(!state.activeFormulaId) return;
    const val = document.getElementById('comp-select').value;
    const qty = parseFloat(document.getElementById('comp-qty').value);
    
    if(!val || !qty) { alert('ناقص'); return; }
    const [typePrefix, id] = val.split(':');
    const type = typePrefix === 'MAT' ? 'mat' : 'form';
    
    if(type === 'form' && id === state.activeFormulaId) { alert('خطا: لوپ'); return; }
    
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    let comps = JSON.parse(f.components || '[]');
    const exist = comps.find(c => c.id === id && c.type === type);
    if(exist) exist.qty += qty; else comps.push({id, type, qty});
    
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { components: JSON.stringify(comps) });
        document.getElementById('comp-qty').value = '';
        // رفرش سریع
        const updated = await fetchSingleFormula(state.activeFormulaId);
        renderFormulaDetail(updated);
    } catch(e) { alert(e.message); }
}

async function removeComp(fid, idx) {
    const f = state.formulas.find(x => x.$id === fid);
    let comps = JSON.parse(f.components || '[]');
    comps.splice(idx, 1);
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, fid, { components: JSON.stringify(comps) });
        const updated = await fetchSingleFormula(fid);
        renderFormulaDetail(updated);
    } catch(e) { alert(e.message); }
}

async function renameFormula(cb) {
    const cur = document.getElementById('active-formula-name').innerText;
    const n = prompt('نام جدید:', cur);
    if(n && n !== cur) {
        try { 
            await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { name: n }); 
            cb(); // رفرش کامل برای لیست
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

async function updateCost(key, val, cb) {
    if(!state.activeFormulaId) return;
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { [key]: parseFloat(val.replace(/,/g,'')) || 0 });
        const f = await fetchSingleFormula(state.activeFormulaId);
        renderFormulaDetail(f);
    } catch(e) { console.error(e); }
}

// --- دراپ‌داون‌ها ---
export function updateDropdowns() {
    const filterEl = document.getElementById('comp-filter');
    if(!filterEl) return;
    
    // اینجا چک می‌کنیم state.categories پر باشد
    console.log("Categories for Dropdown:", state.categories.length);
    
    const c = state.categories.map(x => `<option value="${x.$id}">${x.name}</option>`).join('');
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
        state.categories.forEach(cat => {
            if(f && f !== 'FORM' && f !== cat.$id) return;
            const m = state.materials.filter(x => x.category_id === cat.$id);
            if(m.length) {
                h += `<optgroup label="${cat.name}">` + 
                     m.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + 
                     `</optgroup>`;
            }
        });
        const o = state.materials.filter(x => !x.category_id);
        if((!f || f === 'null') && o.length) {
            h += `<optgroup label="سایر">` + o.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + `</optgroup>`;
        }
    }
    sel.innerHTML = h;
}