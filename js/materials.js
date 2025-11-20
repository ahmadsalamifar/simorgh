import { api } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { formatPrice, parseLocaleNumber, getDateBadge } from './utils.js';

let currentUnitRelations = []; 

export function setupMaterials(refreshCallback) {
    document.getElementById('material-form').onsubmit = (e) => { e.preventDefault(); saveMaterial(refreshCallback); };
    
    const cancelBtn = document.getElementById('mat-cancel-btn');
    if(cancelBtn) cancelBtn.onclick = resetMatForm;

    const searchInp = document.getElementById('search-materials');
    if(searchInp) searchInp.oninput = (e) => renderMaterials(e.target.value);

    const sortSel = document.getElementById('sort-materials');
    if(sortSel) sortSel.onchange = () => renderMaterials();

    const addRelBtn = document.getElementById('btn-add-relation');
    if(addRelBtn) addRelBtn.onclick = addRelationRow;

    // --- ویژگی جدید: دکمه مثبت (+) برای کالای جدید ---
    // این دکمه را در هدر سایدبار پیدا و متصل می‌کنیم (اگر در HTML نباشد می‌سازیم)
    const sidebarHeader = document.querySelector('#tab-materials h3');
    if(sidebarHeader && !document.getElementById('btn-new-mat-plus')) {
        const btn = document.createElement('button');
        btn.id = 'btn-new-mat-plus';
        btn.type = 'button';
        btn.className = 'bg-emerald-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-lg font-bold shadow mr-auto hover:bg-emerald-600';
        btn.innerHTML = '+';
        btn.title = 'کالای جدید';
        btn.onclick = () => {
            resetMatForm();
            // فوکوس روی فیلد نام
            document.getElementById('mat-name').focus();
        };
        sidebarHeader.parentNode.insertBefore(btn, sidebarHeader.nextSibling);
        // استایل والد را درست می‌کنیم که دکمه کنار متن بیفتد
        sidebarHeader.parentNode.classList.add('flex', 'items-center', 'justify-between');
    }
    
    // ---------------------------------------------------------
    // رفع باگ اینپوت قیمت (تایپ راحت)
    // ---------------------------------------------------------
    const priceInput = document.getElementById('mat-price');
    if(priceInput) {
        // تمام ایونت‌های قبلی را حذف می‌کنیم (با جایگزینی نود)
        const newPriceInput = priceInput.cloneNode(true);
        priceInput.parentNode.replaceChild(newPriceInput, priceInput);
        
        // لاجیک جدید: موقع فوکوس عدد خام، موقع بلور عدد فرمت شده
        newPriceInput.onfocus = (e) => {
            const val = parseLocaleNumber(e.target.value);
            if(val > 0) e.target.value = val; 
        };
        newPriceInput.onblur = (e) => {
            const val = parseLocaleNumber(e.target.value);
            // اگر خالی بود صفر نگذار، اگر عدد بود فرمت کن
            if(val > 0) e.target.value = formatPrice(val);
        };
    }
    
    const baseUnitSelect = document.getElementById('mat-base-unit-select');
    if(baseUnitSelect) baseUnitSelect.onchange = updateUnitDropdowns;
    
    // محاسبه واحد هنگام تغییر دراپ‌داون‌ها
    ['mat-purchase-unit', 'mat-scraper-unit'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.onchange = calculateScraperFactor;
    });

    // ---------------------------------------------------------
    // دکمه استعلام قیمت (فقط بررسی تکی)
    // ---------------------------------------------------------
    const scraperBtn = document.getElementById('btn-scraper-trigger');
    if(scraperBtn) scraperBtn.onclick = async () => {
        const url = document.getElementById('mat-scraper-url').value;
        const anchor = document.getElementById('mat-scraper-anchor').value;
        const scraperFactor = parseFloat(document.getElementById('mat-scraper-factor').value) || 1;

        if(!url) { alert('لطفاً لینک سایت را وارد کنید.'); return; }
        
        scraperBtn.innerText = '⏳ ...';
        scraperBtn.disabled = true;

        try {
            // فقط استعلام قیمت (بدون ذخیره در دیتابیس)
            const result = await api.runScraper({ type: 'single_check', url, anchor, factor: scraperFactor });
            
            if(result.success && result.data) {
                const foundPrice = result.data.final_price;
                // ست کردن قیمت در فیلد
                document.getElementById('mat-price').value = formatPrice(foundPrice);
                // افکت بصری موفقیت
                const priceField = document.getElementById('mat-price');
                priceField.classList.add('ring-2', 'ring-emerald-400');
                setTimeout(() => priceField.classList.remove('ring-2', 'ring-emerald-400'), 2000);
                
                // نمایش پیام کوتاه
                const msg = document.createElement('div');
                msg.className = 'text-[10px] text-emerald-600 mt-1 font-bold';
                msg.innerText = `قیمت یافت شد: ${formatPrice(foundPrice)}`;
                scraperBtn.parentNode.appendChild(msg);
                setTimeout(() => msg.remove(), 4000);

            } else {
                alert('خطا: ' + (result.error || 'قیمت یافت نشد.'));
            }
        } catch(e) {
            alert('خطا: ' + e.message);
        } finally {
            scraperBtn.innerText = '🤖 استعلام';
            scraperBtn.disabled = false;
        }
    };
}

