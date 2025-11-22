// توابع کمکی عمومی - نسخه پایدار

export function parseLocaleNumber(stringNumber) {
    if (stringNumber === undefined || stringNumber === null || stringNumber === '') return 0;
    if (typeof stringNumber === 'number') return stringNumber;
    
    let str = stringNumber.toString().trim();
    // تبدیل اعداد فارسی/عربی
    str = str.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
             .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    // حذف کاراکترهای غیر عددی به جز نقطه و منفی
    const clean = str.replace(/[^0-9.-]/g, '');
    
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

export function switchTab(id) {
    ['formulas', 'materials', 'categories', 'store'].forEach(t => {
        document.getElementById('tab-' + t)?.classList.add('hidden');
        document.getElementById('btn-tab-' + t)?.classList.remove('active');
    });

    document.getElementById('tab-' + id)?.classList.remove('hidden');
    document.getElementById('btn-tab-' + id)?.classList.add('active');
}

export function openModal(id) {
    const el = document.getElementById(id);
    if(el) { el.classList.remove('hidden'); el.style.display = 'flex'; }
}

export function closeModal(id) {
    const el = document.getElementById(id);
    if(el) { el.classList.add('hidden'); el.style.display = 'none'; }
}

export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}