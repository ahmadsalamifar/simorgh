// مدیریت واحدها و تبدیل واحد (نسخه سبک)
import { state } from '../../core/config.js';
import { parseLocaleNumber } from '../../core/utils.js';
import { createRelationRowHTML, showFactorHint } from './materials_units_view.js';

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
        if (![...baseSelect.options].some(o => o.value === savedBase)) {
            const opt = document.createElement('option'); opt.value = savedBase; opt.text = `${savedBase} (قدیمی)`; baseSelect.add(opt);
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
    
    setSelectValue('mat-price-unit', rels.selected_purchase);
    setSelectValue('mat-consumption-unit', rels.selected_consumption);
    setSelectValue('mat-scraper-unit', rels.selected_scraper);
    
    setTimeout(calculateScraperFactor, 200);
}

export function resetUnitData() {
    currentUnitRelations = [];
    const baseSelect = document.getElementById('mat-base-unit-select');
    if (baseSelect && state.units.length > 0) {
        baseSelect.innerHTML = state.units.map(u => `<option value="${u.name}">${u.name}</option>`).join('');
        baseSelect.selectedIndex = 0;
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
        
        // استفاده از تابع View برای تولید HTML
        const row = createRelationRowHTML(rel, options);
        
        // آپدیت لیبل پایه
        row.querySelector('.base-unit-label').innerText = baseUnitName;
        row.querySelector('.base-unit-label').title = baseUnitName;

        // اتصال رویدادها
        const inputs = row.querySelectorAll('input, select');
        inputs.forEach(el => {
            el.onchange = () => {
                rel.name = row.querySelector('.rel-name-select').value;
                const qU = parseLocaleNumber(row.querySelector('.rel-qty-unit').value);
                const qB = parseLocaleNumber(row.querySelector('.rel-qty-base').value);
                rel.qtyUnit = qU || 0;
                rel.qtyBase = qB || 0;
                
                if (el.tagName === 'SELECT') updateUnitDropdowns();
                calculateScraperFactor(); 
            };
        });

        row.querySelector('.btn-remove-rel').onclick = () => { 
            currentUnitRelations.splice(index, 1); 
            renderRelationsUI(); 
            updateUnitDropdowns(); 
            calculateScraperFactor();
        };
        container.appendChild(row);
    });
}

export function updateUnitDropdowns() {
    const baseElem = document.getElementById('mat-base-unit-select');
    if (!baseElem) return;
    const baseUnit = baseElem.value;
    
    const availableUnits = new Set([baseUnit]);
    currentUnitRelations.forEach(r => availableUnits.add(r.name));
    const optionsHtml = Array.from(availableUnits).map(u => `<option value="${u}">${u}</option>`).join('');
    
    ['mat-price-unit', 'mat-consumption-unit', 'mat-scraper-unit'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const prev = el.value; el.innerHTML = optionsHtml;
            if (availableUnits.has(prev)) el.value = prev; else if (availableUnits.size > 0) el.value = baseUnit;
        }
    });
    
    document.querySelectorAll('.base-unit-label').forEach(el => el.innerText = baseUnit);
    calculateScraperFactor();
}

export function calculateScraperFactor() {
    const sSelect = document.getElementById('mat-scraper-unit');
    const pSelect = document.getElementById('mat-price-unit');
    const factorInput = document.getElementById('mat-scraper-factor');
    const baseSelect = document.getElementById('mat-base-unit-select');
    
    if (!sSelect || !pSelect || !factorInput || !baseSelect) return;
    
    const baseVal = baseSelect.value;
    const sUnit = sSelect.value;
    const pUnit = pSelect.value;

    const getRatioToBase = (unitName) => {
        if (unitName === baseVal) return 1;
        const rel = currentUnitRelations.find(r => r.name === unitName);
        if (!rel || rel.qtyUnit === 0 || rel.qtyBase === 0) return 1;
        return rel.qtyBase / rel.qtyUnit;
    };
    
    const siteRatio = getRatioToBase(sUnit);    
    const purchaseRatio = getRatioToBase(pUnit); 
    
    let rate = 1;
    if (siteRatio !== 0) rate = purchaseRatio / siteRatio;
    if (isNaN(rate) || !isFinite(rate) || rate === 0) rate = 1;
    
    const finalRate = parseFloat(rate.toFixed(6));
    factorInput.value = finalRate;

    // استفاده از تابع View برای نمایش راهنما
    showFactorHint(sUnit, pUnit, finalRate);
}

function setSelectValue(id, val) {
    const el = document.getElementById(id);
    if (!el || !val) return;
    if (![...el.options].some(o => o.value === val)) {
        const opt = document.createElement('option'); opt.value = val; opt.text = val; el.add(opt);
    }
    el.value = val;
}