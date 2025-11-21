import { state } from './config.js';
import { formatPrice, formatDate } from './utils.js';
import { calculateCost, getUnitFactor } from './formulas_calc.js';

// رندر لیست سمت راست (لیست اصلی فرمول‌ها)
export function renderFormulaList(filterText = '') {
    const el = document.getElementById('formula-master-list');
    if (!el) return;

    const list = state.formulas.filter(f => f.name.includes(filterText));

    if (!list.length) { 
        el.innerHTML = '<p class="text-center text-slate-400 text-xs mt-10">موردی یافت نشد</p>'; 
        return; 
    }
    
    el.innerHTML = list.map(f => {
        const calc = calculateCost(f); 
        const isActive = f.$id === state.activeFormulaId;
        return `
        <div class="p-3 border-b border-slate-100 cursor-pointer hover:bg-teal-50 transition-colors ${isActive ? 'bg-teal-50 border-r-4 border-teal-600' : ''}" data-id="${f.$id}">
            <div class="font-bold text-xs text-slate-700 pointer-events-none">${f.name}</div>
            <div class="text-[10px] text-slate-400 mt-0.5 pointer-events-none flex justify-between">
                <span>${formatDate(f.$updatedAt)}</span>
                <span class="font-bold text-teal-700">${formatPrice(calc.final)} ت</span>
            </div>
        </div>`;
    }).join('');
}

// رندر جزئیات فرمول (پنل وسط)
export function renderFormulaDetail(f) {
    if (!f) return;

    // ست کردن مقادیر هدر
    const nameEl = document.getElementById('active-formula-name');
    const dateEl = document.getElementById('active-formula-date');
    if(nameEl) nameEl.innerText = f.name;
    if(dateEl) dateEl.innerText = "بروزرسانی: " + formatDate(f.$updatedAt);
    
    // ست کردن اینپوت‌های هزینه
    const setVal = (id, val) => { 
        const el = document.getElementById(id); 
        if(el) el.value = typeof val === 'number' ? formatPrice(val) : val; 
    };
    setVal('inp-labor', f.labor);
    setVal('inp-overhead', f.overhead);
    const profitEl = document.getElementById('inp-profit');
    if(profitEl) profitEl.value = f.profit || 0;
    
    // پارس کردن اجزا
    let comps = [];
    try { comps = typeof f.components === 'string' ? JSON.parse(f.components) : f.components; } catch(e) {}
    if (!Array.isArray(comps)) comps = [];
    
    const listEl = document.getElementById('formula-comps-list');
    
    if (comps.length === 0) {
        listEl.innerHTML = '<div class="p-8 text-center text-slate-400 text-xs">اجزای سازنده را اضافه کنید...</div>';
    } else {
        listEl.innerHTML = comps.map((c, idx) => {
            return generateComponentRow(c, idx);
        }).join('');
    }
    
    // نمایش قیمت نهایی
    const calc = calculateCost(f);
    const lblFinal = document.getElementById('lbl-final-price');
    if(lblFinal) lblFinal.innerText = formatPrice(calc.final);
    
    updateDropdowns();
    updateCompSelect(); // آپدیت دراپ‌داون افزودن کالا
}

// تابع کمکی برای تولید HTML هر سطر جزء
function generateComponentRow(c, idx) {
    let name = '?', unitName = '-', price = 0, total = 0;
    let taxBadge = '', warning = '';

    if (c.type === 'mat') {
        const m = state.materials.find(x => x.$id === c.id);
        if (m) { 
            name = m.display_name || m.name;
            unitName = c.unit || 'واحد';
            if (m.has_tax) taxBadge = '<span class="text-[9px] text-rose-500 bg-rose-50 px-1 rounded ml-1 border border-rose-100">+۱۰٪</span>';

            try {
                let baseMatPrice = m.price;
                if (m.has_tax) baseMatPrice *= 1.10;

                // محاسبه قیمت واحد انتخابی
                const rels = typeof m.unit_relations === 'string' ? JSON.parse(m.unit_relations) : (m.unit_relations || {});
                const priceUnit = m.purchase_unit || rels.price_unit || 'عدد';
                
                const priceFactor = getUnitFactor(m, priceUnit);
                const selectedUnitFactor = getUnitFactor(m, unitName);

                if (priceFactor !== 0) {
                    const basePrice = baseMatPrice / priceFactor;
                    price = basePrice * selectedUnitFactor;
                }
            } catch(e) { 
                price = m.price; 
                warning = '⚠️'; 
            }
        } else { 
            name = '(کالای حذف شده)'; 
            warning = '⚠️'; 
        }
    } else {
        // زیر فرمول
        const sub = state.formulas.find(x => x.$id === c.id);
        if (sub) { 
            name = `🔗 ${sub.name}`; 
            unitName = 'عدد'; 
            price = calculateCost(sub).final; 
        } else { 
            name = '(فرمول حذف شده)'; 
            warning = '⚠️'; 
        }
    }
    
    total = price * c.qty;
    
    return `
    <div class="flex justify-between items-center p-3 text-sm hover:bg-slate-50 group border-b border-slate-50">
        <div class="flex-grow min-w-0">
            <div class="font-bold text-slate-700 text-xs flex items-center gap-1 truncate">
                ${warning} ${name} ${taxBadge}
            </div>
            <div class="text-[10px] text-slate-500 mt-1">
                <span class="font-mono font-bold bg-slate-200 px-1.5 rounded text-slate-700">${c.qty}</span>
                <span class="mx-1 text-teal-700">${unitName}</span>
                <span class="opacity-40 mx-1">×</span>
                <span class="opacity-70 font-mono">${formatPrice(price)}</span>
            </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
            <div class="text-right font-mono font-bold text-slate-700 text-xs w-20">${formatPrice(total)}</div>
            <button type="button" class="text-rose-400 lg:opacity-0 group-hover:opacity-100 px-2 btn-del-comp transition-opacity" data-idx="${idx}">×</button>
        </div>
    </div>`;
}

