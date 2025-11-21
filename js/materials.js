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
    if(cancelBtn) cancelBtn.onclick = resetMatForm;

    // 2. لیست و جستجو
    const searchInp = document.getElementById('search-materials');
    if(searchInp) searchInp.oninput = (e) => renderMaterials(e.target.value);

    const sortSel = document.getElementById('sort-materials');
    if(sortSel) sortSel.onchange = () => renderMaterials();

    // 3. مدیریت واحدها
    const addRelBtn = document.getElementById('btn-add-relation');
    if(addRelBtn) addRelBtn.onclick = Units.addRelationRow;
    
    const baseUnitSelect = document.getElementById('mat-base-unit-select');
    if(baseUnitSelect) baseUnitSelect.onchange = Units.updateUnitDropdowns;
    
    ['mat-price-unit', 'mat-scraper-unit'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.onchange = Units.calculateScraperFactor;
    });

    // 4. اسکرپر
    Scraper.setupScraperListeners(refreshCallback);

    // 5. دکمه مثبت (New)
    setupAddButton();

    // 6. اصلاح باگ اینپوت قیمت (مهم)
    setupPriceInput();
}

function setupAddButton() {
    const sidebarHeader = document.querySelector('#tab-materials h3');
    if(sidebarHeader && !document.getElementById('btn-new-mat-plus')) {
        const container = document.createElement('div');
        container.className = "flex items-center justify-between w-full mb-2";
        sidebarHeader.parentNode.insertBefore(container, sidebarHeader);
        container.appendChild(sidebarHeader);
        
        const btn = document.createElement('button');
        btn.id = 'btn-new-mat-plus';
        btn.type = 'button';
        btn.className = 'bg-emerald-500 text-white rounded-lg w-8 h-8 flex items-center justify-center text-xl font-bold shadow hover:bg-emerald-600 transition-colors pb-1';
        btn.innerHTML = '+';
        btn.onclick = () => {
            resetMatForm();
            // اسکرول به بالا برای موبایل
            document.getElementById('tab-materials').scrollIntoView({behavior:'smooth'});
            setTimeout(() => document.getElementById('mat-name').focus(), 300);
        };
        container.appendChild(btn);
    }
}

// حل مشکل باگ تایپ قیمت: استفاده از Focus/Blur
function setupPriceInput() {
    const priceInput = document.getElementById('mat-price');
    if(priceInput) {
        // وقتی فوکوس شد، عدد انگلیسی خام نمایش بده تا کاربر راحت ادیت کنه
        priceInput.onfocus = (e) => {
            const val = parseLocaleNumber(e.target.value);
            if(val !== 0) e.target.value = val; // نمایش عدد ساده
            else e.target.value = '';
            e.target.select();
        };
        
        // وقتی فوکوس برداشته شد، فرمت پول (۳ رقم ۳ رقم) اعمال کن
        priceInput.onblur = (e) => {
            const val = parseLocaleNumber(e.target.value);
            e.target.value = val > 0 ? formatPrice(val) : ''; 
        };
    }
}

async function saveMaterial(cb) {
    const id = document.getElementById('mat-id').value;
    
    const unitData = Units.getUnitData();
    const purchaseUnitVal = unitData.selected_purchase || unitData.base || 'عدد';
    const consumptionUnitVal = unitData.selected_consumption || purchaseUnitVal;

    const rawPrice = document.getElementById('mat-price').value;
    const priceNum = parseLocaleNumber(rawPrice); 

    const data = {
        name: document.getElementById('mat-name').value,
        display_name: document.getElementById('mat-display-name').value || null,
        category_id: document.getElementById('mat-category').value || null,
        price: priceNum, 
        scraper_url: document.getElementById('mat-scraper-url').value || null,
        scraper_anchor: document.getElementById('mat-scraper-anchor').value || null,
        
        unit: purchaseUnitVal, 
        purchase_unit: purchaseUnitVal,
        consumption_unit: consumptionUnitVal,
        
        scraper_factor: parseFloat(document.getElementById('mat-scraper-factor').value) || 1,
        has_tax: document.getElementById('mat-has-tax').checked,
        
        unit_relations: JSON.stringify(unitData)
    };

    try {
        if(id) await api.update(APPWRITE_CONFIG.COLS.MATS, id, data);
        else await api.create(APPWRITE_CONFIG.COLS.MATS, data);
        
        resetMatForm();
        cb(); 
        alert('✅ کالا ذخیره شد');
    } catch(e){ 
        console.error(e);
        alert('❌ خطا در ذخیره: ' + e.message); 
    }
}

