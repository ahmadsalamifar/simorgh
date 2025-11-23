// رندرینگ تب تنظیمات

export function renderList(elementId, items, onDelete) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.innerHTML = items.map(item => `
        <div class="flex justify-between p-2 bg-slate-50 rounded border mb-1 text-xs items-center group">
            <span class="font-bold text-slate-700">${item.name}</span>
            <button class="text-rose-500 w-6 h-6 hover:bg-rose-100 rounded btn-del" data-id="${item.$id}">×</button>
        </div>
    `).join('');
    
    el.querySelectorAll('.btn-del').forEach(btn => 
        btn.onclick = () => onDelete(btn.dataset.id)
    );
}

export function setupForms(onAddCat, onAddUnit) {
    document.getElementById('category-form').onsubmit = (e) => {
        e.preventDefault();
        onAddCat(document.getElementById('cat-name').value);
    };

    document.getElementById('unit-form').onsubmit = (e) => {
        e.preventDefault();
        onAddUnit(document.getElementById('unit-name').value);
    };
}

export function setupBackupButton(onBackup) {
    const container = document.getElementById('tab-categories');
    if(container && !document.getElementById('btn-full-backup')) {
        const div = document.createElement('div');
        div.className = "max-w-4xl mx-auto mt-8 p-4 text-center border-t border-dashed";
        div.innerHTML = `<button id="btn-full-backup" class="btn btn-primary mx-auto">📥 دانلود نسخه پشتیبان</button>`;
        container.appendChild(div);
        document.getElementById('btn-full-backup').onclick = onBackup;
    }
}