// تنظیمات اتصال به دیتابیس و مدیریت وضعیت (State)
// وظیفه: نگهداری متغیرهای عمومی و کانفیگ‌ها

const APPWRITE_CONFIG = {
    ENDPOINT: 'https://cloud.appwrite.io/v1',
    PROJECT_ID: '691c9337000c1532f26a', 
    DB_ID: '691c956400150133e319',
    COLS: {
        CATS: 'categories',
        MATS: 'materials',
        FORMS: 'formulas',
        UNITS: 'units'
    },
    FUNCTIONS: {
        SCRAPER: '691dc278002eafe2ac0c'
    }
};

// بررسی لود شدن SDK
if (typeof Appwrite === 'undefined') {
    console.error("خطا: Appwrite SDK بارگذاری نشده است.");
}

const { Client, Account, Databases, ID, Query, Functions } = Appwrite;

const client = new Client()
    .setEndpoint(APPWRITE_CONFIG.ENDPOINT)
    .setProject(APPWRITE_CONFIG.PROJECT_ID);

export const account = new Account(client);
export const db = new Databases(client);
export const functions = new Functions(client);
export { ID, Query, APPWRITE_CONFIG };

// وضعیت گلوبال برنامه (Reactive State)
// هر ماژول می‌تواند این را بخواند یا آپدیت کند
export const state = { 
    categories: [], 
    units: [], 
    materials: [], 
    formulas: [], 
    activeFormulaId: null, 
    publicFormulas: [] 
};