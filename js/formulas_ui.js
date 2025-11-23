import { state } from './config.js';
import { formatPrice, formatDate } from './utils.js';
import { calculateCost, getUnitFactor } from './formulas_calc.js';

/**
 * تابع جدید: تولید و تزریق ساختار اولیه تب فرمول‌ها به DOM
 * این تابع کد HTML را از index.html به اینجا منتقل می‌کند.
 */
export function initFormulaUI() {
    const container = document.getElementById('tab-formulas');
    if (!container) return;

    // بررسی اینکه آیا ساختار قبلاً ساخته شده است؟ (برای جلوگیری از دوباره‌کاری)
    if (container.innerHTML.trim() !== '') return;

    container.innerHTML = `
        <!-- لیست سمت راست (مستر) -->
        <div class="w-full lg:w-1/3 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-[300px] lg:h-full shrink-0">
            <div class="p-3 border-b border-slate-100 flex gap-2 bg-slate-50 items-center sticky top-0 z-10">
                <input type="text" id="search-formulas" placeholder="جستجو..." class="input-field text-xs h-10">
                <button id="btn-open-new-formula" class="bg-teal-600 text-white w-10 h-10 rounded-xl font-bold shadow text-xl hover:bg-teal-700 shrink-0 transition-colors" type="button">+</button>
            </div>
            <div id="formula-master-list" class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar"></div>
        </div>
        
        <!-- پنل جزئیات (وسط) -->
        <div class="w-full lg:w-2/3 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative min-h-[500px] lg:h-full" id="detail-panel">
            
            <!-- حالت خالی -->
            <div id="formula-detail-empty" class="absolute inset-0 flex flex-col items-center justify-center text-slate-300 bg-white z-10 p-4 text-center">
                <span class="text-5xl mb-4 opacity-20">🏗️</span>
                <p class="text-sm font-bold text-slate-400">محصولی انتخاب نشده است</p>
            </div>
            
            <!-- حالت نمایش جزئیات -->
            <div id="formula-detail-view" class="hidden flex-col h-full w-full absolute inset-0 z-20 bg-white">
                
                <!-- هدر فرمول -->
                <div class="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <div class="overflow-hidden mr-2">
                        <h2 id="active-formula-name" class="text-base font-bold text-slate-800 cursor-pointer truncate hover:text-teal-600 border-b border-dashed border-slate-300 pb-1">---</h2>
                        <span class="text-[10px] text-slate-400 block mt-1" id="active-formula-date"></span>
                    </div>
                    <div class="flex gap-1 shrink-0">
                        <button id="btn-duplicate-formula" class="btn btn-white border border-blue-200 text-blue-500 py-1 px-2 text-xs shadow-none" title="کپی">📑</button>
                        <button id="btn-print" class="btn btn-white border border-slate-200 text-slate-600 py-1 px-2 text-xs shadow-none" title="چاپ">🖨</button>
                        <button id="btn-delete-formula" class="btn btn-white border border-rose-200 text-rose-500 py-1 px-2 text-xs shadow-none" title="حذف">🗑</button>
                    </div>
                </div>

                <!-- فرم افزودن کالا -->
                <div class="p-3 border-b border-slate-100 bg-white shadow-sm z-20 shrink-0">
                    <form id="form-add-comp" class="flex flex-col gap-2">
                        <div class="flex gap-2 w-full">
                            <select id="comp-filter" class="input-field w-1/3 text-[10px] bg-slate-50 h-9 px-1 truncate"><option value="">همه...</option></select>
                            <select id="comp-select" class="input-field w-2/3 text-xs h-9 font-bold" required></select>
                        </div>
                        <div class="flex gap-2 w-full items-center">
                            <div class="w-1/3 relative">
                                <select id="comp-unit-select" class="input-field text-[10px] h-9 bg-slate-50 px-1" required>
                                    <option value="default">-</option>
                                </select>
                            </div>
                            <div class="w-1/3 relative">
                                <input type="number" step="any" id="comp-qty" placeholder="تعداد" class="input-field text-center font-bold h-9 text-sm" required>
                            </div>
                            <button class="btn btn-primary w-1/3 h-9 text-xs shadow-md" type="submit">افزودن</button>
                        </div>
                    </form>
                </div>

                <!-- لیست اجزا -->
                <div class="flex-1 overflow-y-auto bg-slate-50/30 relative w-full">
                    <div class="text-[10px] text-slate-400 px-4 py-2 border-b flex justify-between bg-slate-50 sticky top-0 z-10">
                        <span>اجزاء و واحد انتخاب شده</span>
                        <span>هزینه کل</span>
                    </div>
                    <div id="formula-comps-list" class="divide-y divide-slate-100 pb-20 w-full"></div>
                </div>

                <!-- فوتر مالی -->
                <div class="p-4 bg-slate-800 text-slate-200 border-t border-slate-700 shadow-inner z-30 shrink-0">
                    <div class="grid grid-cols-3 gap-2 mb-3">
                        <div><label class="text-[10px] text-slate-400 block mb-1 text-center">دستمزد</label><input id="inp-labor" class="w-full bg-slate-700 border border-slate-600 rounded p-2 text-center text-white text-sm price-input"></div>
                        <div><label class="text-[10px] text-slate-400 block mb-1 text-center">سربار</label><input id="inp-overhead" class="w-full bg-slate-700 border border-slate-600 rounded p-2 text-center text-white text-sm price-input"></div>
                        <div><label class="text-[10px] text-slate-400 block mb-1 text-center">سود %</label><input type="number" id="inp-profit" class="w-full bg-slate-700 border border-slate-600 rounded p-2 text-center text-white text-sm"></div>
                    </div>
                    <div class="flex justify-between items-end pt-3 border-t border-slate-700">
                        <span class="text-xs text-slate-400 mb-1">قیمت نهایی:</span>
                        <div class="text-right"><span id="lbl-final-price" class="text-xl md:text-2xl font-black text-teal-400 tracking-tight">0</span> <span class="text-[10px] text-slate-500 mr-1">تومان</span></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function parseComponents(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        if (typeof parsed === 'string') return JSON.parse(parsed); 
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error("Error parsing components:", e);
        return [];
    }
}

export function renderFormulaList(filterText = '') {
    const el = document.getElementById('formula-master-list');
    if (!el) return;
    const list = state.formulas.filter(f => f.name.includes(filterText));
    if (!list.length) { el.innerHTML = '<p class="text-center text-slate-400 text-xs mt-10">موردی یافت نشد</p>'; return; }
    
    el.innerHTML = list.map(f => {
        const calc = calculateCost(f); 
        const isActive = f.$id === state.activeFormulaId;
        const comps = parseComponents(f.components);

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
    
    const listEl = document.getElementById('formula-comps-list');
    if (listEl) {
        const comps = parseComponents(f.components);
        if (comps.length === 0) {
            listEl.innerHTML = '<div class="p-8 text-center text-slate-400 text-xs">اجزای سازنده را اضافه کنید...</div>';
        } else {
            listEl.innerHTML = comps.map((c, idx) => {
                try {
                    return generateComponentRow(c, idx);
                } catch (err) {
                    return `<div class="p-2 text-xs text-red-500 border-b">خطا در نمایش آیتم ${idx + 1}</div>`;
                }
            }).join('');
        }
    }
    
    // نمایش قیمت نهایی
    const calc = calculateCost(f);
    const lblFinal = document.getElementById('lbl-final-price');
    if(lblFinal) lblFinal.innerText = formatPrice(calc.final);
    
    updateDropdowns();
    updateCompSelect(); 
}

// تابع کمکی برای تولید HTML هر سطر جزء
function generateComponentRow(c, idx) {
    let name = '---', unitName = '-', price = 0, total = 0;
    let taxBadge = '', warning = '';
    
    if (!c.id) return ''; 

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
            } catch(e) { price = m.price || 0; warning = '⚠️'; }
        } else { 
            name = `کالای حذف شده`; warning = '❌'; 
        }
    } else if (type.includes('form')) {
        const sub = state.formulas.find(x => x.$id === c.id);
        if (sub) { 
            name = `🔗 ${sub.name}`; unitName = 'عدد'; price = calculateCost(sub).final; 
        } else { name = 'فرمول حذف شده'; warning = '❌'; }
    } else { name = `نوع نامشخص`; warning = '❓'; }
    
    total = price * (c.qty || 0);
    
    return `
    <div class="flex justify-between items-center p-3 text-sm hover:bg-slate-50 group border-b border-slate-50">
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
            <button type="button" class="text-rose-400 lg:opacity-0 group-hover:opacity-100 px-2 btn-del-comp transition-opacity" data-idx="${idx}">×</button>
        </div>
    </div>`;
}

export function updateDropdowns() {
    const filterEl = document.getElementById('comp-filter');
    if (!filterEl) return;
    const current = filterEl.value;
    const cats = state.categories.map(x => `<option value="${x.$id}">${x.name}</option>`).join('');
    
    filterEl.innerHTML = `<option value="">همه دسته‌ها...</option>${cats}<option value="FORM">فرمول‌ها (محصولات)</option>`;
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
            if (mats.length) html += `<optgroup label="${cat.name}">` + mats.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + `</optgroup>`;
        });
        if (!filter || filter === '') {
            const uncategorized = state.materials.filter(x => !x.category_id || !validCategoryIds.has(x.category_id));
            if (uncategorized.length) html += `<optgroup label="سایر">` + uncategorized.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + `</optgroup>`;
        }
    }
    sel.innerHTML = html;
    const evt = new Event('change'); sel.dispatchEvent(evt);
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