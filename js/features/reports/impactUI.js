import { formatPrice } from '../../core/utils.js';

export function getImpactToolHTML(materials) {
    // تولید آپشن‌های دراپ‌داون
    const matOptions = '<option value="">انتخاب کالا...</option>' + 
        materials.sort((a,b) => a.name.localeCompare(b.name)).map(m => 
            `<option value="${m.$id}">${m.name}</option>`
        ).join('');

    return `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div class="p-4 bg-slate-50 border-b flex justify-between items-center">
            <h3 class="font-bold text-slate-700 flex items-center gap-2">
                <span class="bg-indigo-100 text-indigo-600 p-1 rounded">📉</span>
                تحلیل و تاریخچه نوسانات
            </h3>
        </div>

        <div class="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- بخش ۱: بروزرسانی و تحلیل آنلاین -->
            <div class="border rounded-xl p-4 bg-white relative">
                <h4 class="font-bold text-xs text-slate-500 mb-3 border-b pb-2">۱. بروزرسانی و تحلیل آنلاین</h4>
                <p class="text-[10px] text-slate-400 mb-4">با زدن دکمه زیر، ربات قیمت‌های جدید را از سایت‌ها دریافت کرده و تاثیر آن بر قیمت تمام‌شده محصولات را محاسبه می‌کند.</p>
                
                <button id="btn-online-impact" class="btn btn-primary w-full h-10 text-xs shadow-lg shadow-indigo-500/20 mb-4 flex justify-center items-center gap-2">
                     <span>⚡</span> دریافت قیمت آنلاین و محاسبه تأثیر
                </button>

                <!-- جدول نتایج -->
                <div id="impact-results" class="hidden animate-in fade-in slide-in-from-top-2">
                    <div class="flex justify-between items-center mb-2 bg-slate-50 p-2 rounded">
                        <span class="text-xs font-bold text-slate-700">نتایج تغییرات:</span>
                        <span id="impact-badge" class="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Real-time</span>
                    </div>
                    <div class="overflow-x-auto rounded-lg border border-slate-200 max-h-60 overflow-y-auto custom-scrollbar">
                        <table class="w-full text-xs text-right relative">
                            <thead class="bg-slate-50 text-slate-600 font-bold sticky top-0 z-10">
                                <tr>
                                    <th class="p-2 border-b">محصول</th>
                                    <th class="p-2 border-b text-center">قبل</th>
                                    <th class="p-2 border-b text-center text-indigo-600">بعد</th>
                                    <th class="p-2 border-b text-center">٪</th>
                                </tr>
                            </thead>
                            <tbody id="impact-table-body" class="divide-y divide-slate-100 bg-white"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- بخش ۲: تاریخچه قیمت -->
            <div class="border rounded-xl p-4 bg-white flex flex-col">
                <h4 class="font-bold text-xs text-slate-500 mb-3 border-b pb-2">۲. نمودار سابقه قیمت</h4>
                <div class="flex gap-2 mb-4">
                    <select id="history-mat-select" class="input-field text-xs h-9 bg-slate-50 flex-1">${matOptions}</select>
                    <button id="btn-load-history" class="btn btn-secondary h-9 text-xs px-3 border border-slate-200 hover:bg-slate-100">نمایش</button>
                </div>
                
                <div class="relative flex-1 min-h-[200px] w-full bg-slate-50 rounded-xl border border-slate-100 p-2 flex items-center justify-center" id="chart-container">
                    <p class="text-slate-400 text-xs text-center px-4">کالا را انتخاب کنید تا نمودار تغییرات قیمت نمایش داده شود.</p>
                    <canvas id="price-history-chart" class="hidden w-full h-full"></canvas>
                </div>
            </div>
        </div>
    </div>`;
}

export function renderResultsTable(list) {
    const container = document.getElementById('impact-results');
    const tbody = document.getElementById('impact-table-body');
    
    container.classList.remove('hidden');

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-400">هیچ تغییری در قیمت تمام‌شده محصولات ایجاد نشد.</td></tr>';
        return;
    }

    list.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    tbody.innerHTML = list.map(item => {
        const isIncrease = item.diff > 0;
        const colorClass = isIncrease ? 'text-rose-600' : 'text-emerald-600';
        return `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="p-2 font-bold text-slate-700 truncate max-w-[100px]" title="${item.name}">${item.name}</td>
            <td class="p-2 text-center text-slate-400 font-mono text-[10px]">${formatPrice(item.old)}</td>
            <td class="p-2 text-center font-bold text-slate-800 font-mono text-[10px]">${formatPrice(item.new)}</td>
            <td class="p-2 text-center text-[10px] dir-ltr font-bold ${colorClass}">
                ${isIncrease ? '▲' : '▼'} %${Math.abs(item.percent).toFixed(1)}
            </td>
        </tr>`;
    }).join('');
}