// --- توابع کمکی UI ---

function renderRelationsUI() {
    const container = document.getElementById('unit-relations-container');
    if(!container) return;
    container.innerHTML = '';
    const baseElem = document.getElementById('mat-base-unit-select');
    const baseUnitName = baseElem ? (baseElem.value || 'واحد پایه') : 'واحد پایه';
    
    currentUnitRelations.forEach((rel, index) => {
        const options = state.units.map(u => `<option value="${u.name}" ${u.name === rel.name ? 'selected' : ''}>${u.name}</option>`).join('');
        const row = document.createElement('div');
        row.className = 'flex items-center gap-1 bg-white p-1 rounded border border-slate-200 mb-1 shadow-sm text-xs';
        row.innerHTML = `
            <input type="number" class="input-field w-12 text-center p-1 h-7 bg-slate-50 rel-qty-unit" value="${rel.qtyUnit || 1}">
            <select class="input-field w-24 px-1 h-7 text-[10px] rel-name-select">${options}</select>
            <span>=</span>
            <input type="number" class="input-field w-12 text-center p-1 h-7 bg-slate-50 rel-qty-base" value="${rel.qtyBase || 1}">
            <span class="w-12 truncate text-[10px] base-unit-label">${baseUnitName}</span>
            <button type="button" class="text-rose-500 px-2 btn-remove-rel text-lg">×</button>
        `;
        const updateRow = () => {
            currentUnitRelations[index].name = row.querySelector('.rel-name-select').value;
            currentUnitRelations[index].qtyUnit = parseFloat(row.querySelector('.rel-qty-unit').value) || 1;
            currentUnitRelations[index].qtyBase = parseFloat(row.querySelector('.rel-qty-base').value) || 1;
            updateUnitDropdowns();
        };
        row.querySelectorAll('input, select').forEach(el => el.onchange = updateRow);
        row.querySelector('.btn-remove-rel').onclick = () => { currentUnitRelations.splice(index, 1); renderRelationsUI(); updateUnitDropdowns(); };
        container.appendChild(row);
    });
}

function addRelationRow() {
    const usedNames = currentUnitRelations.map(r => r.name);
    const available = state.units.find(u => !usedNames.includes(u.name));
    const name = available ? available.name : (state.units[0]?.name || 'Unit');
    currentUnitRelations.push({ name: name, qtyUnit: 1, qtyBase: 1 });
    renderRelationsUI();
    updateUnitDropdowns();
}

function updateUnitDropdowns() {
    const baseElem = document.getElementById('mat-base-unit-select');
    if(!baseElem) return;
    const baseUnit = baseElem.value;
    let availableUnits = [baseUnit];
    currentUnitRelations.forEach(r => availableUnits.push(r.name));
    availableUnits = [...new Set(availableUnits)]; // حذف تکراری
    
    const optionsHtml = availableUnits.map(u => `<option value="${u}">${u}</option>`).join('');
    
    ['mat-purchase-unit', 'mat-consumption-unit', 'mat-scraper-unit'].forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            const prev = el.value;
            el.innerHTML = optionsHtml;
            // اگر مقدار قبلی هنوز معتبر است، نگهش دار. وگرنه اولی را انتخاب کن
            if(availableUnits.includes(prev)) el.value = prev;
            else el.value = availableUnits[0];
        }
    });
    
    document.querySelectorAll('.base-unit-label').forEach(el => el.innerText = baseUnit);
    calculateScraperFactor();
}

function getFactorToBase(unitName) {
    const baseElem = document.getElementById('mat-base-unit-select');
    if (!baseElem || unitName === baseElem.value) return 1;
    const rel = currentUnitRelations.find(r => r.name === unitName);
    return rel ? (rel.qtyBase / rel.qtyUnit) : 1;
}

