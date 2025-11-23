// موتور محاسباتی فرمول‌ها
// وظیفه: محاسبات ریاضی خالص بدون هیچ وابستگی به DOM یا HTML.

import { state } from '../../core/config.js';

export function calculateCost(f) {
    if(!f) return { matCost:0, sub:0, profit:0, final:0 };
    
    let matCost = 0;
    let comps = parseComponents(f.components);

    comps.forEach(c => {
        if (c.type === 'mat') {
            const m = state.materials.find(x => x.$id === c.id);
            if (m) {
                let price = m.price * (m.has_tax ? 1.10 : 1);
                // اینجا می‌توان منطق پیچیده تبدیل واحد را اضافه کرد
                // برای سادگی فعلا فرض می‌کنیم واحدها یکی هستند یا قبلا محاسبه شده‌اند
                matCost += price * c.qty;
            }
        } else if (c.type === 'form') {
            const sub = state.formulas.find(x => x.$id === c.id);
            if (sub && sub.$id !== f.$id) {
                 matCost += calculateCost(sub).final * c.qty;
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

function parseComponents(data) {
    try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
}