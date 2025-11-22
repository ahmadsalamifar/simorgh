import { state } from './config.js';
import { formatPrice, formatDate } from './utils.js';
import { calculateCost, getUnitFactor } from './formulas_calc.js';

// تابع کمکی برای پارس کردن اجزا (مدیریت فرمت‌های مختلف دیتابیس)
function parseComponents(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    
    try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        if (typeof parsed === 'string') return JSON.parse(parsed); // Double stringified fix
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error("Error parsing components:", e);
        return [];
    }
}

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
        const comps = parseComponents(f.components);

        return `
        <div class="p-3 border-b border-slate-100 cursor-pointer hover:bg-teal-50 transition-colors ${isActive ? 'bg-teal-50 border-r-4 border-teal-600' : ''}" data-id="${f.$id}">
            <div class="font-bold text-xs text-slate-700 pointer-events-none flex justify-between">
                <span>${f.name}</span>
                <span class="bg-slate-100 text-slate-500 px-1.5 rounded text-[9px] h-fit">${comps.length}</span>
            </div>
            <div class="text-[10px] text-slate-400 mt-1 pointer-events-none flex justify-between items-end">
                <span>${formatDate(f.$updatedAt)}</span>
                <span class="font-bold text-teal-700 text-xs">${formatPrice(calc.final)} ت</span>
            </div>
        </div>`;
    }).join('');
}

// رندر جزئیات فرمول (پنل وسط)
export function renderFormulaDetail(f) {
    if (!f) return;

    // 1. هدر و اطلاعات کلی
    const nameEl = document.getElementById('active-formula-name');
    const dateEl = document.getElementById('active-formula-date');
    if(nameEl) nameEl.innerText = f.name;
    if(dateEl) dateEl.innerText = "بروزرسانی: " + formatDate(f.$updatedAt);
    
    const setVal = (id, val) => { 
        const el = document.getElementById(id); 
        if(el) el.value = typeof val === 'number' ? formatPrice(val) : val; 
    };
    setVal('inp-labor', f.labor);
    setVal('inp-overhead', f.overhead);
    const profitEl = document.getElementById('inp-profit');
    if(profitEl) profitEl.value = f.profit || 0;
    
    // 2. رندر لیست اجزا
    const listEl = document.getElementById('formula-comps-list');
    if (listEl) {
        const comps = parseComponents(f.components);
        console.log("Rendering detail components:", comps); // لاگ برای بررسی داده‌ها

        if (comps.length === 0) {
            listEl.innerHTML = '<div class="p-8 text-center text-slate-400 text-xs">اجزای سازنده را اضافه کنید...</div>';
        } else {
            // تولید HTML با ایمنی بالا
            const rowsHtml = comps.map((c, idx) => {
                try {
                    return generateComponentRow(c, idx);
                } catch (err) {
                    console.error("Row render fail:", err, c);
                    return `<div class="p-2 text-xs text-red-500 border-b">خطا در نمایش آیتم ${idx + 1}</div>`;
                }
            }).join('');
            
            listEl.innerHTML = rowsHtml;
        }
    }
    
    // 3. قیمت نهایی
    const calc = calculateCost(f);
    const lblFinal = document.getElementById('lbl-final-price');
    if(lblFinal) lblFinal.innerText = formatPrice(calc.final);
    
    updateDropdowns();
    updateCompSelect(); 
}

