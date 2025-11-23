// ابزارهای عمومی و فرمت‌دهی
// وظیفه: توابع خالص (Pure Functions) که در همه جای برنامه استفاده می‌شوند

/**
 * تبدیل اعداد فارسی/عربی به انگلیسی و پارس کردن به Float
 */
export function parseLocaleNumber(stringNumber) {
    if (stringNumber === undefined || stringNumber === null || stringNumber === '') return 0;
    if (typeof stringNumber === 'number') return stringNumber;
    
    let str = stringNumber.toString().trim();
    str = str.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
             .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
             
    // حذف همه کاراکترها بجز اعداد، نقطه و منفی
    const clean = str.replace(/[^0-9.-]/g, '');
    
    if (!clean) return 0;
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
}

export function formatPrice(n) {
    if (n === undefined || n === null || isNaN(n)) return '۰';
    return Math.round(Number(n)).toLocaleString('fa-IR');
}

export function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fa-IR');
}

export function getDateBadge(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const diffDays = Math.ceil(Math.abs(new Date() - date) / (1000 * 60 * 60 * 24));
    
    let colorClass = 'bg-emerald-100 text-emerald-700 border-emerald-200'; 
    let text = formatDate(dateString);

    if(diffDays > 7) colorClass = 'bg-orange-100 text-orange-700 border-orange-200'; 
    if(diffDays > 30) {
        colorClass = 'bg-slate-100 text-slate-500 border-slate-200'; 
        text = 'قدیمی: ' + text;
    }
    return `<span class="text-[10px] px-1.5 py-0.5 rounded border ${colorClass} whitespace-nowrap">${text}</span>`;
}

// مدیریت تب‌ها
export function switchTab(id) {
    // لیست تمام تب‌های موجود در HTML
    const tabs = ['formulas', 'materials', 'reports', 'categories', 'store'];
    
    tabs.forEach(t => {
        const el = document.getElementById('tab-' + t);
        const btn = document.getElementById('btn-tab-' + t);
        if (el) el.classList.add('hidden');
        if (btn) btn.classList.remove('active');
    });

    const targetEl = document.getElementById('tab-' + id);
    const targetBtn = document.getElementById('btn-tab-' + id);
    
    if(targetEl) targetEl.classList.remove('hidden');
    if(targetBtn) targetBtn.classList.add('active');
}

// مدیریت نمایش/مخفی کردن المان‌ها (برای مدال‌ها و لودینگ)
export function toggleElement(id, show) {
    const el = document.getElementById(id);
    if (!el) return;
    if (show) {
        el.classList.remove('hidden');
        // اگر کلاس modal-overlay دارد باید flex شود تا وسط چین بماند
        if (el.classList.contains('modal-overlay')) el.style.display = 'flex';
    } else {
        el.classList.add('hidden');
        if (el.classList.contains('modal-overlay')) el.style.display = 'none';
    }
}

export function openModal(id) { toggleElement(id, true); }
export function closeModal(id) { toggleElement(id, false); }

export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}