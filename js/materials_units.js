import { state } from './config.js';

// وضعیت موقت برای ویرایش واحدها
let currentUnitRelations = [];

export function getUnitData() {
    const getVal = (id) => document.getElementById(id)?.value;
    return {
        base: getVal('mat-base-unit-select') || 'عدد',
        others: currentUnitRelations,
        selected_purchase: getVal('mat-price-unit'),
        selected_consumption: getVal('mat-consumption-unit'),
        selected_scraper: getVal('mat-scraper-unit')
    };
}

export function setUnitData(rels) {
    if (typeof rels === 'string') rels = JSON.parse(rels);
    rels = rels || {};

    const baseSelect = document.getElementById('mat-base-unit-select');
    if (baseSelect) {
        baseSelect.innerHTML = state.units.map(u => `<option value="${u.name}">${u.name}</option>`).join('');
        
        const savedBase = rels.base || 'عدد';
        // اگر واحد ذخیره شده در لیست نیست (مثلاً حذف شده)، اضافه کن
        if (![...baseSelect.options].some(o => o.value === savedBase)) {
            const opt = document.createElement('option');
            opt.value = savedBase;
            opt.text = `${savedBase} (قدیمی)`;
            baseSelect.add(opt);
        }
        baseSelect.value = savedBase;
    }

    currentUnitRelations = (rels.others || []).map(r => ({ 
        name: r.name, 
        qtyUnit: parseFloat(r.qtyUnit) || 1, 
        qtyBase: parseFloat(r.qtyBase) || 1 
    }));
    
    renderRelationsUI();
    updateUnitDropdowns();
    
    // بازیابی انتخاب‌های قبلی
    setSelectValue('mat-price-unit', rels.selected_purchase);
    setSelectValue('mat-consumption-unit', rels.selected_consumption);
    setSelectValue('mat-scraper-unit', rels.selected_scraper);
    
    calculateScraperFactor();
}

export function resetUnitData() {
    currentUnitRelations = [];
    const baseSelect = document.getElementById('mat-base-unit-select');
    if (baseSelect) {
        baseSelect.innerHTML = state.units.map(u => `<option value="${u.name}">${u.name}</option>`).join('');
        if (baseSelect.options.length > 0) baseSelect.selectedIndex = 0;
    }
    renderRelationsUI();
    updateUnitDropdowns();
}

export function addRelationRow() {
    const usedNames = currentUnitRelations.map(r => r.name);
    const available = state.units.find(u => !usedNames.includes(u.name));
    const name = available ? available.name : (state.units[0]?.name || 'Unit');
    
    currentUnitRelations.push({ name: name, qtyUnit: 1, qtyBase: 1 });
    renderRelationsUI();
    updateUnitDropdowns();
}

export function renderRelationsUI() {
    const container = document.getElementById('unit-relations-container');
    if (!container) return;
    
    container.innerHTML = '';
    const baseElem = document.getElementById('mat-base-unit-select');
    const baseUnitName = baseElem ? (baseElem.value || 'واحد پایه') : 'واحد پایه';
    
    currentUnitRelations.forEach((rel, index) => {
        const options = state.units.map(u => `<option value="${u.name}" ${u.name === rel.name ? 'selected' : ''}>${u.name}</option>`).join('');
        
        const row = document.createElement('div');
        row.className = 'flex items-center gap-1 bg-white p-1 rounded border border-slate-200 mb-1 shadow-sm text-xs';
        row.innerHTML = `
            <input type="number" step="any" class="input-field w-12 text-center p-1 h-7 bg-slate-50 rel-qty-unit" value="${rel.qtyUnit}">
            <select class="input-field w-24 px-1 h-7 text-[10px] rel-name-select">${options}</select>
            <span>=</span>
            <input type="number" step="any" class="input-field w-12 text-center p-1 h-7 bg-slate-50 rel-qty-base" value="${rel.qtyBase}">
            <span class="w-12 truncate text-[10px] base-unit-label" title="${baseUnitName}">${baseUnitName}</span>
            <button type="button" class="text-rose-500 px-2 btn-remove-rel text-lg">×</button>
        `;
        
        // Event Listeners
        const inputs = row.querySelectorAll('input, select');
        inputs.forEach(el => el.onchange = () => {
            rel.name = row.querySelector('.rel-name-select').value;
            rel.qtyUnit = parseFloat(row.querySelector('.rel-qty-unit').value) || 1;
            rel.qtyBase = parseFloat(row.querySelector('.rel-qty-base').value) || 1;
            updateUnitDropdowns();
        });

        row.querySelector('.btn-remove-rel').onclick = () => { 
            currentUnitRelations.splice(index, 1); 
            renderRelationsUI(); 
            updateUnitDropdowns(); 
        };
        
        container.appendChild(row);
    });
}

export function updateUnitDropdowns() {
    const baseElem = document.getElementById('mat-base-unit-select');
    if (!baseElem) return;
    
    const baseUnit = baseElem.value;
    
    // ساخت لیست یکتا از واحدها
    const availableUnits = new Set([baseUnit]);
    currentUnitRelations.forEach(r => availableUnits.add(r.name));
    
    const optionsHtml = Array.from(availableUnits).map(u => `<option value="${u}">${u}</option>`).join('');
    
    // آپدیت دراپ‌داون‌های وابسته
    ['mat-price-unit', 'mat-consumption-unit', 'mat-scraper-unit'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const prev = el.value;
            el.innerHTML = optionsHtml;
            if (availableUnits.has(prev)) el.value = prev;
            else if (availableUnits.size > 0) el.value = baseUnit;
        }
    });
    
    // آپدیت لیبل‌های داخل لیست تبدیل
    document.querySelectorAll('.base-unit-label').forEach(el => el.innerText = baseUnit);
    
    calculateScraperFactor();
}

// محاسبه ضریب اتوماتیک برای اسکرپر
export function calculateScraperFactor() {
    const sSelect = document.getElementById('mat-scraper-unit');
    const pSelect = document.getElementById('mat-price-unit');
    const factorInput = document.getElementById('mat-scraper-factor');
    
    if (!sSelect || !pSelect || !factorInput) return;
    
    const getRatio = (unitName) => {
        const baseVal = document.getElementById('mat-base-unit-select').value;
        if (unitName === baseVal) return 1;
        const rel = currentUnitRelations.find(r => r.name === unitName);
        return rel ? (rel.qtyBase / rel.qtyUnit) : 1;
    };
    
    const sFactor = getRatio(sSelect.value); // ضریب تبدیل واحد سایت به پایه
    const pFactor = getRatio(pSelect.value); // ضریب تبدیل واحد خرید به پایه
    
    // ما میخواهیم بدانیم 1 واحد سایت = چند واحد خرید؟
    // 1 SiteUnit = sFactor BaseUnit
    // 1 PurchaseUnit = pFactor BaseUnit => 1 BaseUnit = 1/pFactor PurchaseUnit
    // Therefore: 1 SiteUnit = sFactor * (1/pFactor) PurchaseUnit
    
    let rate = 1;
    if (pFactor !== 0) rate = sFactor / pFactor; // فرمول اصلاح شده: نسبت سایت به خرید
    
    // اگر واحد خرید و سایت یکی باشند باید 1 شود
    if (sSelect.value === pSelect.value) rate = 1;

    factorInput.value = parseFloat(rate.toFixed(6)); 
}

function setSelectValue(id, val) {
    const el = document.getElementById(id);
    if (!el || !val) return;
    
    if (![...el.options].some(o => o.value === val)) {
        const opt = document.createElement('option');
        opt.value = val;
        opt.text = val;
        el.add(opt);
    }
    el.value = val;
}