import { api } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { formatPrice, parseLocaleNumber, getDateBadge } from './utils.js';

// متغیر موقت برای نگهداری روابط واحدهای کالا در حین ویرایش
let currentUnitRelations = []; 

export function setupMaterials(refreshCallback) {
    document.getElementById('material-form').onsubmit = (e) => { 
        e.preventDefault(); 
        saveMaterial(refreshCallback); 
    };
    
    document.getElementById('mat-cancel-btn').onclick = resetMatForm;
    document.getElementById('search-materials').oninput = (e) => renderMaterials(e.target.value);
    document.getElementById('sort-materials').onchange = () => renderMaterials();
    
    // دکمه افزودن تبدیل واحد جدید
    document.getElementById('btn-add-relation').onclick = addRelationRow;
    
    // تغییر واحد پایه یا انتخاب‌های خرید/مصرف -> محاسبه مجدد ضریب
    document.getElementById('mat-base-unit-select').onchange = updateUnitDropdowns;
    document.getElementById('mat-purchase-unit').onchange = calculateConversionRate;
    document.getElementById('mat-consumption-unit').onchange = calculateConversionRate;
    
    const scraperBtn = document.getElementById('btn-scraper-trigger');
    if(scraperBtn) scraperBtn.onclick = async () => {
        if(!confirm('قیمت‌ها از سایت‌های مرجع بروزرسانی شوند؟')) return;
        scraperBtn.innerText = '⏳ ...';
        try {
            await api.runScraper();
            alert('انجام شد. صفحه رفرش می‌شود.');
            refreshCallback();
        } catch(e) { alert('خطا: ' + e.message); }
        finally { scraperBtn.innerText = '🤖 بروزرسانی قیمت‌ها'; }
    };
}

// --- مدیریت روابط واحدها ---

function renderRelationsUI() {
    const container = document.getElementById('unit-relations-container');
    container.innerHTML = '';
    
    currentUnitRelations.forEach((rel, index) => {
        // ساخت آپشن‌های دراپ‌داون واحدهای جهانی
        const options = state.units.map(u => `<option value="${u.name}" ${u.name === rel.name ? 'selected' : ''}>${u.name}</option>`).join('');
        
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2 bg-white p-1 rounded border border-slate-100';
        row.innerHTML = `
            <span class="text-[10px] text-slate-400 w-4 text-center">${index+1}.</span>
            <span class="text-[10px]">هر</span>
            <select class="input-field h-7 text-xs py-0 px-1 w-24 rel-name-select">${options}</select>
            <span class="text-[10px]">=</span>
            <input type="number" step="any" class="input-field h-7 text-xs py-0 px-1 w-16 text-center font-bold rel-factor-input" value="${rel.factor}" placeholder="تعداد">
            <span class="text-[10px] text-slate-500 base-unit-label">واحد پایه</span>
            <button type="button" class="text-rose-500 text-lg font-bold px-2 hover:bg-rose-50 rounded btn-remove-rel">×</button>
        `;
        
        // رویداد تغییر مقادیر
        row.querySelector('.rel-name-select').onchange = (e) => { currentUnitRelations[index].name = e.target.value; updateUnitDropdowns(); };
        row.querySelector('.rel-factor-input').oninput = (e) => { currentUnitRelations[index].factor = parseFloat(e.target.value) || 0; calculateConversionRate(); };
        row.querySelector('.btn-remove-rel').onclick = () => { currentUnitRelations.splice(index, 1); renderRelationsUI(); updateUnitDropdowns(); };
        
        container.appendChild(row);
    });
    
    // بروزرسانی لیبل واحد پایه در تمام سطرها
    const baseUnit = document.getElementById('mat-base-unit-select').value || 'واحد پایه';
    document.querySelectorAll('.base-unit-label').forEach(el => el.innerText = baseUnit);
}

function addRelationRow() {
    // پیش‌فرض: اولین واحد جهانی که هنوز انتخاب نشده
    const usedNames = currentUnitRelations.map(r => r.name);
    const available = state.units.find(u => !usedNames.includes(u.name));
    const name = available ? available.name : (state.units[0]?.name || 'Unit');
    
    currentUnitRelations.push({ name: name, factor: 1 });
    renderRelationsUI();
    updateUnitDropdowns();
}

