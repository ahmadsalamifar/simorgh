// توابع کمکی و ابزارها

// فرمت کردن قیمت (اعداد فارسی، ۳ رقم ۳ رقم، بدون اعشار)
export function formatPrice(n) {
    if (n === undefined || n === null || isNaN(n)) return '۰';
    // Math.round برای حذف اعشار
    // 'fa-IR' برای تبدیل به اعداد فارسی
    return Math.round(Number(n)).toLocaleString('fa-IR');
}

// تبدیل عدد (فارسی یا انگلیسی) به عدد جاوااسکریپت برای محاسبات
export function parseLocaleNumber(stringNumber) {
    if (!stringNumber) return 0;
    // تبدیل اعداد فارسی به انگلیسی
    const english = stringNumber.toString().replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
    // حذف کاما
    const clean = english.replace(/,/g, '');
    return parseFloat(clean) || 0;
}

// فرمت کردن تاریخ شمسی
export function formatDate(d) {
    return d ? new Date(d).toLocaleDateString('fa-IR') : '';
}

// بج (Badge) تاریخ بروزرسانی
export function getDateBadge(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const diffTime = Math.abs(new Date() - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let colorClass = 'bg-emerald-100 text-emerald-700 border-emerald-200'; // جدید
    if(diffDays > 7) colorClass = 'bg-orange-100 text-orange-700 border-orange-200'; // هفته پیش
    if(diffDays > 30) colorClass = 'bg-slate-100 text-slate-500 border-slate-200'; // قدیمی
    
    return `<span class="text-[10px] px-1.5 py-0.5 rounded border ${colorClass}">${formatDate(dateString)}</span>`;
}

// اعمال فرمت ۳ رقم هنگام تایپ (پشتیبانی از اعداد فارسی)
export function formatInput(el) {
    const val = parseLocaleNumber(el.value);
    if (val === 0 && el.value.trim() === '') return;
    // نمایش مجدد به صورت فارسی و ۳ رقم ۳ رقم
    el.value = val.toLocaleString('fa-IR');
}

// تغییر تب‌ها (Navigation)
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
