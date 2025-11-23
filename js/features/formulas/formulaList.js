// مدیریت لیست مستر فرمول‌ها
import { state } from '../../core/config.js';
import { formatPrice, formatDate } from '../../core/utils.js';
// اصلاح نام فایل ایمپورت شده
import { calculateCost } from './formulas_calc.js';

export function setupSearch(onSearch) {
    const searchEl = document.getElementById('search-formulas');
    if (searchEl) searchEl.oninput = (e) => onSearch(e.target.value);
}

export function renderList(activeId, onSelect) {
    const el = document.getElementById('formula-master-list');
    if (!el) return;

    const filterText = document.getElementById('search-formulas')?.value || '';
    const list = state.formulas.filter(f => f.name.includes(filterText));

    if (!list.length) {
        el.innerHTML = '<p class="text-center text-slate-400 text-xs mt-10">موردی یافت نشد</p>';
        return;
    }

    el.innerHTML = list.map(f => {
        const calc = calculateCost(f);
        const isActive = f.$id === activeId;
        
        return `
        <div class="formula-item p-3 border-b border-slate-100 cursor-pointer hover:bg-teal-50 transition-colors ${isActive ? 'bg-teal-50 border-r-4 border-teal-600' : ''}" data-id="${f.$id}">
            <div class="font-bold text-xs text-slate-700 pointer-events-none">${f.name}</div>
            <div class="text-[10px] text-slate-400 mt-0.5 pointer-events-none flex justify-between">
                <span>${formatDate(f.$updatedAt)}</span>
                <span class="font-bold text-teal-700">${formatPrice(calc.final)} ت</span>
            </div>
        </div>`;
    }).join('');

    // اتصال رویداد کلیک
    el.querySelectorAll('.formula-item').forEach(item => {
        item.onclick = () => onSelect(item.dataset.id);
    });
}