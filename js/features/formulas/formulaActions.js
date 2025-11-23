// عملیات CRUD و API فرمول‌ها
import { api } from '../../core/api.js';
import { APPWRITE_CONFIG, state } from '../../core/config.js';
import { closeModal } from '../../core/utils.js';
import { resetSaveButton } from './formulaUIHelpers.js';

export async function saveFormulaChanges(cb) {
    if (!state.activeFormulaId) return;
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    if(!f) return;

    const btn = document.getElementById('btn-save-formula');
    if(btn) { btn.innerText = '⏳ در حال ثبت...'; btn.disabled = true; }

    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, f.$id, {
            labor: f.labor,
            overhead: f.overhead,
            profit: f.profit,
            components: typeof f.components === 'string' ? f.components : JSON.stringify(f.components)
        });
        resetSaveButton();
        cb(); 
    } catch(e) {
        alert('خطا در ثبت: ' + e.message);
        if(btn) { btn.innerText = 'ثبت تغییرات'; btn.disabled = false; }
    }
}

export async function createFormula(cb) {
    const name = document.getElementById('new-formula-name').value;
    if (!name) return;
    try {
        await api.create(APPWRITE_CONFIG.COLS.FORMS, {
            name, components: '[]', labor: 0, overhead: 0, profit: 0, is_public: false
        });
        closeModal('new-formula-modal');
        cb();
    } catch(e) { alert(e.message); }
}

export async function deleteFormula(cb) {
    if(confirm('حذف شود؟')) {
        await api.delete(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId);
        state.activeFormulaId = null;
        cb();
    }
}

export async function duplicateFormula(cb) {
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    if(!f) return;
    try {
        await api.create(APPWRITE_CONFIG.COLS.FORMS, {
            name: f.name + ' (کپی)',
            components: typeof f.components === 'string' ? f.components : JSON.stringify(f.components),
            labor: f.labor, overhead: f.overhead, profit: f.profit
        });
        cb();
    } catch(e) { alert(e.message); }
}

export async function renameFormula(cb) {
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    const n = prompt('نام جدید:', f.name);
    if (n && n !== f.name) {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, f.$id, { name: n });
        cb();
    }
}