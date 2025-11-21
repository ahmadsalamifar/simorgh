import { api } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { formatPrice, parseLocaleNumber, getDateBadge } from './utils.js';
import * as Units from './materials_units.js';
import * as Scraper from './materials_scraper.js';

export function setupMaterials(refreshCallback) {
    // 1. مدیریت فرم و ذخیره
    const form = document.getElementById('material-form');
    if (form) form.onsubmit = (e) => { e.preventDefault(); saveMaterial(refreshCallback); };
    
    const cancelBtn = document.getElementById('mat-cancel-btn');
    if (cancelBtn) cancelBtn.onclick = resetMatForm;

    // 2. لیست و جستجو
    const searchInp = document.getElementById('search-materials');
    if (searchInp) searchInp.oninput = (e) => renderMaterials(e.target.value);

    const sortSel = document.getElementById('sort-materials');
    if (sortSel) sortSel.onchange = () => renderMaterials();

    // 3. مدیریت واحدها
    const addRelBtn = document.getElementById('btn-add-relation');
    if (addRelBtn) addRelBtn.onclick = Units.addRelationRow;
    
    const baseUnitSelect = document.getElementById('mat-base-unit-select');
    if (baseUnitSelect) baseUnitSelect.onchange = Units.updateUnitDropdowns;
    
    // محاسبه اتوماتیک ضریب اسکرپر با تغییر واحدها
    ['mat-price-unit', 'mat-scraper-unit'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.onchange = Units.calculateScraperFactor;
    });

    // 4. راه‌اندازی دکمه‌های اسکرپر
    Scraper.setupScraperListeners(refreshCallback);

    // 5. دکمه افزودن جدید
    const btnNew = document.getElementById('btn-new-mat-plus');
    if (btnNew) {
        btnNew.onclick = () => {
            resetMatForm();
            // اسکرول به فرم در موبایل
            if (window.innerWidth < 1024) {
                const formEl = document.getElementById('material-form');
                formEl?.scrollIntoView({behavior:'smooth'});
                formEl?.classList.add('ring-2', 'ring-emerald-200');
                setTimeout(() => formEl?.classList.remove('ring-2', 'ring-emerald-200'), 1000);
            }
            setTimeout(() => document.getElementById('mat-name').focus(), 300);
        };
    }

    setupPriceInput();
    setupCurrencyToggle();
}

function setupCurrencyToggle() {
    const btns = document.querySelectorAll('.currency-toggle .currency-btn');
    const input = document.getElementById('mat-scraper-currency');
    
    if (!input) return;
    
    btns.forEach(btn => {
        btn.onclick = () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            input.value = btn.dataset.val;
        };
    });
}

function setupPriceInput() {
    const priceInput = document.getElementById('mat-price');
    if (!priceInput) return;
    
    priceInput.onfocus = (e) => {
        const val = parseLocaleNumber(e.target.value);
        e.target.value = val !== 0 ? val : '';
        e.target.select();
    };
    priceInput.onblur = (e) => {
        const val = parseLocaleNumber(e.target.value);
        e.target.value = val > 0 ? formatPrice(val) : ''; 
    };
}

