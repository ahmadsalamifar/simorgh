// مدیریت فرم ورود اطلاعات مواد
import { formatPrice, parseLocaleNumber } from '../../core/utils.js';
// اصلاح آدرس ایمپورت (چون فایل در همین پوشه است)
import * as Units from './materials_units.js'; 

export function setupFormListeners(onSubmit) {
    const form = document.getElementById('material-form');
    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();
            onSubmit(collectFormData());
        };
    }
    
    document.getElementById('mat-cancel-btn')?.addEventListener('click', resetForm);
    setupPriceInputFormat();
}

function collectFormData() {
    const unitData = Units.getUnitData(); 
    const rawPrice = document.getElementById('mat-price').value;
    
    return {
        name: document.getElementById('mat-name').value,
        display_name: document.getElementById('mat-display-name').value,
        category_id: document.getElementById('mat-category').value,
        price: parseLocaleNumber(rawPrice),
        unit_relations: JSON.stringify(unitData),
        has_tax: document.getElementById('mat-has-tax').checked,
        // اینجا می‌توانید فیلدهای اسکرپر را هم اضافه کنید
        scraper_url: document.getElementById('mat-scraper-url').value,
        scraper_factor: parseFloat(document.getElementById('mat-scraper-factor').value) || 1
    };
}

export function populateForm(m) {
    document.getElementById('mat-id').value = m.$id;
    document.getElementById('mat-name').value = m.name;
    document.getElementById('mat-display-name').value = m.display_name || ''; // هندل کردن null
    document.getElementById('mat-category').value = m.category_id || '';
    document.getElementById('mat-price').value = formatPrice(m.price);
    document.getElementById('mat-has-tax').checked = !!m.has_tax;
    
    // بازگردانی اطلاعات واحدها
    try {
        Units.setUnitData(m.unit_relations);
    } catch(e) { Units.resetUnitData(); }

    // نمایش دکمه کنسل
    document.getElementById('mat-cancel-btn').classList.remove('hidden');
    document.getElementById('mat-submit-btn').innerText = 'ذخیره تغییرات';
}

export function resetForm() {
    document.getElementById('material-form').reset();
    document.getElementById('mat-id').value = '';
    document.getElementById('mat-cancel-btn').classList.add('hidden');
    document.getElementById('mat-submit-btn').innerText = 'ذخیره کالا';
    Units.resetUnitData();
}

function setupPriceInputFormat() {
    const el = document.getElementById('mat-price');
    if(!el) return;
    el.onblur = (e) => e.target.value = formatPrice(parseLocaleNumber(e.target.value));
    el.onfocus = (e) => e.target.value = parseLocaleNumber(e.target.value) || '';
}