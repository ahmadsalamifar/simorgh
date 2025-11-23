// مدیریت نمایش لیست کارت‌های مواد
// وظیفه: فقط تولید HTML و مدیریت رویدادهای جستجو

import { formatPrice, getDateBadge } from '../../core/utils.js';

export function setupSearchListeners(renderCallback) {
    const searchInp = document.getElementById('search-materials');
    if (searchInp) searchInp.oninput = (e) => renderCallback();

    const sortSel = document.getElementById('sort-materials');
    if (sortSel) sortSel.onchange = () => renderCallback();
}

export function renderGrid(materials, categories, onDelete, onEdit) {
    const container = document.getElementById('materials-container');
    if (!container) return;

    const filter = document.getElementById('search-materials')?.value || '';
    const filtered = materials.filter(m => m.name.includes(filter));

    if (!filtered.length) {
        container.innerHTML = '<p class="text-center text-slate-400">موردی یافت نشد</p>';
        return;
    }

    container.innerHTML = filtered.map(m => createCardHTML(m, categories)).join('');

    // اتصال رویدادها پس از رندر
    container.querySelectorAll('.btn-edit-mat').forEach(b => 
        b.onclick = () => onEdit(b.dataset.id));
        
    container.querySelectorAll('.btn-del-mat').forEach(b => 
        b.onclick = () => onDelete(b.dataset.id));
}

function createCardHTML(m, categories) {
    const cat = categories.find(c => c.$id === m.category_id)?.name || '-';
    const taxInfo = m.has_tax ? `<div class="text-[10px] text-rose-500">با مالیات: ${formatPrice(m.price * 1.1)}</div>` : '';
    
    return `
    <div class="bg-white p-3 rounded-xl border border-slate-100 hover:shadow-md transition-all">
        <div class="flex justify-between mb-1">
            <span class="text-[10px] bg-slate-50 px-2 rounded text-slate-500">${cat}</span>
            <div class="flex gap-1">
                <button class="text-amber-500 btn-edit-mat" data-id="${m.$id}">✎</button>
                <button class="text-rose-500 btn-del-mat" data-id="${m.$id}">×</button>
            </div>
        </div>
        <div class="font-bold text-sm text-slate-800 mb-2">${m.name}</div>
        <div class="flex justify-between items-end border-t border-dashed pt-2">
             ${getDateBadge(m.$updatedAt)}
             <div class="text-right">
                 <span class="font-bold text-teal-700 text-lg">${formatPrice(m.price)}</span>
                 ${taxInfo}
            </div>
        </div>
    </div>`;
}