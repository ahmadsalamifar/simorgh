// لایه ارتباط با سرور
// وظیفه: فقط ارسال و دریافت داده خام (بدون منطق UI)

import { db, functions, ID, APPWRITE_CONFIG } from './config.js';

export const api = {
    // عملیات CRUD پایه
    create: (col, data) => db.createDocument(APPWRITE_CONFIG.DB_ID, col, ID.unique(), data),
    
    update: (col, id, data) => db.updateDocument(APPWRITE_CONFIG.DB_ID, col, id, data),
    
    delete: (col, id) => db.deleteDocument(APPWRITE_CONFIG.DB_ID, col, id),
    
    get: (col, id) => db.getDocument(APPWRITE_CONFIG.DB_ID, col, id),
    
    list: (col, queries = []) => db.listDocuments(APPWRITE_CONFIG.DB_ID, col, queries),

    // اجرای تابع اسکرپر در سمت سرور
    runScraper: async (payload = {}) => {
        try {
            const execution = await functions.createExecution(
                APPWRITE_CONFIG.FUNCTIONS.SCRAPER, 
                JSON.stringify(payload)
            );
            
            if (execution.status === 'completed') {
                return JSON.parse(execution.responseBody);
            } else {
                return { success: false, error: "وضعیت خطا: " + execution.status };
            }
        } catch (error) {
            console.error("Function Network Error:", error);
            throw new Error("خطای ارتباط با سرور اسکرپر");
        }
    }
};