async function saveMaterial(cb) {
    const id = document.getElementById('mat-id').value;
    
    // دریافت اطلاعات واحدها
    const unitData = Units.getUnitData();
    // ذخیره واحد پولی اسکرپر داخل آبجکت واحدها
    unitData.scraper_currency = document.getElementById('mat-scraper-currency').value || 'toman';

    // واحد خرید و مصرف (اگر انتخاب نشده بود همان پایه است)
    const purchaseUnitVal = unitData.selected_purchase || unitData.base || 'عدد';
    const consumptionUnitVal = unitData.selected_consumption || purchaseUnitVal;

    const rawPrice = document.getElementById('mat-price').value;
    const priceNum = parseLocaleNumber(rawPrice); 

    const data = {
        name: document.getElementById('mat-name').value,
        display_name: document.getElementById('mat-display-name').value || null,
        category_id: document.getElementById('mat-category').value || null,
        price: priceNum, 
        
        // Scraper fields
        scraper_url: document.getElementById('mat-scraper-url').value || null,
        scraper_anchor: document.getElementById('mat-scraper-anchor').value || null,
        scraper_factor: parseFloat(document.getElementById('mat-scraper-factor').value) || 1,
        
        // Units
        unit: purchaseUnitVal, // Backward compatibility
        purchase_unit: purchaseUnitVal,
        consumption_unit: consumptionUnitVal,
        unit_relations: JSON.stringify(unitData),
        
        has_tax: document.getElementById('mat-has-tax').checked
    };

    try {
        if (id) {
            await api.update(APPWRITE_CONFIG.COLS.MATS, id, data);
        } else {
            await api.create(APPWRITE_CONFIG.COLS.MATS, data);
        }
        
        resetMatForm();
        cb(); 
        // alert('✅ کالا ذخیره شد');
    } catch(e) { 
        console.error(e);
        alert('❌ خطا در ذخیره: ' + e.message); 
    }
}

export function renderMaterials(filter = '') {
    // اگر لیست واحدها لود شده ولی دراپ‌داون خالیست، پرش کن
    if (document.getElementById('mat-base-unit-select').options.length === 0 && state.units.length > 0) {
        Units.resetUnitData();
    }

    const sortElem = document.getElementById('sort-materials');
    const sort = sortElem ? sortElem.value : 'update_desc';
    
    // فیلتر
    let list = state.materials.filter(m => m.name.includes(filter) || (m.display_name && m.display_name.includes(filter)));
    
    // مرتب‌سازی
    list.sort((a,b) => {
        if(sort === 'price_desc') return b.price - a.price;
        if(sort === 'price_asc') return a.price - b.price;
        if(sort === 'name_asc') return a.name.localeCompare(b.name, 'fa');
        if(sort === 'category') {
            const getCatName = (id) => state.categories.find(cat => cat.$id === id)?.name || 'zzz';
            return getCatName(a.category_id).localeCompare(getCatName(b.category_id), 'fa');
        }
        return new Date(b.$updatedAt) - new Date(a.$updatedAt);
    });
    
    const el = document.getElementById('materials-container');
    if(!el) return;
    
    if(!list.length) { 
        el.innerHTML = '<p class="col-span-full text-center text-slate-400 text-xs">موردی یافت نشد</p>'; 
        return; 
    }
    
    el.innerHTML = list.map(m => createMaterialCard(m)).join('');
    
    // Attach Events
    el.querySelectorAll('.btn-edit-mat').forEach(b => b.onclick = () => editMat(b.dataset.id));
    el.querySelectorAll('.btn-del-mat').forEach(b => b.onclick = async () => {
        if(confirm(`کالای "${state.materials.find(x=>x.$id==b.dataset.id)?.name}" حذف شود؟`)) { 
            try { await api.delete(APPWRITE_CONFIG.COLS.MATS, b.dataset.id); renderMaterials(); } // Optimistic UI update: renderMaterials needs to refetch data usually, but here we rely on caller. Better to call cb. But for now simple re-render.
            catch(e) { alert(e.message); } 
        }
    });
}

