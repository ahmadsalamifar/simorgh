// مدیریت پنل جزئیات فرمول
import { state } from '../../core/config.js';
import { formatPrice, formatDate, toggleElement } from '../../core/utils.js';
// اصلاح نام فایل ایمپورت شده
import { calculateCost, getUnitFactor } from './formulas_calc.js';

// --- بخش ۱: رندرینگ ---

export function renderDetailView(formula, callbacks) {
    if (!formula) {
        toggleElement('formula-detail-view', false);
        toggleElement('formula-detail-empty', true);
        return;
    }

    toggleElement('formula-detail-empty', false);
    toggleElement('formula-detail-view', true);

    // 1. هدر و اطلاعات پایه
    const nameEl = document.getElementById('active-formula-name');
    if(nameEl) nameEl.innerText = formula.name;
    
    const dateEl = document.getElementById('active-formula-date');
    if(dateEl) dateEl.innerText = "بروزرسانی: " + formatDate(formula.$updatedAt);
    
    // 2. اینپوت‌های هزینه سربار و دستمزد
    const setVal = (id, val) => { 
        const el = document.getElementById(id); 
        if(el) el.value = typeof val === 'number' ? formatPrice(val) : val; 
    };
    setVal('inp-labor', formula.labor);
    setVal('inp-overhead', formula.overhead);
    
    const profitEl = document.getElementById('inp-profit');
    if(profitEl) profitEl.value = formula.profit || 0;

    // 3. جدول اجزا
    renderComponentsTable(formula, callbacks.onDeleteComp);
    
    // 4. قیمت نهایی
    const calc = calculateCost(formula);
    const lblFinal = document.getElementById('lbl-final-price');
    if(lblFinal) lblFinal.innerText = formatPrice(calc.final);

    // 5. آپدیت دراپ‌داون افزودن
    updateCompSelect();
}

function renderComponentsTable(formula, onDelete) {
    const listEl = document.getElementById('formula-comps-list');
    if (!listEl) return;

    let comps = [];
    try { comps = typeof formula.components === 'string' ? JSON.parse(formula.components) : formula.components; } catch(e){}
    if (!Array.isArray(comps)) comps = [];

    if (comps.length === 0) {
        listEl.innerHTML = '<div class="p-8 text-center text-slate-400 text-xs">اجزای سازنده را اضافه کنید...</div>';
        return;
    }

    listEl.innerHTML = comps.map((c, idx) => createComponentRow(c, idx)).join('');

    listEl.querySelectorAll('.btn-del-comp').forEach(btn => {
        btn.onclick = () => onDelete(parseInt(btn.dataset.idx));
    });
}

function createComponentRow(c, idx) {
    let name = '---', unitName = c.unit || '-', price = 0, total = 0;
    
    if (c.type === 'mat') {
        const m = state.materials.find(x => x.$id === c.id);
        if (m) {
            name = m.name;
            // محاسبه قیمت بر اساس واحد انتخابی
            const factor = getUnitFactor(m, c.unit);
            
            // دریافت قیمت خرید و اعمال مالیات
            let basePrice = m.price || 0;
            if(m.has_tax) basePrice *= 1.1;

            // دریافت واحد خرید کالا
            let rels = {};
            try { rels = typeof m.unit_relations === 'string' ? JSON.parse(m.unit_relations) : m.unit_relations; } catch(e){}
            const purchaseUnit = m.purchase_unit || rels?.price_unit || 'عدد';
            
            // محاسبه: (قیمت پایه / ضریب واحد خرید) * ضریب واحد مصرف
            const purchaseFactor = getUnitFactor(m, purchaseUnit);
            
            if (purchaseFactor !== 0) {
                price = (basePrice / purchaseFactor) * factor;
            }
            
        } else name = 'حذف شده';
    } else if (c.type === 'form') {
        const f = state.formulas.find(x => x.$id === c.id);
        name = f ? `🔗 ${f.name}` : 'حذف شده';
        price = f ? calculateCost(f).final : 0;
        unitName = 'عدد';
    }

    total = price * c.qty;

    return `
    <div class="flex justify-between items-center p-3 text-sm border-b border-slate-50 hover:bg-slate-50 group">
        <div>
            <div class="font-bold text-slate-700 text-xs">${name}</div>
            <div class="text-[10px] text-slate-500 mt-1">
                <span class="bg-slate-200 px-1.5 rounded">${c.qty}</span> ${unitName} × ${formatPrice(price)}
            </div>
        </div>
        <div class="flex items-center gap-2">
            <span class="font-bold text-slate-700 text-xs">${formatPrice(total)}</span>
            <button class="text-rose-400 opacity-0 group-hover:opacity-100 btn-del-comp px-2" data-idx="${idx}">×</button>
        </div>
    </div>`;
}

