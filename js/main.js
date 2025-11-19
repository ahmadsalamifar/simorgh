import { account } from './config.js';
import { fetchAllData } from './api.js';
import { switchTab, formatInput } from './utils.js';

// ماژول‌ها
import * as Formulas from './formulas.js';
import * as Materials from './materials.js';
import * as Categories from './categories.js';
import * as Store from './store.js';
import * as Print from './print.js';

// === MAIN UPDATE FUNCTION ===
// این تابع به همه ماژول‌ها پاس داده می‌شود تا هر وقت دیتابیس آپدیت شد، UI رفرش شود
async function refreshApp() {
    await fetchAllData();
    updateUI();
}

function updateUI() {
    Formulas.renderFormulaList();
    
    // اگر فرمول باز است، دیتیل آن را رفرش کن
    if (Formulas.selectFormula.activeId) { 
        // (نکته: selectFormula باید id فعال را بداند، یا از state عمومی بخوانیم)
        // بهتر است ماژول Formulas خودش این را مدیریت کند.
        // در اینجا فقط لیست‌ها را آپدیت می‌کنیم.
    }
    
    Materials.renderMaterials();
    Categories.renderCategories(refreshApp);
    Store.renderStore(refreshApp);
    
    // آپدیت دراپ‌داون‌ها (مشترک)
    Formulas.updateCompSelect(); 
    // دراپ‌داون مواد اولیه
    const matCat = document.getElementById('mat-category');
    if(matCat && matCat.children.length <= 1) { // simple check to refill
         // بهتر است یک تابع updateDropdowns در یک ماژول مشترک باشد، اما برای سادگی:
         // این بخش را می‌توان به formulas یا materials سپرد.
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        try { await account.get(); } catch { await account.createAnonymousSession(); }
        await fetchAllData();
        
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        
        // Setup Tabs
        document.getElementById('btn-tab-formulas').onclick = () => switchTab('formulas');
        document.getElementById('btn-tab-materials').onclick = () => switchTab('materials');
        document.getElementById('btn-tab-categories').onclick = () => switchTab('categories');
        document.getElementById('btn-open-store').onclick = () => switchTab('store');
        
        // Setup Modules
        Formulas.setupFormulas(refreshApp);
        Materials.setupMaterials(refreshApp);
        Categories.setupCategories(refreshApp);
        Store.setupStore(refreshApp);
        Print.setupPrint();
        
        // Global Inputs
        document.querySelectorAll('.price-input').forEach(el => {
            el.addEventListener('input', () => formatInput(el));
        });

        // Initial Render
        updateUI();
        switchTab('formulas');
        
    } catch (err) {
        document.getElementById('loading-text').innerText = err.message;
        document.getElementById('loading-text').style.color = 'red';
    }
});