function calculateScraperFactor() {
    const sSelect = document.getElementById('mat-scraper-unit');
    const pSelect = document.getElementById('mat-purchase-unit');
    const factorInput = document.getElementById('mat-scraper-factor');
    if(!sSelect || !pSelect || !factorInput) return;
    
    const sFactor = getFactorToBase(sSelect.value);
    const pFactor = getFactorToBase(pSelect.value);
    
    let rate = 1;
    if (sFactor !== 0) rate = pFactor / sFactor;
    factorInput.value = parseFloat(rate.toFixed(4)); 
}

// ---------------------------------------------------------
// ذخیره کالا (Fix: جلوگیری از ارسال مقادیر خالی)
// ---------------------------------------------------------
async function saveMaterial(cb) {
    const id = document.getElementById('mat-id').value;
    calculateScraperFactor(); 
    
    const purchaseUnitVal = document.getElementById('mat-purchase-unit').value || 'عدد';
    const consumptionUnitVal = document.getElementById('mat-consumption-unit') ? document.getElementById('mat-consumption-unit').value : purchaseUnitVal;

    // اطمینان از عددی بودن قیمت
    const rawPrice = document.getElementById('mat-price').value;
    const priceNum = parseLocaleNumber(rawPrice);
    if(isNaN(priceNum)) { alert('قیمت نامعتبر است'); return; }

    const data = {
        name: document.getElementById('mat-name').value,
        display_name: document.getElementById('mat-display-name').value || null,
        category_id: document.getElementById('mat-category').value || null,
        price: priceNum,
        scraper_url: document.getElementById('mat-scraper-url').value || null,
        scraper_anchor: document.getElementById('mat-scraper-anchor').value || null,
        
        unit: purchaseUnitVal, 
        purchase_unit: purchaseUnitVal,
        consumption_unit: consumptionUnitVal || purchaseUnitVal,
        
        scraper_factor: parseFloat(document.getElementById('mat-scraper-factor').value) || 1,
        has_tax: document.getElementById('mat-has-tax').checked,
        
        unit_relations: JSON.stringify({
            base: document.getElementById('mat-base-unit-select').value,
            others: currentUnitRelations,
            selected_purchase: purchaseUnitVal,
            selected_consumption: consumptionUnitVal,
            selected_scraper: document.getElementById('mat-scraper-unit').value
        })
    };

    try {
        if(id) await api.update(APPWRITE_CONFIG.COLS.MATS, id, data);
        else await api.create(APPWRITE_CONFIG.COLS.MATS, data);
        
        resetMatForm();
        cb(); // رفرش لیست
    } catch(e){ 
        alert('خطا در ذخیره: ' + e.message); 
        console.error(e);
    }
}