export function updateDropdowns() {
    const filterEl = document.getElementById('comp-filter');
    if (!filterEl) return;
    
    const current = filterEl.value;
    const cats = state.categories.map(x => `<option value="${x.$id}">${x.name}</option>`).join('');
    
    filterEl.innerHTML = `
        <option value="">همه دسته‌ها...</option>
        ${cats}
        <option value="FORM">فرمول‌ها (محصولات)</option>
    `;
    filterEl.value = current;
}

export function updateCompSelect() {
    const sel = document.getElementById('comp-select');
    const filter = document.getElementById('comp-filter')?.value;
    if (!sel) return;
    
    let html = '<option value="">انتخاب کنید...</option>'; 
    
    if (filter === 'FORM') {
        const otherFormulas = state.formulas.filter(x => x.$id !== state.activeFormulaId);
        html += `<optgroup label="فرمول‌ها">` + otherFormulas.map(x => `<option value="FORM:${x.$id}">🔗 ${x.name}</option>`).join('') + `</optgroup>`;
    } else {
        // نمایش بر اساس دسته‌بندی
        state.categories.forEach(cat => {
            if (filter && filter !== 'FORM' && filter !== cat.$id) return;
            
            const mats = state.materials.filter(x => x.category_id === cat.$id);
            if (mats.length) {
                html += `<optgroup label="${cat.name}">` + mats.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + `</optgroup>`;
            }
        });
        
        // کالا های بدون دسته
        const uncategorized = state.materials.filter(x => !x.category_id);
        if ((!filter || filter === 'null') && uncategorized.length) {
            html += `<optgroup label="سایر">` + uncategorized.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + `</optgroup>`;
        }
    }
    sel.innerHTML = html;
    updateCompUnitSelect();
}

export function updateCompUnitSelect() {
    const matSelect = document.getElementById('comp-select');
    const unitSelect = document.getElementById('comp-unit-select');
    if (!matSelect || !unitSelect) return;
    
    const val = matSelect.value;
    // اگر چیزی انتخاب نشده یا فرمول است (واحد فرمول همیشه عدد است)
    if (!val || val.startsWith('FORM:')) { 
        unitSelect.innerHTML = '<option value="count">عدد</option>'; 
        return; 
    }

    const id = val.split(':')[1];
    const m = state.materials.find(x => x.$id === id);
    
    if (m) {
        let options = [];
        try {
            const rels = typeof m.unit_relations === 'string' ? JSON.parse(m.unit_relations) : (m.unit_relations || {});
            
            if (rels.base) options.push(rels.base);
            if (Array.isArray(rels.others)) rels.others.forEach(u => options.push(u.name));
            
            const defaultUnit = m.consumption_unit || rels.selected_consumption;
            if (defaultUnit && !options.includes(defaultUnit)) options.push(defaultUnit);
            
            if (options.length === 0) options.push('عدد');
            // حذف تکراری‌ها
            options = [...new Set(options)];
            
            unitSelect.innerHTML = options.map(u => `<option value="${u}">${u}</option>`).join('');
            
            if (defaultUnit) unitSelect.value = defaultUnit;
            
        } catch(e) { 
            unitSelect.innerHTML = '<option value="عدد">عدد</option>'; 
        }
    }
}
