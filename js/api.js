import { db, functions, ID, Query, APPWRITE_CONFIG, state } from './config.js';

/**
 * دریافت تمام داده‌های اولیه از دیتابیس
 */
export async function fetchAllData() {
    // console.log("📡 API: Fetching data...");
    try {
        const [cRes, uRes, mRes, fRes] = await Promise.all([
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.CATS, [Query.limit(100)]),
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.UNITS, [Query.limit(100)]), 
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.MATS, [Query.limit(5000)]),
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, [Query.limit(500)])
        ]);
        
        state.categories = cRes.documents;
        state.units = uRes.documents;
        state.materials = mRes.documents;
        // مرتب‌سازی فرمول‌ها بر اساس تاریخ بروزرسانی
        state.formulas = fRes.documents.sort((a, b) => new Date(b.$updatedAt) - new Date(a.$updatedAt));
        
        // دریافت فرمول‌های عمومی (فروشگاه) - جداگانه چون اهمیت کمتری دارد
        fetchStoreData();
        
        return true;
    } catch (error) {
        console.error("🔥 API Fetch Error:", error);
        throw new Error("خطا در دریافت اطلاعات از سرور. لطفا اتصال اینترنت را بررسی کنید.");
    }
}

async function fetchStoreData() {
    try {
        const sRes = await db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, [
            Query.equal('is_public', true), 
            Query.limit(50)
        ]);
        state.publicFormulas = sRes.documents;
    } catch(e) { 
        console.warn("Store fetch warning:", e); 
    }
}

/**
 * آبجکت مرکزی متدهای API
 */
export const api = {
    create: (col, data) => db.createDocument(APPWRITE_CONFIG.DB_ID, col, ID.unique(), data),
    update: (col, id, data) => db.updateDocument(APPWRITE_CONFIG.DB_ID, col, id, data),
    delete: (col, id) => db.deleteDocument(APPWRITE_CONFIG.DB_ID, col, id),
    get: (col, id) => db.getDocument(APPWRITE_CONFIG.DB_ID, col, id),
    
    // اجرای تابع اسکرپر در سمت سرور
    runScraper: async (payload = {}) => {
        console.log("🚀 Running Scraper:", payload);
        try {
            const execution = await functions.createExecution(
                APPWRITE_CONFIG.FUNCTIONS.SCRAPER, 
                JSON.stringify(payload)
            );
            
            if (execution.status === 'completed') {
                try {
                    return JSON.parse(execution.responseBody);
                } catch (e) {
                    console.error("JSON Parse Error from Function:", execution.responseBody);
                    return { success: false, error: "فرمت پاسخ سرور نامعتبر است" };
                }
            } else {
                return { success: false, error: "وضعیت خطا: " + execution.status };
            }
        } catch (error) {
            console.error("Function Network Error:", error);
            throw new Error("خطای ارتباط با سرور اسکرپر");
        }
    }
};