// تابع تولید HTML سطر با مدیریت خطای داخلی
function generateComponentRow(c, idx) {
    let name = '---', unitName = '-', price = 0, total = 0;
    let taxBadge = '', warning = '';
    
    // اگر شناسه کالا وجود ندارد
    if (!c.id) {
        return `<div class="p-2 text-xs text-slate-400 border-b">آیتم نامعتبر (شناسه ندارد) <button class="text-rose-500 btn-del-comp float-left" data-idx="${idx}">×</button></div>`;
    }

    const type = (c.type || '').toLowerCase();

    if (type.includes('mat')) {
        const m = state.materials.find(x => x.$id === c.id);
        if (m) { 
            name = m.display_name || m.name;
            unitName = c.unit || 'واحد';
            if (m.has_tax) taxBadge = '<span class="text-[9px] text-rose-500 bg-rose-50 px-1 rounded ml-1">+۱۰٪</span>';

            try {
                let baseMatPrice = m.price || 0;
                if (m.has_tax) baseMatPrice *= 1.10;

                let rels = {};
                if (typeof m.unit_relations === 'string') {
                     try { rels = JSON.parse(m.unit_relations); } catch(e){}
                } else {
                     rels = m.unit_relations || {};
                }

                const priceUnit = m.purchase_unit || rels.price_unit || 'عدد';
                const priceFactor = getUnitFactor(m, priceUnit);
                const selectedUnitFactor = getUnitFactor(m, unitName);

                if (priceFactor !== 0) {
                    const basePrice = baseMatPrice / priceFactor;
                    price = basePrice * selectedUnitFactor;
                }
            } catch(e) { 
                console.warn("Price calc error:", e);
                price = m.price || 0; 
                warning = '⚠️'; 
            }
        } else { 
            name = `کالای حذف شده (${c.id.substr(0,4)}...)`; 
            warning = '❌'; 
        }
    } else if (type.includes('form')) {
        const sub = state.formulas.find(x => x.$id === c.id);
        if (sub) { 
            name = `🔗 ${sub.name}`; 
            unitName = 'عدد'; 
            price = calculateCost(sub).final; 
        } else { 
            name = 'فرمول حذف شده'; 
            warning = '❌'; 
        }
    } else {
        name = `نوع نامشخص (${type})`;
        warning = '❓';
    }
    
    total = price * (c.qty || 0);
    
    return `
    <div class="flex justify-between items-center p-3 text-sm hover:bg-slate-50 group border-b border-slate-100 transition-colors">
        <div class="flex-grow min-w-0">
            <div class="font-bold text-slate-700 text-xs flex items-center gap-1 truncate">
                ${warning} ${name} ${taxBadge}
            </div>
            <div class="text-[10px] text-slate-500 mt-1 flex items-center">
                <span class="font-mono font-bold bg-slate-200 px-1.5 rounded text-slate-700 ml-1">${c.qty || 0}</span>
                <span class="text-teal-700 ml-1">${unitName}</span>
                <span class="opacity-40 ml-1">×</span>
                <span class="opacity-70 font-mono">${formatPrice(price)}</span>
            </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
            <div class="text-right font-mono font-bold text-slate-700 text-xs w-20">${formatPrice(total)}</div>
            <button type="button" class="text-rose-400 lg:opacity-0 group-hover:opacity-100 px-2 py-1 btn-del-comp transition-opacity hover:bg-rose-50 rounded" data-idx="${idx}">×</button>
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
    if(current) filterEl.value = current;
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
        const validCategoryIds = new Set(state.categories.map(c => c.$id));

        state.categories.forEach(cat => {
            if (filter && filter !== 'FORM' && filter !== cat.$id) return;
            const mats = state.materials.filter(x => x.category_id === cat.$id);
            if (mats.length) {
                html += `<optgroup label="${cat.name}">` + mats.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + `</optgroup>`;
            }
        });
        
        if (!filter || filter === '') {
            const uncategorized = state.materials.filter(x => 
                !x.category_id || !validCategoryIds.has(x.category_id)
            );
            if (uncategorized.length) {
                html += `<optgroup label="سایر (بدون دسته‌بندی)">` + uncategorized.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + `</optgroup>`;
            }
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
            options = [...new Set(options)];
            
            unitSelect.innerHTML = options.map(u => `<option value="${u}">${u}</option>`).join('');
            if (defaultUnit) unitSelect.value = defaultUnit;
            
        } catch(e) { 
            unitSelect.innerHTML = '<option value="عدد">عدد</option>'; 
        }
    }
}
