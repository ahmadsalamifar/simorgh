export function getHeaderHTML() {
    return `
    <header class="app-header shrink-0 z-20 shadow-sm relative bg-white px-4 py-3 flex justify-between items-center">
        <div><h1 class="text-lg md:text-2xl font-black text-slate-800">سامانه <span class="text-teal-600">سیمرغ</span></h1></div>
        <div class="flex items-center gap-2">
            <div class="status-badge hidden sm:flex"><span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> آنلاین</div>
            <button id="btn-open-store" class="btn btn-secondary text-[10px] px-2 md:text-xs md:px-3 border border-slate-200 hover:bg-slate-100" type="button">🏦 بانک فرمول</button>
        </div>
    </header>
    `;
}

export function getTabsHTML() {
    return `
    <nav class="nav-tabs shrink-0 z-10 bg-white border-b border-slate-200">
        <button class="tab-btn active" id="btn-tab-formulas" type="button" data-target="formulas">📋 محصولات</button>
        <button class="tab-btn" id="btn-tab-materials" type="button" data-target="materials">📦 انبار و خرید</button>
        <button class="tab-btn" id="btn-tab-reports" type="button" data-target="reports">📊 گزارشات</button>
        <button class="tab-btn" id="btn-tab-categories" type="button" data-target="categories">📂 تنظیمات</button>
    </nav>
    `;
}