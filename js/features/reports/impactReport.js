import { state, APPWRITE_CONFIG, Query } from '../../core/config.js';
import { api } from '../../core/api.js';
import { formatPrice, parseLocaleNumber, formatDate } from '../../core/utils.js';
import { calculateCost } from '../formulas/formulas_calc.js';

let historyChart = null; // متغیر برای نگهداری اینستنس چارت

export function renderImpactTool(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <!-- تب‌های داخلی -->
            <div class="flex border-b bg-slate-50">
                <button class="flex-1 py-3 text-xs font-bold text-slate-600 border-b-2 border-transparent hover:bg-slate-100 transition-colors active-impact-tab border-indigo-500 text-indigo-700 bg-white" data-tab="impact-manual">
                    📉 تحلیل دستی
                </button>
                <button class="flex-1 py-3 text-xs font-bold text-slate-600 border-b-2 border-transparent hover:bg-slate-100 transition-colors" data-tab="impact-history">
                    📅 تاریخچه نوسانات
                </button>
            </div>

            <div class="p-4">
                <!-- تب ۱: تحلیل دستی و آنلاین -->
                <div id="impact-manual" class="impact-tab-content block">
                    <div class="flex flex-col md:flex-row gap-4 items-end mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div class="w-full md:w-1/3">
                            <label class="text-[10px] font-bold text-slate-500 mb-1 block">انتخاب کالا</label>
                            <select id="impact-mat-select" class="input-field text-xs h-10 bg-white"></select>
                        </div>
                        
                        <div class="w-1/2 md:w-1/4">
                            <label class="text-[10px] font-bold text-slate-500 mb-1 block">قیمت فعلی</label>
                            <input type="text" id="impact-current-price" class="input-field text-xs h-10 bg-slate-100 text-slate-500" disabled>
                        </div>

                        <div class="w-1/2 md:w-1/4">
                            <label class="text-[10px] font-bold text-indigo-600 mb-1 block">قیمت فرضی</label>
                            <input type="text" id="impact-new-price" class="input-field text-xs h-10 font-bold text-indigo-700 border-indigo-200" placeholder="قیمت جدید...">
                        </div>

                        <div class="w-full md:w-auto">
                            <button id="btn-calc-impact" class="btn btn-primary h-10 text-xs w-full shadow-lg shadow-indigo-500/20">محاسبه</button>
                        </div>
                    </div>
                    
                    <!-- دکمه آنلاین -->
                    <div class="mb-4">
                        <button id="btn-online-impact" class="btn btn-white border border-emerald-200 text-emerald-700 h-9 text-xs w-full hover:bg-emerald-50 flex justify-center items-center gap-2">
                             <span>⚡</span> دریافت قیمت‌های آنلاین و محاسبه تأثیر (Real-time)
                        </button>
                    </div>

                    <div id="impact-results" class="hidden">
                        <div class="flex justify-between items-center mb-2 border-b pb-2">
                            <span class="text-xs font-bold text-slate-700">نتایج تحلیل:</span>
                            <span id="impact-badge" class="text-[9px] bg-slate-100 px-2 py-0.5 rounded">---</span>
                        </div>
                        <div class="overflow-x-auto rounded-lg border border-slate-200 max-h-60 overflow-y-auto custom-scrollbar">
                            <table class="w-full text-xs text-right relative">
                                <thead class="bg-slate-50 text-slate-600 font-bold sticky top-0">
                                    <tr>
                                        <th class="p-2 border-b">نام محصول</th>
                                        <th class="p-2 border-b text-center">قیمت قبل</th>
                                        <th class="p-2 border-b text-center text-indigo-600">قیمت بعد</th>
                                        <th class="p-2 border-b text-center">اختلاف</th>
                                        <th class="p-2 border-b text-center">٪</th>
                                    </tr>
                                </thead>
                                <tbody id="impact-table-body" class="divide-y divide-slate-100 bg-white"></tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- تب ۲: تاریخچه و نمودار -->
                <div id="impact-history" class="impact-tab-content hidden">
                    <div class="flex gap-2 mb-4 items-end">
                        <div class="flex-1">
                            <label class="text-[10px] font-bold text-slate-500 mb-1 block">نمودار قیمت کالا</label>
                            <select id="history-mat-select" class="input-field text-xs h-9 bg-white"></select>
                        </div>
                        <button id="btn-load-history" class="btn btn-primary h-9 text-xs px-4">نمایش</button>
                    </div>
                    
                    <div class="relative h-64 w-full bg-slate-50 rounded-xl border border-slate-100 p-2 flex items-center justify-center" id="chart-container">
                        <p class="text-slate-400 text-xs">یک کالا را انتخاب کنید تا تاریخچه قیمت آن نمایش داده شود.</p>
                        <canvas id="price-history-chart" class="hidden"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;

    setupListeners();
    setupTabs();
}