export function renderMaterials(filter='') {
    if (document.getElementById('mat-base-unit-select').options.length === 0 && state.units.length > 0) {
        Units.resetUnitData();
    }

    const sortElem = document.getElementById('sort-materials');
    const sort = sortElem ? sortElem.value : 'update_desc';
    
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
    if(!list.length) { el.innerHTML='<p class="col-span-full text-center text-slate-400 text-xs">موردی یافت نشد</p>'; return; }
    
    el.innerHTML = list.map(m => {
        const cat = state.categories.find(c => c.$id === m.category_id)?.name || '-';
        const pUnit = m.purchase_unit || m.unit || 'واحد'; 
        
        // وضعیت لینک اسکرپر
        const hasLink = m.scraper_url && m.scraper_url.length > 5;
        const linkIcon = hasLink ? `<a href="${m.scraper_url}" target="_blank" class="text-blue-500 hover:text-blue-700 ml-1 text-lg" title="مشاهده منبع قیمت">🔗</a>` : '';

        let taxBadge = m.has_tax ? '<span class="text-[9px] font-bold bg-rose-100 text-rose-600 px-1.5 rounded ml-1">مالیات</span>' : '';
        let borderClass = m.has_tax ? 'border-rose-200 ring-1 ring-rose-50' : 'border-slate-100';
        let taxInfo = m.has_tax ? `<div class="text-[10px] text-rose-500 mt-0.5 font-bold">با مالیات: ${formatPrice(m.price * 1.10)}</div>` : '';

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
    }).join('');
    
    el.querySelectorAll('.btn-edit-mat').forEach(b => b.onclick = () => editMat(b.dataset.id));
    el.querySelectorAll('.btn-del-mat').forEach(b => b.onclick = async () => {
        if(confirm('این کالا حذف شود؟')) { try { await api.delete(APPWRITE_CONFIG.COLS.MATS, b.dataset.id); refreshCallback(); } catch(e) { alert(e.message); } }
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
    
    const pInput = document.getElementById('mat-price');
    if(pInput) pInput.value = formatPrice(m.price); // مقدار اولیه
    
    document.getElementById('mat-scraper-url').value = m.scraper_url || '';
    document.getElementById('mat-scraper-anchor').value = m.scraper_anchor || '';
    document.getElementById('mat-scraper-factor').value = m.scraper_factor || 1;

    try {
        const rels = JSON.parse(m.unit_relations || '{}');
        Units.setUnitData(rels);
    } catch(e) { Units.resetUnitData(); }

    const btn = document.getElementById('mat-submit-btn');
    if(btn) btn.innerText = 'ذخیره تغییرات';
    document.getElementById('mat-cancel-btn').classList.remove('hidden');
    
    // باز کردن سایدبار در موبایل اگر بسته بود
    if(window.innerWidth < 768) document.getElementById('tab-materials').scrollIntoView({behavior:'smooth'});
}

function resetMatForm() {
    document.getElementById('material-form').reset();
    document.getElementById('mat-id').value = '';
    Units.resetUnitData();
    
    const btn = document.getElementById('mat-submit-btn');
    if(btn) btn.innerText = 'ذخیره کالا';
    document.getElementById('mat-cancel-btn').classList.add('hidden');
}