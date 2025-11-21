import { state } from './config.js';

/**
 * دریافت ضریب تبدیل واحد برای یک متریال خاص
 * @param {object} material - آبجکت کالا
 * @param {string} unitName - نام واحد مورد نظر (مثلاً گرم)
 * @returns {number} ضریب تبدیل
 */
export function getUnitFactor(material, unitName) {
    if (!material || !unitName) return 1;
    
    try {
        let rels = material.unit_relations;
        // اگر رشته است پارس کن، اگر آبجکت است خودشو استفاده کن
        if (typeof rels === 'string') rels = JSON.parse(rels);
        if (!rels) rels = {};

        // اگر واحد مصرف همان واحد پایه باشد
        if (unitName === rels.base) return 1;
        
        // جستجو در لیست تبدیل‌ها
        const found = (rels.others || []).find(u => u.name === unitName);
        if (found && found.qtyUnit !== 0) {
            // فرمول: مقدار پایه / مقدار واحد فرعی
            return found.qtyBase / found.qtyUnit;
        }
        return 1;
    } catch (e) { 
        console.warn(`Error calculating unit factor for ${material.name}:`, e);
        return 1; 
    }
}

/**
 * محاسبه قیمت تمام شده یک فرمول به صورت بازگشتی
 * @param {object} f - آبجکت فرمول
 * @returns {object} { matCost, sub, profit, final }
 */
export function calculateCost(f) {
    if(!f) return { matCost:0, sub:0, profit:0, final:0 };
    
    let matCost = 0;
    let comps = [];
    
    try {
        comps = typeof f.components === 'string' ? JSON.parse(f.components) : f.components;
    } catch(e) { comps = []; }
    
    if (!Array.isArray(comps)) comps = [];

    comps.forEach(c => {
        if (c.type === 'mat') {
            const m = state.materials.find(x => x.$id === c.id);
            if (m) {
                let currentPrice = m.price || 0;
                // اعمال مالیات
                if (m.has_tax) currentPrice *= 1.10;

                // یافتن ضریب واحد خرید
                let rels = {};
                try { rels = typeof m.unit_relations === 'string' ? JSON.parse(m.unit_relations) : m.unit_relations; } catch(e){}
                
                const priceUnit = m.purchase_unit || rels?.price_unit || m.unit || 'عدد';
                
                const priceFactor = getUnitFactor(m, priceUnit);
                const selectedFactor = getUnitFactor(m, c.unit);
                
                if (priceFactor !== 0) {
                    // قیمت واحد پایه = قیمت خرید / ضریب خرید
                    const baseUnitPrice = currentPrice / priceFactor;
                    // قیمت مصرفی = قیمت پایه * ضریب واحد مصرف * تعداد
                    matCost += baseUnitPrice * selectedFactor * c.qty;
                }
            }
        } else if (c.type === 'form') {
            // محاسبه بازگشتی برای زیر-فرمول‌ها
            const subFormula = state.formulas.find(x => x.$id === c.id);
            if (subFormula) {
                // جلوگیری از لوپ بی نهایت (ساده)
                if (subFormula.$id !== f.$id) {
                     matCost += calculateCost(subFormula).final * c.qty;
                }
            }
        }
    });

    const labor = f.labor || 0;
    const overhead = f.overhead || 0;
    const subTotal = matCost + labor + overhead;
    const profit = (f.profit || 0) / 100 * subTotal;
    
    return {
        matCost, 
        sub: subTotal, 
        profit, 
        final: subTotal + profit
    };
}