function setupTabs() {
    const tabs = document.querySelectorAll('[data-tab]');
    tabs.forEach(btn => {
        btn.onclick = () => {
            tabs.forEach(t => {
                t.classList.remove('border-indigo-500', 'text-indigo-700', 'bg-white');
                t.classList.add('border-transparent');
            });
            btn.classList.remove('border-transparent');
            btn.classList.add('border-indigo-500', 'text-indigo-700', 'bg-white');
            
            document.querySelectorAll('.impact-tab-content').forEach(c => c.classList.add('hidden'));
            document.getElementById(btn.dataset.tab).classList.remove('hidden');
        };
    });
}

function setupListeners() {
    // ---- بخش دستی ----
    const select = document.getElementById('impact-mat-select');
    const currentInput = document.getElementById('impact-current-price');
    const newInput = document.getElementById('impact-new-price');
    const btnCalc = document.getElementById('btn-calc-impact');
    const btnOnline = document.getElementById('btn-online-impact');

    const matOptions = '<option value="">انتخاب کالا...</option>' + 
        state.materials.sort((a,b) => a.name.localeCompare(b.name)).map(m => 
            `<option value="${m.$id}">${m.name}</option>`
        ).join('');
    
    select.innerHTML = matOptions;

    // پر کردن دراپ‌داون تاریخچه همزمان
    const historySelect = document.getElementById('history-mat-select');
    if(historySelect) historySelect.innerHTML = matOptions;

    select.onchange = () => {
        const id = select.value;
        if(!id) { currentInput.value = ''; return; }
        const m = state.materials.find(x => x.$id === id);
        if(m) currentInput.value = formatPrice(m.price);
    };

    btnCalc.onclick = () => {
        const matId = select.value;
        const newPrice = parseLocaleNumber(newInput.value);
        if(!matId || isNaN(newPrice)) return alert('اطلاعات ناقص است');
        simulateImpact([{ id: matId, newPrice: newPrice }], false);
    };
    
    btnOnline.onclick = handleOnlineAnalysis;

    // ---- بخش تاریخچه ----
    const btnHistory = document.getElementById('btn-load-history');
    if(btnHistory) {
        btnHistory.onclick = async () => {
            const matId = document.getElementById('history-mat-select').value;
            if(!matId) return alert('کالا را انتخاب کنید');
            await loadPriceHistory(matId);
        };
    }
}

// ... توابع handleOnlineAnalysis و simulateImpact و renderResultsTable مشابه قبل باقی می‌مانند ...
// برای کوتاه شدن کد آنها را تکرار نمی‌کنم مگر اینکه نیاز به تغییر داشته باشند که ندارند. 
// فقط باید مطمئن شویم در فایل نهایی وجود دارند.
async function handleOnlineAnalysis() {
    const btn = document.getElementById('btn-online-impact');
    if(!confirm('آیا مطمئن هستید؟ قیمت کالاها در دیتابیس بروزرسانی خواهد شد.')) return;

    const originalBtnContent = btn.innerHTML;
    btn.innerHTML = '⏳ در حال دریافت...';
    btn.disabled = true;

    const preCosts = new Map();
    state.formulas.forEach(f => preCosts.set(f.$id, calculateCost(f).final));

    try {
        const scraperResult = await api.runScraper({ type: 'bulk' });
        if (!scraperResult.success) throw new Error(scraperResult.error || 'خطا در اسکرپر');

        // فرض می‌کنیم اسکرپر سمت کلاینت تاریخچه را ذخیره کرده (در materials_scraper.js)
        // حالا باید دیتا را رفرش کنیم
        const m = await api.list(APPWRITE_CONFIG.COLS.MATS, [Query.limit(5000)]);
        state.materials = m.documents;

        const impacts = [];
        state.formulas.forEach(f => {
            const oldCost = preCosts.get(f.$id) || 0;
            const newCost = calculateCost(f).final;
            if (Math.abs(newCost - oldCost) > 1) {
                impacts.push({
                    name: f.name,
                    old: oldCost,
                    new: newCost,
                    diff: newCost - oldCost,
                    percent: oldCost > 0 ? ((newCost - oldCost) / oldCost) * 100 : 0
                });
            }
        });

        renderResultsTable(impacts, true);
        alert(`✅ عملیات انجام شد.\nتعداد کالاهای بروز شده: ${scraperResult.report ? scraperResult.report.filter(r => r.new).length : 0}`);

    } catch (e) {
        alert('خطا: ' + e.message);
    } finally {
        btn.innerHTML = originalBtnContent;
        btn.disabled = false;
    }
}