function updateUnitDropdowns() {
    const baseUnit = document.getElementById('mat-base-unit-select').value;
    
    // لیست تمام واحدهای در دسترس برای این کالا (پایه + فرعی)
    let availableUnits = [{ name: baseUnit, factor: 1 }];
    currentUnitRelations.forEach(r => availableUnits.push(r));
    
    const optionsHtml = availableUnits.map(u => `<option value="${u.name}" data-factor="${u.factor}">${u.name}</option>`).join('');
    
    const pSelect = document.getElementById('mat-purchase-unit');
    const cSelect = document.getElementById('mat-consumption-unit');
    
    // حفظ انتخاب قبلی اگر هنوز معتبر است
    const prevP = pSelect.value;
    const prevC = cSelect.value;
    
    pSelect.innerHTML = optionsHtml;
    cSelect.innerHTML = optionsHtml;
    
    if(availableUnits.some(u => u.name === prevP)) pSelect.value = prevP;
    if(availableUnits.some(u => u.name === prevC)) cSelect.value = prevC;
    
    // آپدیت لیبل‌ها در لیست
    document.querySelectorAll('.base-unit-label').forEach(el => el.innerText = baseUnit);
    
    calculateConversionRate();
}

function calculateConversionRate() {
    const pSelect = document.getElementById('mat-purchase-unit');
    const cSelect = document.getElementById('mat-consumption-unit');
    
    const pFactor = parseFloat(pSelect.options[pSelect.selectedIndex]?.dataset.factor || 1);
    const cFactor = parseFloat(cSelect.options[cSelect.selectedIndex]?.dataset.factor || 1);
    
    // محاسبه ضریب: (ضریب واحد خرید) / (ضریب واحد مصرف)
    // مثال: خرید شاخه (۶ متر)، مصرف متر (۱ متر). ضریب = ۶/۱ = ۶
    // مثال: خرید بندیل (۶۰۰ متر)، مصرف شاخه (۶ متر). ضریب = ۶۰۰/۶ = ۱۰۰
    
    let rate = 1;
    if(cFactor !== 0) rate = pFactor / cFactor;
    
    document.getElementById('mat-conversion-rate').value = rate;
    document.getElementById('lbl-calc-rate').innerText = parseFloat(rate.toFixed(4)); // نمایش تا ۴ رقم اعشار
}

// --- ذخیره و بازیابی ---

async function saveMaterial(cb) {
    const id = document.getElementById('mat-id').value;
    
    const data = {
        name: document.getElementById('mat-name').value,
        display_name: document.getElementById('mat-display-name').value || null,
        category_id: document.getElementById('mat-category').value || null,
        purchase_unit: document.getElementById('mat-purchase-unit').value,
        consumption_unit: document.getElementById('mat-consumption-unit').value,
        conversion_rate: parseFloat(document.getElementById('mat-conversion-rate').value) || 1,
        price: parseLocaleNumber(document.getElementById('mat-price').value),
        scraper_url: document.getElementById('mat-scraper-url').value || null,
        scraper_factor: parseFloat(document.getElementById('mat-scraper-factor').value) || 1,
        // ذخیره روابط به صورت JSON
        unit_relations: JSON.stringify({
            base: document.getElementById('mat-base-unit-select').value,
            others: currentUnitRelations
        })
    };

    try {
        if(id) await api.update(APPWRITE_CONFIG.COLS.MATS, id, data);
        else await api.create(APPWRITE_CONFIG.COLS.MATS, data);
        resetMatForm();
        cb();
    } catch(e){ alert(e.message); }
}

