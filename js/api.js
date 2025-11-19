import { db, functions, ID, Query, APPWRITE_CONFIG, state } from './config.js';

// ... (کدهای قبلی fetchAllData سرجای خود بمانند) ...

export const api = {
    create: (col, data) => db.createDocument(APPWRITE_CONFIG.DB_ID, col, ID.unique(), data),
    update: (col, id, data) => db.updateDocument(APPWRITE_CONFIG.DB_ID, col, id, data),
    delete: (col, id) => db.deleteDocument(APPWRITE_CONFIG.DB_ID, col, id),
    get: (col, id) => db.getDocument(APPWRITE_CONFIG.DB_ID, col, id),
    
    // --- تغییر این بخش: اجرای واقعی فانکشن ---
    runScraper: async () => {
        console.log("🚀 Executing Scraper Function...");
        try {
            // اجرای فانکشن روی سرور Appwrite
            const execution = await functions.createExecution(
                APPWRITE_CONFIG.FUNCTIONS.SCRAPER, // مطمئن شوید ID فانکشن در config.js درست است
                '' // body (خالی)
            );
            
            // بررسی نتیجه
            if (execution.status === 'completed') {
                try {
                    const result = JSON.parse(execution.responseBody);
                    return result;
                } catch (e) {
                    console.error("Parse Error", execution.responseBody);
                    return { success: false, error: "خطا در خواندن پاسخ سرور" };
                }
            } else {
                return { success: false, error: "اجرای فانکشن ناموفق بود" };
            }
        } catch (error) {
            console.error("Function Error:", error);
            throw error;
        }
    }
};
```

---

### مرحله ۳: آپدیت `js/materials.js` (نمایش گزارش)
حالا وقتی دکمه را می‌زنید، نتیجه را می‌گیرد و در یک جدول زیبا نشان می‌دهد.

**فایل:** `cost_calculator-Appwrite/js/materials.js`
(فقط بخش `scraperBtn.onclick` را که در تابع `setupMaterials` است تغییر دهید. بقیه فایل ثابت است).

```javascript
// ... داخل تابع setupMaterials ...

    const scraperBtn = document.getElementById('btn-scraper-trigger');
    if(scraperBtn) scraperBtn.onclick = async () => {
        if(!confirm('آیا مطمئن هستید؟ این کار ممکن است ۳۰ ثانیه طول بکشد.')) return;
        
        scraperBtn.innerText = '⏳ در حال جستجو در سایت‌ها...';
        scraperBtn.disabled = true;
        
        try {
            const result = await api.runScraper();
            
            if(result.success && result.report) {
                showScraperReport(result.report); // نمایش گزارش
                refreshCallback(); // رفرش لیست کالاها
            } else {
                alert('خطا: ' + (result.error || 'مشکلی پیش آمد'));
            }
        } catch(e) { 
            alert('خطای ارتباط: ' + e.message); 
        } finally { 
            scraperBtn.innerText = '🤖 بروزرسانی قیمت‌ها'; 
            scraperBtn.disabled = false;
        }
    };

// ... بقیه توابع ...

// --- تابع جدید برای نمایش گزارش (این را به آخر فایل اضافه کنید) ---
function showScraperReport(report) {
    // ساخت HTML گزارش
    let html = `
    <div class="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4" id="report-modal">
        <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div class="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 class="font-bold text-slate-800">گزارش ربات قیمت‌گیر</h3>
                <button onclick="document.getElementById('report-modal').remove()" class="text-slate-400 hover:text-rose-500 text-xl">×</button>
            </div>
            <div class="overflow-y-auto p-4 space-y-2 custom-scrollbar text-sm">
    `;

    if(report.length === 0) html += '<p class="text-center text-slate-400">گزارشی وجود ندارد.</p>';

    report.forEach(item => {
        let color = 'border-slate-200 bg-slate-50';
        let icon = '⚪';
        
        if(item.status === 'success') { color = 'border-emerald-200 bg-emerald-50'; icon = '✅'; }
        if(item.status === 'error') { color = 'border-rose-200 bg-rose-50'; icon = '❌'; }
        if(item.status === 'info') { color = 'border-blue-100 bg-blue-50'; icon = '🔹'; }

        html += `
        <div class="border rounded-xl p-3 ${color}">
            <div class="flex justify-between items-start mb-1">
                <div class="font-bold text-slate-700 flex items-center gap-2">${icon} ${item.name}</div>
                <div class="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border">${item.status.toUpperCase()}</div>
            </div>
            <div class="text-xs text-slate-600">${item.msg}</div>
            ${item.detail ? `<div class="text-[11px] font-mono text-slate-500 mt-1 dir-ltr text-left border-t border-slate-200/50 pt-1">${item.detail}</div>` : ''}
            ${item.method ? `<div class="text-[9px] text-slate-400 mt-1">روش یافتن: ${item.method}</div>` : ''}
            ${item.status === 'success' ? `<div class="flex justify-between mt-2 text-xs font-bold"><span class="text-rose-400 line-through">${item.old}</span> <span class="text-emerald-600">➤ ${item.new}</span></div>` : ''}
        </div>`;
    });

    html += `
            </div>
            <div class="p-3 border-t bg-slate-50 text-center">
                <button onclick="document.getElementById('report-modal').remove()" class="btn btn-primary w-full">بستن</button>
            </div>
        </div>
    </div>`;

    // اضافه کردن به صفحه
    document.body.insertAdjacentHTML('beforeend', html);
}