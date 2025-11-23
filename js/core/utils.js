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

// مدیریت نمایش/مخفی کردن المان‌ها
export function toggleElement(id, show) {
    const el = document.getElementById(id);
    if (!el) return;
    if (show) {
        el.classList.remove('hidden');
        if (el.classList.contains('modal-overlay')) el.style.display = 'flex';
    } else {
        el.classList.add('hidden');
        if (el.classList.contains('modal-overlay')) el.style.display = 'none';
    }
}