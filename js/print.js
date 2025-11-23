import { state } from './core/config.js';
// اصلاح مسیر ایمپورت محاسبات
import { calculateCost } from './features/formulas/formulas_calc.js'; 
import { formatPrice, formatDate, toggleElement } from './core/utils.js';

// توابع کمکی برای مدال داخل همین فایل یا utils
function openModal(id) { toggleElement(id, true); }
function closeModal(id) { toggleElement(id, false); }

export function setupPrint() {
    // اتصال دکمه چاپ (با چک کردن وجود دکمه)
    const btnPrint = document.getElementById('btn-print');
    if(btnPrint) btnPrint.onclick = printInvoice;

    // دکمه بستن
    const btnClose = document.getElementById('btn-close-print');
    if(btnClose) btnClose.onclick = () => closeModal('print-modal');
    
    // آپدیت زنده نام خریدار
    const buyerInput = document.getElementById('print-buyer-input');
    if(buyerInput) {
        buyerInput.oninput = (e) => {
            const el = document.getElementById('print-buyer-name');
            if(el) el.innerText = e.target.value || '---';
        };
    }

    // آپدیت زنده نام فروشنده
    const sellerInput = document.getElementById('print-seller-input');
    if(sellerInput) {
        sellerInput.oninput = (e) => {
            const el = document.getElementById('print-seller-name');
            if(el) el.innerText = e.target.value || 'سیمرغ گستر پویا';
        };
    }
}

export function printInvoice() {
    if(!state.activeFormulaId) return;
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    if(!f) return;

    const calc = calculateCost(f);
    let comps = [];
    try { comps = JSON.parse(f.components || '[]'); } catch(e){}
    
    // پر کردن اطلاعات هدر
    const titleEl = document.getElementById('print-title');
    if(titleEl) titleEl.innerText = f.name;

    const idEl = document.getElementById('print-id');
    if(idEl) idEl.innerText = f.$id.substring(0,8).toUpperCase();

    const dateEl = document.getElementById('print-date');
    if(dateEl) dateEl.innerText = formatDate(new Date());
    
    // نام فروشنده و خریدار
    const sellerInp = document.getElementById('print-seller-input');
    const buyerInp = document.getElementById('print-buyer-input');
    
    const sellerNameEl = document.getElementById('print-seller-name');
    const buyerNameEl = document.getElementById('print-buyer-name');

    if(sellerNameEl) sellerNameEl.innerText = (sellerInp && sellerInp.value) ? sellerInp.value : 'سیمرغ گستر پویا';
    if(buyerNameEl) buyerNameEl.innerText = (buyerInp && buyerInp.value) ? buyerInp.value : 'مشتری گرامی';
    
    // تولید سطرها
    const rowsEl = document.getElementById('print-rows');
    if(rowsEl) {
        rowsEl.innerHTML = comps.map((c, idx) => {
            let name='-', unit='-';
            
            if(c.type==='mat') { 
                const m = state.materials.find(x=>x.$id===c.id); 
                if(m) {
                    name = m.display_name || m.name; 
                    unit = c.unit || m.consumption_unit || 'عدد'; 
                }
            }
            else { 
                const s = state.formulas.find(x=>x.$id===c.id); 
                name = s ? s.name : 'محصول فرعی'; 
                unit = 'عدد'; 
            }
            
            return `
            <tr>
                <td class="py-2 text-right w-10 text-slate-400">${idx+1}</td>
                <td class="py-2 text-right font-bold">${name}</td>
                <td class="text-center font-mono">${c.qty}</td>
                <td class="text-center text-xs text-slate-500">${unit}</td>
            </tr>`;
        }).join('');
    }
    
    // فوتر مالی
    const rawTotalEl = document.getElementById('print-raw-total');
    const profitEl = document.getElementById('print-profit');
    const finalEl = document.getElementById('print-final');

    // توجه: در HTML شما ممکن است ID برای سود و قیمت خام وجود نداشته باشد، اما برای قیمت نهایی هست
    if(finalEl) finalEl.innerText = formatPrice(calc.final.toFixed(0));
    
    openModal('print-modal');
}