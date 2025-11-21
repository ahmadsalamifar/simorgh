// توابع کمکی و ابزارها - نسخه اصلاح شده

// فرمت کردن قیمت (اعداد فارسی، ۳ رقم ۳ رقم، بدون اعشار)
export function formatPrice(n) {
    if (n === undefined || n === null || isNaN(n)) return '۰';
    // نمایش به صورت فارسی و ۳ رقم ۳ رقم
    return Math.round(Number(n)).toLocaleString('fa-IR');
}

// تبدیل عدد (فارسی یا انگلیسی) به عدد جاوااسکریپت برای محاسبات
export function parseLocaleNumber(stringNumber) {
    if (!stringNumber) return 0;
    if (typeof stringNumber === 'number') return stringNumber;
    
    // تبدیل اعداد فارسی به انگلیسی
    const english = stringNumber.toString()
        .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
        .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)); // اعداد عربی
        
    // حذف کاما و کاراکترهای غیر عددی (به جز نقطه برای اعشار)
    const clean = english.replace(/[^0-9.]/g, '');
    return parseFloat(clean) || 0;
}

// فرمت کردن تاریخ شمسی
export function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fa-IR');
}

// بج (Badge) تاریخ بروزرسانی
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

// تغییر تب‌ها
export function switchTab(id) {
    ['formulas', 'materials', 'categories', 'store'].forEach(t => {
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

export function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.remove('hidden');
        el.style.display = 'flex';
    }
}

export function closeModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('hidden');
        el.style.display = 'none';
    }
}
