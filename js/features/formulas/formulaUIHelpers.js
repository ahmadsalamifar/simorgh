// مدیریت بخش‌های ظاهری و HTML فرمول‌ها
import { openModal } from '../../core/utils.js';

export function injectLayout() {
    const container = document.getElementById('tab-formulas');
    if (!container || document.getElementById('formula-master-list')) return;

    container.innerHTML = `
        <div class="w-full lg:w-1/3 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-[350px] lg:h-full shrink-0">
            <div class="p-3 border-b flex gap-2 bg-slate-50 sticky top-0 z-10">
                <input type="text" id="search-formulas" placeholder="جستجو..." class="input-field text-xs h-10">
                <button id="btn-open-new-formula" class="bg-teal-600 text-white w-10 h-10 rounded-xl font-bold shadow text-xl hover:bg-teal-700 shrink-0 transition-colors" title="فرمول جدید">+</button>
            </div>
            <div id="formula-master-list" class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1"></div>
        </div>
        
        <div class="w-full lg:w-2/3 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative min-h-[500px] lg:h-full" id="detail-panel">
            <div id="formula-detail-empty" class="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                <span class="text-6xl mb-4 opacity-20">🏗️</span>
                <p class="font-bold text-sm">یک محصول انتخاب کنید</p>
            </div>
            <div id="formula-detail-view" class="hidden flex-col h-full w-full absolute inset-0 bg-white">
                <div class="p-3 border-b flex flex-wrap justify-between items-center bg-slate-50 gap-2">
                    <div class="overflow-hidden mr-2 flex-1 min-w-[150px]">
                        <h2 id="active-formula-name" class="text-base font-bold text-slate-800 cursor-pointer hover:text-teal-600 border-b border-dashed border-slate-300 pb-1 truncate w-fit max-w-full">---</h2>
                        <div class="flex items-center gap-2 mt-1">
                            <span id="active-formula-date" class="text-[10px] text-slate-400"></span>
                            <span id="formula-item-count" class="text-[9px] bg-slate-200 text-slate-600 px-1.5 rounded-full">0 قلم</span>
                        </div>
                    </div>
                    <div class="flex gap-2 shrink-0">
                         <button id="btn-duplicate-formula" class="btn btn-white border border-blue-200 text-blue-600 py-1.5 px-3 text-xs shadow-sm hover:bg-blue-50 flex items-center gap-1"><span>📑</span> کپی</button>
                         <button id="btn-print" class="btn btn-white border border-slate-200 text-slate-600 py-1.5 px-3 text-xs shadow-sm hover:bg-slate-50 flex items-center gap-1"><span>🖨</span> چاپ</button>
                         <button id="btn-delete-formula" class="btn btn-white border border-rose-200 text-rose-600 py-1.5 px-3 text-xs shadow-sm hover:bg-rose-50 flex items-center gap-1"><span>🗑</span> حذف</button>
                    </div>
                </div>
                
                <div class="p-3 border-b bg-white shadow-sm z-20">
                    <form id="form-add-comp" class="flex flex-col gap-2">
                         <div class="flex gap-2">
                            <select id="comp-filter" class="input-field w-1/3 text-[10px] bg-slate-50 px-1"></select>
                            <select id="comp-select" class="input-field w-2/3 text-xs font-bold" required></select>
                         </div>
                         <div class="flex gap-2 items-center">
                            <select id="comp-unit-select" class="input-field w-1/3 text-[10px] bg-slate-50 px-1"></select>
                            <input id="comp-qty" class="input-field w-1/3 text-center font-bold" placeholder="تعداد" type="number" step="any" required>
                            <button class="btn btn-primary w-1/3 text-xs shadow-md h-9">افزودن</button>
                         </div>
                    </form>
                </div>
                
                <div id="formula-comps-list" class="flex-1 overflow-y-auto bg-slate-50/30 divide-y divide-slate-100 pb-20 custom-scrollbar"></div>
                
                <div class="p-4 bg-slate-800 text-slate-200 border-t z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    <div class="grid grid-cols-3 gap-3 mb-4">
                        <div><label class="text-[9px] block text-slate-400 mb-1 text-center">دستمزد</label><input id="inp-labor" class="w-full bg-slate-700 p-2 rounded text-center text-sm text-white border border-slate-600 focus:border-teal-500 outline-none"></div>
                        <div><label class="text-[9px] block text-slate-400 mb-1 text-center">سربار</label><input id="inp-overhead" class="w-full bg-slate-700 p-2 rounded text-center text-sm text-white border border-slate-600 focus:border-teal-500 outline-none"></div>
                        <div><label class="text-[9px] block text-slate-400 mb-1 text-center">سود %</label><input id="inp-profit" class="w-full bg-slate-700 p-2 rounded text-center text-sm text-white border border-slate-600 focus:border-teal-500 outline-none" type="number"></div>
                    </div>
                    
                    <div class="flex gap-3 items-end">
                        <button id="btn-save-formula" class="btn bg-slate-700 hover:bg-slate-600 text-white w-full h-10 shadow-lg transition-all flex-1">ثبت تغییرات</button>
                        
                        <div class="text-right min-w-[120px]">
                            <span class="text-[10px] text-slate-400 block">قیمت نهایی:</span>
                            <div><span id="lbl-final-price" class="text-xl md:text-2xl font-black text-teal-400 tracking-tight">0</span> <span class="text-[10px] text-slate-500">تومان</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // اتصال رویداد دکمه باز کردن مدال جدید
    const btnOpen = document.getElementById('btn-open-new-formula');
    if(btnOpen) btnOpen.onclick = () => openModal('new-formula-modal');
}

export function highlightSaveButton() {
    const btn = document.getElementById('btn-save-formula');
    if(btn) {
        btn.classList.remove('bg-slate-700', 'hover:bg-slate-600');
        btn.classList.add('bg-emerald-600', 'hover:bg-emerald-700', 'animate-pulse');
        btn.innerText = 'ثبت تغییرات (ذخیره نشده)';
    }
}

export function resetSaveButton() {
    const btn = document.getElementById('btn-save-formula');
    if(btn) {
        btn.className = 'btn bg-slate-700 hover:bg-slate-600 text-white w-full h-10 shadow-lg transition-all';
        btn.innerText = 'ثبت تغییرات';
        btn.disabled = false;
    }
}