// --- بخش ۲: مدیریت دراپ‌داون‌ها ---

export function updateCompSelect() {
    const filter = document.getElementById('comp-filter')?.value;
    const sel = document.getElementById('comp-select');
    if (!sel) return;

    let html = '<option value="">انتخاب کنید...</option>'; 
    
    if (filter === 'FORM') {
        const others = state.formulas.filter(x => x.$id !== state.activeFormulaId);
        html += `<optgroup label="فرمول‌ها">` + others.map(x => `<option value="FORM:${x.$id}">🔗 ${x.name}</option>`).join('') + `</optgroup>`;
    } else {
        state.categories.forEach(cat => {
            if (filter && filter !== 'FORM' && filter !== cat.$id) return;
            const mats = state.materials.filter(x => x.category_id === cat.$id);
            if (mats.length) html += `<optgroup label="${cat.name}">` + mats.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + `</optgroup>`;
        });
        // نمایش موارد بدون دسته در صورت عدم فیلتر
        if (!filter) {
             const uncategorized = state.materials.filter(x => !x.category_id);
             if (uncategorized.length) html += `<optgroup label="سایر">` + uncategorized.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + `</optgroup>`;
        }
    }
    sel.innerHTML = html;
}

export function setupDropdownListeners() {
    const filterEl = document.getElementById('comp-filter');
    if (filterEl) {
        // پر کردن فیلتر دسته‌ها
        const cats = state.categories.map(x => `<option value="${x.$id}">${x.name}</option>`).join('');
        filterEl.innerHTML = `<option value="">همه...</option>${cats}<option value="FORM">فرمول‌ها (محصولات)</option>`;
        filterEl.onchange = updateCompSelect;
    }

    const compSel = document.getElementById('comp-select');
    if (compSel) compSel.onchange = updateUnitSelect;
}

function updateUnitSelect() {
    const val = document.getElementById('comp-select').value;
    const unitSel = document.getElementById('comp-unit-select');
    if (!unitSel) return;

    if (!val || val.startsWith('FORM:')) {
        unitSel.innerHTML = '<option value="count">عدد</option>'; 
        return;
    }

    const id = val.split(':')[1];
    const m = state.materials.find(x => x.$id === id);
    if (m) {
        let opts = ['عدد'];
        try {
            const rels = typeof m.unit_relations === 'string' ? JSON.parse(m.unit_relations) : (m.unit_relations || {});
            
            // جمع‌آوری تمام واحدهای موجود برای این کالا
            if (rels.base) opts.push(rels.base);
            if (Array.isArray(rels.others)) rels.others.forEach(u => opts.push(u.name));
            if (m.purchase_unit) opts.push(m.purchase_unit);
            if (m.consumption_unit) opts.push(m.consumption_unit);
            
            opts = [...new Set(opts)]; // حذف تکراری
        } catch(e){}
        
        unitSel.innerHTML = opts.map(u => `<option value="${u}">${u}</option>`).join('');
    }
}