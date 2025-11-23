// نقطه ورود برنامه (نسخه نهایی و اصلاح شده)
import { account, state, APPWRITE_CONFIG, Query } from './core/config.js';
import { api } from './core/api.js';
import { switchTab, toggleElement } from './core/utils.js';
import { setupPrint } from './print.js'; 

// ایمپورت ماژول‌های جدید از پوشه features
import * as MaterialController from './features/materials/materialController.js';
import * as FormulaController from './features/formulas/formulaController.js';
import * as SettingsController from './features/settings/settingsController.js';
import * as StoreController from './features/store/storeController.js';

async function initApp() {
    try {
        // 1. احراز هویت
        try { await account.get(); } 
        catch { await account.createAnonymousSession(); }

        // 2. دریافت دیتا
        await refreshData();
        
        // 3. راه‌اندازی ماژول‌ها
        FormulaController.init(refreshApp);
        MaterialController.init(refreshApp);
        SettingsController.init(refreshApp);
        StoreController.init(refreshApp); // اگر تابع init دارد
        
        setupPrint(); 

        // 4. نمایش UI
        toggleElement('loading-screen', false);
        toggleElement('app-content', true);
        
        setupTabs();
        
        // پیش‌فرض تب اول
        switchTab('formulas');

    } catch (err) {
        console.error(err);
        document.getElementById('loading-text').innerText = "خطا: " + err.message;
    }
}

async function refreshData() {
    // دریافت همزمان تمام داده‌ها
    const [c, u, m, f] = await Promise.all([
        api.list(APPWRITE_CONFIG.COLS.CATS, [Query.limit(100)]),
        api.list(APPWRITE_CONFIG.COLS.UNITS, [Query.limit(100)]),
        api.list(APPWRITE_CONFIG.COLS.MATS, [Query.limit(5000)]),
        api.list(APPWRITE_CONFIG.COLS.FORMS, [Query.limit(500)])
    ]);

    state.categories = c.documents;
    state.units = u.documents;
    state.materials = m.documents;
    state.formulas = f.documents;
    
    updateAllUI();
}

function updateAllUI() {
    MaterialController.renderMaterials();
    FormulaController.renderFormulaList();
    SettingsController.renderSettings(refreshApp);
    StoreController.renderStore(refreshApp);
}

function setupTabs() {
    ['formulas', 'materials', 'categories'].forEach(t => {
        const btn = document.getElementById('btn-tab-' + t);
        if(btn) btn.onclick = () => switchTab(t);
    });
    const btnStore = document.getElementById('btn-open-store');
    if(btnStore) btnStore.onclick = () => switchTab('store');
}

// کال‌بک سراسری برای رفرش کردن کل برنامه بعد از هر تغییر
async function refreshApp() {
    await refreshData();
}

document.addEventListener('DOMContentLoaded', initApp);