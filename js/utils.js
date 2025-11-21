// توابع کمکی عمومی (بدون وابستگی به بیزینس لاجیک خاص)

/**
 * تبدیل اعداد فارسی/عربی به انگلیسی و پارس کردن به Float
 * @param {string|number} stringNumber 
 * @returns {number}
 */
export function parseLocaleNumber(stringNumber) {
    if (stringNumber === undefined || stringNumber === null || stringNumber === '') return 0;
    if (typeof stringNumber === 'number') return stringNumber;
    
    let str = stringNumber.toString().trim();
    
    // تبدیل اعداد فارسی و عربی به انگلیسی
    str = str.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
             .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
             
    // حذف کاما (جداکننده هزارگان)
    // توجه: اگر از نقطه برای اعشار استفاده می‌کنید، آن را نگه می‌داریم.
    const clean = str.replace(/,/g, '');
    
    // استخراج عدد (شامل منفی و اعشار)
    const match = clean.match(/-?\d+(\.\d+)?/);
    
    return match ? parseFloat(match[0]) : 0;
}

/**
 * فرمت کردن قیمت به صورت ۳ رقم ۳ رقم با اعداد فارسی
 * @param {number} n 
 * @returns {string}
 */
export function formatPrice(n) {
    if (n === undefined || n === null || isNaN(n)) return '۰';
    // گرد کردن و نمایش به لوکال فارسی
    return Math.round(Number(n)).toLocaleString('fa-IR');
}

export function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fa-IR');
}

export function getDateBadge(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const diffTime = Math.abs(new Date() - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
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
    const tabs = ['formulas', 'materials', 'categories', 'store'];
    
    tabs.forEach(t => {
        const el = document.getElementById('tab-' + t);
        const btn = document.getElementById('btn-tab-' + t);
        if (el) el.classList.add('hidden');
        if (btn) btn.classList.remove('active');
    });

    const target = document.getElementById('tab-' + id);
    const targetBtn = document.getElementById('btn-tab-' + id);
    
    if (target) target.classList.remove('hidden');
    if (targetBtn) targetBtn.classList.add('active');
}

// مدیریت مدال‌ها
export function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.remove('hidden');
        el.style.display = 'flex'; // اطمینان از سنتر شدن فلکس
    }
}

export function closeModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('hidden');
        el.style.display = 'none';
    }
}

// تابع تاخیر انداز (Debounce) برای جستجو
export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}