export function renderMaterials(filter='') {
    // اگر لیست واحدها خالی است، پر کن (برای نمایش صحیح واحد در فرم)
    const baseSelect = document.getElementById('mat-base-unit-select');
    if(baseSelect && state.units.length > 0 && baseSelect.options.length === 0) {
        baseSelect.innerHTML = state.units.map(u => `<option value="${u.name}">${u.name}</option>`).join('');
        updateUnitDropdowns(); 
    }

    const sortElem = document.getElementById('sort-materials');
    const sort = sortElem ? sortElem.value : 'update_desc';
    
    let list = state.materials.filter(m => m.name.includes(filter) || (m.display_name && m.display_name.includes(filter)));
    
    list.sort((a,b) => {
        if(sort === 'price_desc') return b.price - a.price;
        if(sort === 'price_asc') return a.price - b.price;
        return new Date(b.$updatedAt) - new Date(a.$updatedAt);
    });
    
    const el = document.getElementById('materials-container');
    if(!el) return;
    if(!list.length) { el.innerHTML='<p class="col-span-full text-center text-slate-400 text-xs">یافت نشد</p>'; return; }
    
    el.innerHTML = list.map(m => {
        const cat = state.categories.find(c => c.$id === m.category_id)?.name || '-';
        const pUnit = m.purchase_unit || m.unit || 'واحد'; 
        
        let taxBadge = '';
        let borderClass = 'border-slate-100';
        if (m.has_tax) {
            taxBadge = '<span class="text-[9px] font-bold bg-rose-100 text-rose-600 px-1.5 rounded ml-1">مالیات</span>';
            borderClass = 'border-rose-200 ring-1 ring-rose-50';
        }

        return `
        <div class="bg-white p-3 rounded-xl border ${borderClass} group relative hover:shadow-md transition-all shadow-sm">
            <div class="flex justify-between mb-1 items-start">
                <div class="flex flex-col gap-1">
                    <div class="flex items-center">
                        <span class="text-[10px] bg-slate-50 px-2 rounded text-slate-500 border border-slate-100 w-fit">${cat}</span>
                        ${taxBadge}
                    </div>
                    <div class="font-bold text-sm text-slate-800 truncate mt-1" title="${m.name}">${m.name}</div>
                </div>
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 left-2 bg-white pl-1">
                    <button class="text-amber-500 px-1 btn-edit-mat hover:bg-amber-50 rounded" data-id="${m.$id}">✎</button>
                    <button class="text-rose-500 px-1 btn-del-mat hover:bg-rose-50 rounded" data-id="${m.$id}">×</button>
                </div>
            </div>
            <div class="flex justify-between items-end mt-2 pt-2 border-t border-dashed border-slate-100">
                 <span class="text-[10px] text-slate-400">${getDateBadge(m.$updatedAt)}</span>
                 <div class="text-right">
                     <span class="font-bold text-teal-700 text-lg">${formatPrice(m.price)}</span>
                     <span class="text-[10px] text-slate-400 mr-1">تومان / ${pUnit}</span>
                </div>
            </div>
        </div>`;
    }).join('');
    
    el.querySelectorAll('.btn-edit-mat').forEach(b => b.onclick = () => editMat(b.dataset.id));
    el.querySelectorAll('.btn-del-mat').forEach(b => b.onclick = async () => {
        if(confirm('حذف شود؟')) { try { await api.delete(APPWRITE_CONFIG.COLS.MATS, b.dataset.id); refreshCallback(); } catch(e) { alert(e.message); } }
    });
}

function editMat(id) {
    const m = state.materials.find(x => x.$id === id);
    if(!m) return;
    
    resetMatForm();

    document.getElementById('mat-id').value = m.$id;
    document.getElementById('mat-name').value = m.name;
    document.getElementById('mat-display-name').value = m.display_name || '';
    document.getElementById('mat-category').value = m.category_id || '';
    document.getElementById('mat-has-tax').checked = !!m.has_tax; 
    
    // ست کردن قیمت
    const priceInput = document.getElementById('mat-price');
    priceInput.value = formatPrice(m.price);
    
    document.getElementById('mat-scraper-url').value = m.scraper_url || '';
    document.getElementById('mat-scraper-anchor').value = m.scraper_anchor || '';
    
    try {
        const rels = JSON.parse(m.unit_relations || '{}');
        const baseSelect = document.getElementById('mat-base-unit-select');
        
        // پر کردن واحد پایه
        if(state.units.length === 0) baseSelect.innerHTML = `<option value="${rels.base || 'عدد'}">${rels.base || 'عدد'}</option>`;
        if(rels.base) baseSelect.value = rels.base;

        currentUnitRelations = (rels.others || []).map(r => ({ name: r.name, qtyUnit: r.qtyUnit || 1, qtyBase: r.qtyBase || 1 }));
        
        renderRelationsUI(); 
        updateUnitDropdowns();
        
        // انتخاب واحدهای ذخیره شده
        const savedP = rels.selected_purchase || m.purchase_unit || m.unit;
        if(savedP) {
             const pEl = document.getElementById('mat-purchase-unit');
             if(![...pEl.options].some(o=>o.value===savedP)) {
                 pEl.innerHTML += `<option value="${savedP}">${savedP}</option>`;
             }
             pEl.value = savedP;
        }
        // ... سایر واحدها ...
        
        calculateScraperFactor(); 
    } catch(e) { 
        console.error("Parse Error", e);
        currentUnitRelations = []; 
        renderRelationsUI(); 
    }

    const btn = document.getElementById('mat-submit-btn');
    if(btn) btn.innerText = 'ذخیره تغییرات';
    document.getElementById('mat-cancel-btn').classList.remove('hidden');
    
    if(window.innerWidth < 768) document.getElementById('tab-materials').scrollIntoView({behavior:'smooth'});
}

function resetMatForm() {
    document.getElementById('material-form').reset();
    document.getElementById('mat-id').value = '';
    currentUnitRelations = [];
    renderRelationsUI();
    updateUnitDropdowns();
    
    const btn = document.getElementById('mat-submit-btn');
    if(btn) btn.innerText = 'ذخیره کالا';
    document.getElementById('mat-cancel-btn').classList.add('hidden');
}
