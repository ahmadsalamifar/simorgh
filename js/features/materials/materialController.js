// کنترل‌کننده اصلی بخش مواد اولیه
// وظیفه: هماهنگی بین فرم، لیست و API. نقطه ورود این ماژول.

import { api } from '../../core/api.js';
import { state, APPWRITE_CONFIG } from '../../core/config.js';
import * as ListUI from './materialList.js';
import * as FormUI from './materialForm.js';

// راه‌اندازی اولیه ماژول
export function init(refreshAppCallback) {
    // راه‌اندازی لیست و جستجو
    ListUI.setupSearchListeners(renderMaterials);
    
    // راه‌اندازی فرم و دکمه‌ها
    FormUI.setupFormListeners(async (formData) => {
        await saveMaterial(formData);
        refreshAppCallback();
    });

    // دکمه جدید
    const btnNew = document.getElementById('btn-new-mat-plus');
    if (btnNew) btnNew.onclick = FormUI.resetForm;
}

// تابع اصلی رندر که توسط Main صدا زده می‌شود
export function renderMaterials() {
    ListUI.renderGrid(state.materials, state.categories, handleDelete, handleEdit);
}

// منطق ذخیره سازی
async function saveMaterial(data) {
    const id = document.getElementById('mat-id').value;
    try {
        if (id) {
            await api.update(APPWRITE_CONFIG.COLS.MATS, id, data);
        } else {
            await api.create(APPWRITE_CONFIG.COLS.MATS, data);
        }
        FormUI.resetForm();
    } catch(e) {
        alert('خطا در ذخیره: ' + e.message);
    }
}

// هندلرها برای اکشن‌های لیست
async function handleDelete(id) {
    if(confirm('حذف شود؟')) {
        try {
            await api.delete(APPWRITE_CONFIG.COLS.MATS, id);
            // حذف از State لوکال برای آپدیت سریع UI
            state.materials = state.materials.filter(m => m.$id !== id);
            renderMaterials();
        } catch(e) { alert(e.message); }
    }
}

function handleEdit(id) {
    const material = state.materials.find(m => m.$id === id);
    if (material) FormUI.populateForm(material);
}