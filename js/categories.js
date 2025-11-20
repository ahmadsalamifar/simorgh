import { api } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';

export function setupCategories(refreshCallback) {
    // مدیریت دسته‌ها
    document.getElementById('category-form').onsubmit = (e) => { 
        e.preventDefault(); 
        addItem(APPWRITE_CONFIG.COLS.CATS, 'cat-name', refreshCallback); 
    };

    // مدیریت واحدها
    document.getElementById('unit-form').onsubmit = (e) => { 
        e.preventDefault(); 
        addItem(APPWRITE_CONFIG.COLS.UNITS, 'unit-name', refreshCallback); 
    };

    // --- ویژگی جدید: دکمه بکاپ در مدیریت داده‌ها ---
    const backupContainer = document.getElementById('backup-container');
    // اگر کانتینر اختصاصی در HTML نداشتید، به هدر این بخش اضافه می‌کنیم
    if(!document.getElementById('btn-full-backup')) {
        // پیدا کردن جایی برای دکمه (مثلاً کنار فرم واحدها یا یک بخش جدید)
        const target = document.getElementById('tab-categories');
        if(target) {
            const btn = document.createElement('button');
            btn.id = 'btn-full-backup';
            btn.className = 'btn btn-secondary w-full mt-6 border-slate-300 bg-white text-slate-600 shadow-sm';
            btn.innerHTML = '💾 دانلود نسخه پشتیبان کامل (Full Backup)';
            btn.onclick = exportDatabase;
            target.appendChild(btn);
        }
    }
}

// تابع بکاپ‌گیری
function exportDatabase() {
    const data = {
        timestamp: new Date().toISOString(),
        version: "3.0",
        materials: state.materials,
        formulas: state.formulas,
        categories: state.categories,
        units: state.units
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "simorgh_backup_" + new Date().toISOString().split('T')[0] + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

async function addItem(col, inputId, cb) {
    const input = document.getElementById(inputId);
    const val = input.value;
    if(!val) return;
    try {
        await api.create(col, {name: val});
        input.value = '';
        cb();
    } catch(e) { alert(e.message); }
}

export function renderCategories(refreshCallback) {
    renderList('category-list', state.categories, APPWRITE_CONFIG.COLS.CATS, refreshCallback);
    renderList('unit-list', state.units, APPWRITE_CONFIG.COLS.UNITS, refreshCallback);
}

function renderList(elementId, data, col, cb) {
    const el = document.getElementById(elementId);
    if(!el) return;

    el.innerHTML = data.map(item => `
        <div class="flex justify-between p-2 bg-slate-50 rounded border mb-1 text-xs items-center">
            <span class="font-bold text-slate-700">${item.name}</span>
            <button class="text-rose-500 btn-del-${col} w-6 h-6 flex items-center justify-center hover:bg-rose-50 rounded" data-id="${item.$id}">×</button>
        </div>
    `).join('');
    
    el.querySelectorAll(`.btn-del-${col}`).forEach(b => {
        b.onclick = async () => {
            if(confirm('حذف شود؟')) {
                try { await api.delete(col, b.dataset.id); cb(); }
                catch(e) { alert(e.message); }
            }
        };
    });
}
