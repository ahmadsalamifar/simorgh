// تولید HTML و کدهای ظاهری بخش واحدها
import { parseLocaleNumber } from '../../core/utils.js';

export function createRelationRowHTML(rel, options) {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-1 bg-white p-1 rounded border border-slate-200 mb-1 shadow-sm text-xs';
    
    // مقادیر پیش‌فرض
    const qtyUnit = rel.qtyUnit || 1;
    const qtyBase = rel.qtyBase || 1;

    row.innerHTML = `
        <div class="flex flex-col items-center relative group">
            <input type="text" class="input-field w-14 text-center p-1 h-7 bg-slate-50 rel-qty-unit font-bold text-emerald-600" value="${qtyUnit}">
            <span class="text-[8px] text-slate-400 absolute -top-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-1 border rounded shadow-sm z-10">مقدار واحد</span>
        </div>
        
        <select class="input-field w-24 px-1 h-7 text-[10px] rel-name-select font-bold">${options}</select>
        
        <span class="text-slate-400 text-[10px] px-0.5 font-bold">=</span>
        
        <div class="flex flex-col items-center relative group">
            <input type="text" class="input-field w-14 text-center p-1 h-7 bg-slate-50 rel-qty-base font-bold text-blue-600" value="${qtyBase}">
            <span class="text-[8px] text-slate-400 absolute -top-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-1 border rounded shadow-sm z-10">معادل پایه</span>
        </div>
        
        <span class="w-12 truncate text-[10px] base-unit-label text-slate-500" title="واحد پایه">واحد پایه</span>
        <button type="button" class="text-rose-500 px-2 btn-remove-rel text-lg hover:bg-rose-50 rounded transition-colors">×</button>
    `;
    return row;
}

export function showFactorHint(siteUnit, purchaseUnit, rate) {
    let hintEl = document.getElementById('scraper-factor-hint');
    const container = document.getElementById('mat-scraper-factor').parentElement;
    
    if (!hintEl && container) {
        hintEl = document.createElement('div');
        hintEl.id = 'scraper-factor-hint';
        hintEl.className = 'text-[10px] text-slate-500 mt-1 w-full text-center bg-slate-100 p-1 rounded';
        container.appendChild(hintEl);
    }
    
    if (hintEl) {
        if (siteUnit === purchaseUnit) {
            hintEl.innerHTML = `قیمت سایت بدون تغییر وارد می‌شود`;
            hintEl.className = 'text-[10px] text-slate-400 mt-1 w-full text-center';
        } else {
            const operation = rate >= 1 ? `× ${rate}` : `÷ ${(1/rate).toFixed(2)}`;
            hintEl.innerHTML = `قیمت <b>${purchaseUnit}</b> = قیمت <b>${siteUnit}</b> ${operation}`;
            hintEl.className = 'text-[10px] text-blue-600 mt-1 w-full text-center bg-blue-50 p-1 rounded border border-blue-100';
        }
    }
}