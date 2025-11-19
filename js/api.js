import { db, ID, Query, APPWRITE_CONFIG, state } from './config.js';

// دریافت تمام داده‌ها و ذخیره در state
export async function fetchAllData() {
    console.log("Fetching Data...");
    try {
        const [cRes, mRes, fRes] = await Promise.all([
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.CATS, [Query.limit(100)]),
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.MATS, [Query.limit(5000)]),
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, [Query.limit(500)])
        ]);
        
        state.categories = cRes.documents;
        state.materials = mRes.documents;
        // مرتب‌سازی فرمول‌ها بر اساس تاریخ
        state.formulas = fRes.documents.sort((a, b) => new Date(b.$updatedAt) - new Date(a.$updatedAt));
        
        // دریافت فروشگاه (اختیاری)
        try {
            const sRes = await db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, [
                Query.equal('is_public', true), 
                Query.limit(50)
            ]);
            state.publicFormulas = sRes.documents;
        } catch(e) { console.warn("Store fetch skipped"); }

        console.log("Data Fetched:", state);
        return true;
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}

// رفرش کردن فقط یک فرمول خاص (برای سرعت بیشتر)
export async function fetchSingleFormula(id) {
    try {
        const doc = await db.getDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, id);
        // آپدیت استیت
        const idx = state.formulas.findIndex(f => f.$id === id);
        if (idx !== -1) state.formulas[idx] = doc;
        return doc;
    } catch (e) { console.error(e); return null; }
}

export const api = {
    create: (col, data) => db.createDocument(APPWRITE_CONFIG.DB_ID, col, ID.unique(), data),
    update: (col, id, data) => db.updateDocument(APPWRITE_CONFIG.DB_ID, col, id, data),
    delete: (col, id) => db.deleteDocument(APPWRITE_CONFIG.DB_ID, col, id)
};