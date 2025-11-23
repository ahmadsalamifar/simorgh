// رندرینگ فروشگاه فرمول
export function renderGrid(formulas, onCopy) {
    const el = document.getElementById('store-container');
    if (!el) return;

    if(!formulas || !formulas.length) { 
        el.innerHTML = '<p class="col-span-full text-center text-slate-400">بانک خالی است</p>'; 
        return; 
    }

    el.innerHTML = formulas.map(f => `
        <div class="bg-white p-4 rounded-xl border shadow-sm text-center">
            <div class="font-bold text-lg text-slate-700 mb-2">${f.name}</div>
            <button class="btn btn-secondary text-xs w-full btn-copy" data-id="${f.$id}">📥 کپی به لیست من</button>
        </div>
    `).join('');

    el.querySelectorAll('.btn-copy').forEach(btn => 
        btn.onclick = () => onCopy(btn.dataset.id)
    );
}