function simulateImpact(changes, isRealUpdate) {
    const originalPrices = new Map();
    const preCosts = state.formulas.map(f => ({ id: f.$id, cost: calculateCost(f).final }));

    changes.forEach(c => {
        const m = state.materials.find(x => x.$id === c.id);
        if(m) {
            originalPrices.set(m.$id, m.price);
            m.price = c.newPrice;
        }
    });

    const results = [];
    state.formulas.forEach((f, idx) => {
        const newCost = calculateCost(f).final;
        const oldCost = preCosts[idx].cost;
        if (Math.abs(newCost - oldCost) > 1) {
            results.push({
                name: f.name,
                old: oldCost,
                new: newCost,
                diff: newCost - oldCost,
                percent: oldCost > 0 ? ((newCost - oldCost) / oldCost) * 100 : 0
            });
        }
    });

    if (!isRealUpdate) {
        changes.forEach(c => {
            const m = state.materials.find(x => x.$id === c.id);
            if(m && originalPrices.has(m.$id)) m.price = originalPrices.get(m.$id);
        });
    }

    renderResultsTable(results, false);
}

function renderResultsTable(list, isOnlineReport) {
    const container = document.getElementById('impact-results');
    const tbody = document.getElementById('impact-table-body');
    const badge = document.getElementById('impact-badge');
    
    container.classList.remove('hidden');
    
    badge.innerText = isOnlineReport ? 'بر اساس آپدیت آنلاین' : 'شبیه‌سازی دستی';
    badge.className = `text-[9px] px-2 py-0.5 rounded ${isOnlineReport ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`;

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">بدون تغییر</td></tr>';
        return;
    }

    list.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    tbody.innerHTML = list.map(item => {
        const isIncrease = item.diff > 0;
        const diffColor = isIncrease ? 'text-rose-600' : 'text-emerald-600';
        return `
        <tr class="hover:bg-slate-50 transition-colors border-b last:border-0">
            <td class="p-2 font-bold text-slate-700 text-right">${item.name}</td>
            <td class="p-2 text-center text-slate-400 font-mono text-[10px]">${formatPrice(item.old)}</td>
            <td class="p-2 text-center font-bold text-slate-800 font-mono text-[10px]">${formatPrice(item.new)}</td>
            <td class="p-2 text-center dir-ltr font-mono font-bold ${diffColor}">
                ${isIncrease ? '+' : ''}${formatPrice(item.diff)}
            </td>
            <td class="p-2 text-center text-slate-500 text-[10px] dir-ltr">
                ${isIncrease ? '▲' : '▼'} %${Math.abs(item.percent).toFixed(2)}
            </td>
        </tr>`;
    }).join('');
}

// --- توابع نمودار تاریخچه ---

async function loadPriceHistory(matId) {
    const ctx = document.getElementById('price-history-chart');
    const container = document.getElementById('chart-container');
    const p = container.querySelector('p');
    
    if(p) p.style.display = 'none';
    ctx.classList.remove('hidden');
    
    // نمایش لودینگ روی چارت
    if (historyChart) historyChart.destroy();
    
    try {
        // دریافت داده‌ها از کالکشن تاریخچه
        // فرض می‌کنیم فیلد material_id ایندکس شده است
        const response = await api.list(APPWRITE_CONFIG.COLS.HISTORY, [
            Query.equal('material_id', matId),
            Query.orderDesc('date'),
            Query.limit(20) // ۲۰ تغییر آخر
        ]);

        const historyData = response.documents.reverse(); // معکوس کردن برای نمایش از قدیم به جدید

        if (historyData.length === 0) {
             alert('هیچ تاریخچه‌ای برای این کالا ثبت نشده است.');
             return;
        }

        renderHistoryChart(ctx, historyData);

    } catch (e) {
        console.error(e);
        alert('خطا در دریافت تاریخچه: ' + e.message);
    }
}

function renderHistoryChart(canvas, data) {
    const labels = data.map(d => formatDate(d.date)); // یا d.$createdAt
    const prices = data.map(d => d.price);

    historyChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'تغییرات قیمت (تومان)',
                data: prices,
                borderColor: '#6366f1', // Indigo 500
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#6366f1',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    bodyFont: { family: 'Vazirmatn' },
                    titleFont: { family: 'Vazirmatn' },
                    callbacks: {
                        label: function(context) {
                            return formatPrice(context.raw) + ' تومان';
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: { font: { family: 'Vazirmatn' } }
                },
                x: {
                    ticks: { font: { family: 'Vazirmatn' } }
                }
            }
        }
    });
}
