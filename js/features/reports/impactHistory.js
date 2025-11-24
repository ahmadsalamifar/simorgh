import { api } from '../../core/api.js';
import { APPWRITE_CONFIG, Query } from '../../core/config.js';
import { formatPrice, formatDate } from '../../core/utils.js';

let historyChart = null;

export async function loadPriceHistory(matId) {
    const ctx = document.getElementById('price-history-chart');
    const container = document.getElementById('chart-container');
    const msg = container.querySelector('p');
    
    if (!matId) return alert('لطفاً یک کالا انتخاب کنید.');

    // حالت لودینگ
    msg.style.display = 'block';
    msg.innerHTML = '⏳ در حال دریافت اطلاعات...';
    ctx.classList.add('hidden');
    if (historyChart) historyChart.destroy();
    
    try {
        const response = await api.list(APPWRITE_CONFIG.COLS.HISTORY, [
            Query.equal('material_id', matId),
            Query.orderDesc('date'),
            Query.limit(20)
        ]);

        const historyData = response.documents.reverse();

        if (historyData.length === 0) {
             msg.innerHTML = '⚠️ هنوز تاریخچه‌ای برای این کالا ثبت نشده است.';
             return;
        }

        msg.style.display = 'none';
        ctx.classList.remove('hidden');
        renderHistoryChart(ctx, historyData);

    } catch (e) {
        console.error(e);
        msg.innerHTML = '❌ خطا در دریافت اطلاعات';
        alert('خطا: ' + e.message);
    }
}

function renderHistoryChart(canvas, data) {
    const labels = data.map(d => formatDate(d.date));
    const prices = data.map(d => d.price);

    historyChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'قیمت (تومان)',
                data: prices,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
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
                        label: (ctx) => formatPrice(ctx.raw) + ' تومان'
                    }
                }
            },
            scales: {
                y: { ticks: { font: { family: 'Vazirmatn' } } },
                x: { ticks: { font: { family: 'Vazirmatn' } } }
            }
        }
    });
}