function createMaterialCard(m) {
    const cat = state.categories.find(c => c.$id === m.category_id)?.name || '-';
    const pUnit = m.purchase_unit || m.unit || 'واحد'; 
    
    const hasLink = m.scraper_url && m.scraper_url.length > 5;
    const linkIcon = hasLink ? `<a href="${m.scraper_url}" target="_blank" class="text-blue-500 hover:text-blue-700 ml-1 text-lg" title="لینک منبع">🔗</a>` : '';

    const taxBadge = m.has_tax ? '<span class="text-[9px] font-bold bg-rose-100 text-rose-600 px-1.5 rounded ml-1">مالیات</span>' : '';
    const borderClass = m.has_tax ? 'border-rose-200 ring-1 ring-rose-50' : 'border-slate-100';
    const taxInfo = m.has_tax ? `<div class="text-[10px] text-rose-500 mt-0.5 font-bold">با مالیات: ${formatPrice(m.price * 1.10)}</div>` : '';

    return `
    <div class="bg-white p-3 rounded-xl border ${borderClass} group relative hover:shadow-md transition-all shadow-sm">
        <div class="flex justify-between mb-1 items-start">
            <div class="flex flex-col gap-1 overflow-hidden w-full">
                <div class="flex items-center">
                    <span class="text-[10px] bg-slate-50 px-2 rounded text-slate-500 border border-slate-100 w-fit truncate max-w-[100px]">${cat}</span>
                    ${taxBadge}
                </div>
                <div class="font-bold text-sm text-slate-800 truncate mt-1 flex items-center gap-1" title="${m.name}">
                    ${linkIcon} ${m.name}
                </div>
            </div>
            <div class="flex gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 left-2 bg-white pl-1 shadow-sm rounded border border-slate-100 lg:border-none lg:shadow-none lg:bg-transparent">
                <button class="text-amber-500 px-2 lg:px-1 btn-edit-mat hover:bg-amber-50 rounded" data-id="${m.$id}">✎</button>
                <button class="text-rose-500 px-2 lg:px-1 btn-del-mat hover:bg-rose-50 rounded" data-id="${m.$id}">×</button>
            </div>
        </div>
        <div class="flex justify-between items-end mt-2 pt-2 border-t border-dashed border-slate-100">
             <span class="text-[10px] text-slate-400">${getDateBadge(m.$updatedAt)}</span>
             <div class="text-right flex flex-col items-end">
                 <div>
                    <span class="font-bold text-teal-700 text-lg">${formatPrice(m.price)}</span>
                    <span class="text-[10px] text-slate-400 mr-1">تومان / ${pUnit}</span>
                 </div>
                 ${taxInfo}
            </div>
        </div>
    </div>`;
}

function editMat(id) {
    const m = state.materials.find(x => x.$id === id);
    if (!m) return;
    
    resetMatForm();

    document.getElementById('mat-id').value = m.$id;
    document.getElementById('mat-name').value = m.name;
    document.getElementById('mat-display-name').value = m.display_name || '';
    document.getElementById('mat-category').value = m.category_id || '';
    document.getElementById('mat-has-tax').checked = !!m.has_tax; 
    
    const pInput = document.getElementById('mat-price');
    if(pInput) pInput.value = formatPrice(m.price);
    
    document.getElementById('mat-scraper-url').value = m.scraper_url || '';
    document.getElementById('mat-scraper-anchor').value = m.scraper_anchor || '';
    document.getElementById('mat-scraper-factor').value = m.scraper_factor || 1;

    // بازیابی وضعیت ارز
    try {
        const rels = typeof m.unit_relations === 'string' ? JSON.parse(m.unit_relations) : (m.unit_relations || {});
        const currency = rels.scraper_currency || 'toman';
        document.getElementById('mat-scraper-currency').value = currency;
        
        document.querySelectorAll('.currency-toggle .currency-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.val === currency);
        });
        
        Units.setUnitData(rels);
    } catch(e) { Units.resetUnitData(); }

    const btn = document.getElementById('mat-submit-btn');
    if(btn) btn.innerText = 'ذخیره تغییرات';
    document.getElementById('mat-cancel-btn').classList.remove('hidden');
    
    // اسکرول به فرم
    if(window.innerWidth < 768) document.getElementById('tab-materials').scrollIntoView({behavior:'smooth'});
}

function resetMatForm() {
    document.getElementById('material-form').reset();
    document.getElementById('mat-id').value = '';
    
    // ریست دکمه‌های ارز
    document.getElementById('mat-scraper-currency').value = 'toman';
    document.querySelectorAll('.currency-toggle .currency-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.val === 'toman');
    });

    Units.resetUnitData();
    
    const btn = document.getElementById('mat-submit-btn');
    if(btn) btn.innerText = 'ذخیره کالا';
    document.getElementById('mat-cancel-btn').classList.add('hidden');
}