export function renderMaterials(filter='') {
    // پر کردن دراپ‌داون واحد پایه از لیست جهانی
    const baseSelect = document.getElementById('mat-base-unit-select');
    if(state.units.length > 0 && baseSelect.options.length === 0) {
        baseSelect.innerHTML = state.units.map(u => `<option value="${u.name}">${u.name}</option>`).join('');
    }

    const sort = document.getElementById('sort-materials').value;
    let list = state.materials.filter(m => m.name.includes(filter) || (m.display_name && m.display_name.includes(filter)));
    
    list.sort((a,b) => {
        if(sort === 'update_desc') return new Date(b.$updatedAt) - new Date(a.$updatedAt);
        if(sort === 'price_desc') return b.price - a.price;
        return 0;
    });
    
    const el = document.getElementById('materials-container');
    if(!list.length) { el.innerHTML='<p class="col-span-full text-center text-slate-400 text-xs">خالی</p>'; return; }
    
    el.innerHTML = list.map(m => {
        const cat = state.categories.find(c => c.$id === m.category_id)?.name || '-';
        const dateBadge = getDateBadge(m.$updatedAt);
        const scraperInfo = m.scraper_url ? `<span class="text-[9px] text-blue-500 bg-blue-50 px-1 rounded border border-blue-100">Link</span>` : '';

        return `
        <div class="bg-white p-3 rounded-xl border border-slate-100 group relative hover:border-teal-400 transition-colors shadow-sm">
            <div class="flex justify-between mb-1 items-start">
                <div class="flex flex-col items-start gap-1">
                    <span class="text-[10px] bg-slate-50 px-1 rounded text-slate-400 border border-slate-100">${cat}</span>
                    ${dateBadge}
                </div>
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="text-amber-500 px-1 btn-edit-mat" data-id="${m.$id}">✎</button>
                    <button class="text-rose-500 px-1 btn-del-mat" data-id="${m.$id}">×</button>
                </div>
            </div>
            <div class="font-bold text-xs text-slate-800 truncate mt-1">${m.name}</div>
            <div class="flex justify-between items-end mt-2 pt-2 border-t border-dashed border-slate-100">
                <div class="text-[10px] text-slate-400 flex flex-col">
                    <span>${m.consumption_unit}</span>
                    ${scraperInfo}
                </div>
                <div class="text-right">
                     <span class="font-mono font-bold text-teal-700 text-sm">${formatPrice(m.price)}</span>
                     <span class="text-[9px] text-slate-400">/${m.purchase_unit}</span>
                </div>
            </div>
        </div>`;
    }).join('');
    
    el.querySelectorAll('.btn-edit-mat').forEach(b => b.onclick = () => editMat(b.dataset.id));
    el.querySelectorAll('.btn-del-mat').forEach(b => b.onclick = async () => {
        if(confirm('حذف؟')) {
            try { await api.delete(APPWRITE_CONFIG.COLS.MATS, b.dataset.id); refreshCallback(); }
            catch(e) { alert(e.message); }
        }
    });
}

function editMat(id) {
    const m = state.materials.find(x => x.$id === id);
    if(!m) return;
    
    document.getElementById('mat-id').value = m.$id;
    document.getElementById('mat-name').value = m.name;
    document.getElementById('mat-display-name').value = m.display_name || '';
    document.getElementById('mat-category').value = m.category_id || '';
    
    // بازگردانی روابط واحدها
    try {
        const rels = JSON.parse(m.unit_relations || '{}');
        // 1. ست کردن واحد پایه
        const baseSelect = document.getElementById('mat-base-unit-select');
        if(state.units.length === 0) {
             // اگر هنوز واحدی لود نشده، فعلا دستی اضافه کن تا دیده شود
             baseSelect.innerHTML = `<option value="${rels.base || 'Unit'}">${rels.base || 'Unit'}</option>`;
        }
        if(rels.base) baseSelect.value = rels.base;

        // 2. ست کردن آرایه فرعی‌ها
        currentUnitRelations = rels.others || [];
        renderRelationsUI();
        
        // 3. آپدیت دراپ‌داون‌های خرید/مصرف
        updateUnitDropdowns();
        
        // 4. انتخاب مقادیر
        document.getElementById('mat-purchase-unit').value = m.purchase_unit || '';
        document.getElementById('mat-consumption-unit').value = m.consumption_unit || '';
        
        // محاسبه برای اطمینان
        calculateConversionRate();

    } catch(e) {
        console.error("Error parsing unit relations", e);
        currentUnitRelations = [];
        renderRelationsUI();
    }
    
    document.getElementById('mat-price').value = formatPrice(m.price);
    document.getElementById('mat-scraper-url').value = m.scraper_url || '';
    document.getElementById('mat-scraper-factor').value = m.scraper_factor || 1;
    
    const btn = document.getElementById('mat-submit-btn');
    btn.innerText = 'ویرایش';
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
    btn.innerText = 'ذخیره کالا';
    document.getElementById('mat-cancel-btn').classList.add('hidden');
}
