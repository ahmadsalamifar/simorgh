// تنظیمات اتصال به Appwrite و مدیریت وضعیت (State)
// این فایل نباید هیچ وابستگی به UI داشته باشد.

const APPWRITE_CONFIG = {
    ENDPOINT: 'https://cloud.appwrite.io/v1',
    PROJECT_ID: '691c9337000c1532f26a', // شناسه پروژه خود را چک کنید
    DB_ID: '691c956400150133e319',      // شناسه دیتابیس
    COLS: {
        CATS: 'categories',
        MATS: 'materials',
        FORMS: 'formulas',
        UNITS: 'units'
    },
    FUNCTIONS: {
        SCRAPER: '691dc278002eafe2ac0c' // شناسه فانکشن
    }
};

// بررسی بارگذاری SDK
if (typeof Appwrite === 'undefined') {
    console.error("Appwrite SDK Error: Script not loaded from CDN");
}

const { Client, Account, Databases, ID, Query, Functions } = Appwrite;

const client = new Client()
    .setEndpoint(APPWRITE_CONFIG.ENDPOINT)
    .setProject(APPWRITE_CONFIG.PROJECT_ID);

const account = new Account(client);
const db = new Databases(client);
const functions = new Functions(client);

// وضعیت گلوبال برنامه (Reactive State)
const state = { 
    categories: [], 
    units: [], 
    materials: [], 
    formulas: [], 
    activeFormulaId: null, 
    publicFormulas: [] 
};

export { client, account, db, functions, ID, Query, state, APPWRITE_CONFIG };