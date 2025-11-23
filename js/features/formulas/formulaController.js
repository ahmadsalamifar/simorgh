// کنترلر اصلی فرمول‌ها (نسخه سبک شده)
import { state, APPWRITE_CONFIG } from '../../core/config.js'; // اضافه کردن APPWRITE_CONFIG
import { api } from '../../core/api.js'; // اضافه کردن api برای update
import { parseLocaleNumber, closeModal } from '../../core/utils.js';
import * as ListUI from './formulaList.js';
import * as DetailUI from './formulaDetail.js';
import * as Actions from './formulaActions.js';
import * as UIHelpers from './formulaUIHelpers.js';

export function init(refreshCb) {
    UIHelpers.injectLayout(); 
    
    setTimeout(() => {
        ListUI.setupSearch(() => ListUI.renderList(state.activeFormulaId, selectFormula));
        
        // دکمه‌های مدال جدید
        const btnCreate = document.getElementById('btn-create-formula');
        if(btnCreate) btnCreate.onclick = () => Actions.createFormula(refreshCb);
        
        const btnCancel = document.getElementById('btn-cancel-formula');
        if(btnCancel) btnCancel.onclick = () => closeModal('new-formula-modal');

        // پنل جزئیات
        document.getElementById('form-add-comp').onsubmit = (e) => {
            e.preventDefault();
            addComponent(refreshCb);
        };
        
        const btnSave = document.getElementById('btn-save-formula');
        if(btnSave) btnSave.onclick = () => Actions.saveFormulaChanges(refreshCb);

        // ورودی‌ها (ذخیره لوکال)
        ['labor', 'overhead', 'profit'].forEach(key => {
            const inp = document.getElementById('inp-' + key);
            if(inp) inp.onchange = (e) => {
                if(state.activeFormulaId) {
                    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
                    if(f) {
                        f[key] = parseLocaleNumber(e.target.value);
                        DetailUI.renderDetailView(f, { onDeleteComp: (idx) => removeComponent(idx, refreshCb) }); 
                        UIHelpers.highlightSaveButton();
                    }
                }
            };
        });

        // دکمه‌های عملیاتی
        document.getElementById('btn-delete-formula').onclick = () => Actions.deleteFormula(refreshCb);
        document.getElementById('btn-duplicate-formula').onclick = () => Actions.duplicateFormula(refreshCb);
        document.getElementById('active-formula-name').onclick = () => Actions.renameFormula(refreshCb);

        DetailUI.setupDropdownListeners();
    }, 50); 
}

export function renderFormulaList() {
    ListUI.renderList(state.activeFormulaId, selectFormula);
}

function selectFormula(id) {
    state.activeFormulaId = id;
    renderFormulaList();
    UIHelpers.resetSaveButton();
    
    const formula = state.formulas.find(f => f.$id === id);
    DetailUI.renderDetailView(formula, {
        onDeleteComp: (idx) => removeComponent(idx, () => selectFormula(id))
    });

    if (window.innerWidth < 1024) document.getElementById('detail-panel')?.scrollIntoView({ behavior: 'smooth' });
}

// مدیریت لوکال اجزا (Component Logic)
async function addComponent(cb) {
    if (!state.activeFormulaId) return;
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    
    const val = document.getElementById('comp-select').value;
    const qty = parseFloat(document.getElementById('comp-qty').value);
    const unit = document.getElementById('comp-unit-select').value;

    if (!val || !qty) return alert('اطلاعات ناقص است');

    const [typePrefix, id] = val.split(':');
    const type = typePrefix === 'MAT' ? 'mat' : 'form';
    
    let comps = parseComponents(f.components);
    const exist = comps.find(c => c.id === id && c.type === type && c.unit === unit);
    if (exist) exist.qty += qty; else comps.push({ id, type, qty, unit });

    f.components = comps;
    DetailUI.renderDetailView(f, { onDeleteComp: (idx) => removeComponent(idx, cb) });
    UIHelpers.highlightSaveButton();
}

async function removeComponent(idx, cb) {
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    let comps = parseComponents(f.components);
    comps.splice(idx, 1);
    f.components = comps;
    DetailUI.renderDetailView(f, { onDeleteComp: (idx) => removeComponent(idx, cb) });
    UIHelpers.highlightSaveButton();
}

function parseComponents(data) {
    try { return typeof data === 'string' ? JSON.parse(data) : (data || []); } catch { return []; }
}