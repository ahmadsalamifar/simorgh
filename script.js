// ==========================================
// CONFIGURATION
// ==========================================
const APPWRITE_CONFIG = {
    ENDPOINT: 'https://cloud.appwrite.io/v1',
    PROJECT_ID: '691c9337000c1532f26a', 
    DB_ID: '691c956400150133e319',
    COLS: { CATS: 'categories', MATS: 'materials', FORMS: 'formulas' }
};

let client, account, db;
let state = { categories: [], materials: [], formulas: [], activeFormulaId: null, publicFormulas: [] };

// ==========================================
// INITIALIZATION (Wait for DOM)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // بررسی وجود کتابخانه
    if (typeof Appwrite === 'undefined') {
        alert("کتابخانه Appwrite لود نشد! اینترنت خود را بررسی کنید.");
        return;
    }

    // راه اندازی Appwrite
    const { Client, Account, Databases } = Appwrite;
    client = new Client().setEndpoint(APPWRITE_CONFIG.ENDPOINT).setProject(APPWRITE_CONFIG.PROJECT_ID);
    account = new Account(client);
    db = new Databases(client);

    // اتصال رویدادها به دکمه‌ها (Event Listeners)
    setupEventListeners();

    // شروع دریافت داده
    initData();
});

async function initData() {
    try {
        try { await account.get(); } catch { await account.createAnonymousSession(); }
        await loadAllData();
        
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        
        switchTab('formulas');
    } catch (err) {
        document.getElementById('loading-text').innerText = "خطا در اتصال: " + err.message;
        document.getElementById('loading-text').style.color = "#f87171";
    }
}

function setupEventListeners() {
    // Tabs
    document.getElementById('btn-formulas').onclick = () => switchTab('formulas');
    document.getElementById('btn-materials').onclick = () => switchTab('materials');
    document.getElementById('btn-categories').onclick = () => switchTab('categories');
    document.getElementById('btn-open-store').onclick = () => switchTab('store');

    // Modals
    document.getElementById('btn-new-formula').onclick = () => openModal('new-formula-modal');
    document.getElementById('btn-create-formula').onclick = handleCreateFormula;
    document.getElementById('btn-cancel-formula').onclick = () => closeModal('new-formula-modal');

    document.getElementById('btn-print').onclick = printFormula;
    document.getElementById('btn-close-print').onclick = () => closeModal('print-modal');

    // Inputs
    document.getElementById('search-formulas').oninput = (e) => renderFormulaList(e.target.value);
    document.getElementById('search-materials').oninput = (e) => renderMaterials(e.target.value);
    document.getElementById('sort-materials').onchange = () => renderMaterials();
    
    // Forms
    document.getElementById('material-form').onsubmit = handleSaveMaterial;
    document.getElementById('mat-cancel-btn').onclick = resetMaterialForm;
    document.getElementById('category-form').onsubmit = handleAddCategory;
    document.getElementById('form-add-comp').onsubmit = addComp;
    
    // Formula Inputs
    document.getElementById('inp-labor').onchange = (e) => updateCost('labor', e.target.value);
    document.getElementById('inp-overhead').onchange = (e) => updateCost('overhead', e.target.value);
    document.getElementById('inp-profit').onchange = (e) => updateCost('profit', e.target.value);
    document.getElementById('active-formula-name').onclick = editFormulaName;
    document.getElementById('btn-delete-formula').onclick = deleteFormula;
    
    document.getElementById('comp-filter').onchange = updateComponentSelect;
}

// ==========================================
// CORE LOGIC
// ==========================================
async function loadAllData() {
    const { Query } = Appwrite;
    const [cRes, mRes, fRes] = await Promise.all([
        db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.CATS, [Query.limit(100)]),
        db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.MATS, [Query.limit(5000)]),
        db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, [Query.limit(500)])
    ]);
    
    state.categories = cRes.documents;
    state.materials = mRes.documents;
    state.formulas = fRes.documents.sort((a, b) => new Date(b.$updatedAt) - new Date(a.$updatedAt));
    
    try {
        const sRes = await db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, [Query.equal('is_public', true), Query.limit(50)]);
        state.publicFormulas = sRes.documents;
    } catch(e){}
    
    updateUI();
}

function updateUI() {
    renderCategories(); renderMaterials(); renderFormulaList(); renderStore(); updateDropdowns();
    if (state.activeFormulaId && state.formulas.find(f => f.$id === state.activeFormulaId)) {
        renderFormulaDetail(state.activeFormulaId);
    } else {
        state.activeFormulaId = null;
        document.getElementById('formula-detail-view').classList.add('hidden');
        document.getElementById('formula-detail-view').classList.remove('flex');
        document.getElementById('formula-detail-empty').classList.remove('hidden');
    }
}

// --- Helpers ---
function switchTab(id) {
    ['formulas', 'materials', 'categories', 'store'].forEach(t => {
        document.getElementById('tab-'+t).classList.add('hidden');
        document.getElementById('btn-'+t).classList.remove('active');
    });
    document.getElementById('tab-'+id).classList.remove('hidden');
    document.getElementById('btn-'+id).classList.add('active');
}
function openModal(id) { const el = document.getElementById(id); el.style.display = 'flex'; }
function closeModal(id) { const el = document.getElementById(id); el.style.display = 'none'; }
function formatPrice(n) { return Number(n).toLocaleString('en-US'); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('fa-IR') : ''; }

// --- Formulas ---
async function handleCreateFormula() {
    const name = document.getElementById('new-formula-name').value; if(!name)return;
    const { ID } = Appwrite;
    try {
        const res = await db.createDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, ID.unique(), {
            name, components_json:'[]', labor:0.0, overhead:0.0, profit:0.0, is_public:false
        });
        state.formulas.unshift(res); closeModal('new-formula-modal'); document.getElementById('new-formula-name').value='';
        selectFormula(res.$id);
    } catch(e){ alert(e.message); }
}
function renderFormulaList(filter='') {
    const el = document.getElementById('formula-master-list');
    const list = state.formulas.filter(f => f.name.includes(filter));
    if(list.length===0) { el.innerHTML='<p class="text-center text-xs text-slate-400 py-4">خالی</p>'; return; }
    el.innerHTML = list.map(f => `
        <div onclick="selectFormula('${f.$id}')" class="p-3 border-b border-slate-100 cursor-pointer hover:bg-teal-50 ${f.$id===state.activeFormulaId?'bg-teal-50 border-r-4 border-teal-600':''}">
            <div class="font-bold text-xs text-slate-700">${f.name}</div>
            <div class="text-[10px] text-slate-400 mt-0.5">${formatDate(f.$updatedAt)}</div>
        </div>`).join('');
    
    // Re-attach click events dynamically
    Array.from(el.children).forEach((child, idx) => {
        child.onclick = () => selectFormula(list[idx].$id);
    });
}
function selectFormula(id) {
    state.activeFormulaId = id; renderFormulaList();
    document.getElementById('formula-detail-empty').classList.add('hidden');
    document.getElementById('formula-detail-view').classList.remove('hidden');
    document.getElementById('formula-detail-view').classList.add('flex');
    if(window.innerWidth < 1024) document.getElementById('detail-panel').scrollIntoView({behavior:'smooth'});
    renderFormulaDetail(id);
}
function calculateCost(f) {
    if(!f) return {matCost:0, sub:0, profit:0, final:0};
    let matCost=0; const comps=JSON.parse(f.components_json||'[]');
    comps.forEach(c => {
        if(c.type==='mat'){ const m=state.materials.find(x=>x.$id===c.id); if(m) matCost+=m.price*c.qty; }
        else if(c.type==='form'){ const sub=state.formulas.find(x=>x.$id===c.id); if(sub) matCost+=calculateCost(sub).final*c.qty; }
    });
    const sub = matCost+(f.labor||0)+(f.overhead||0);
    const profit = (f.profit||0)/100 * sub;
    return {matCost, sub, profit, final:sub+profit};
}
function renderFormulaDetail(id) {
    const f = state.formulas.find(x=>x.$id===id); if(!f)return;
    const calc = calculateCost(f); const comps = JSON.parse(f.components_json||'[]');
    document.getElementById('active-formula-name').innerText = f.name;
    document.getElementById('inp-labor').value = formatPrice(f.labor);
    document.getElementById('inp-overhead').value = formatPrice(f.overhead);
    document.getElementById('inp-profit').value = f.profit;
    document.getElementById('lbl-final-price').innerText = formatPrice(calc.final);
    updateComponentSelect();
    
    const listEl = document.getElementById('formula-comps-list');
    listEl.innerHTML = comps.map((c,idx) => {
        let name='?', unit='-', price=0, total=0;
        if(c.type==='mat'){ const m=state.materials.find(x=>x.$id===c.id); name=m?m.name:'حذف شده'; unit=m?m.unit:'-'; price=m?m.price:0; }
        else { const sub=state.formulas.find(x=>x.$id===c.id); name=sub?'🔗 '+sub.name:'حذف شده'; unit='عدد'; price=sub?calculateCost(sub).final:0; }
        total=price*c.qty;
        return `<div class="flex justify-between items-center p-3 text-sm border-b border-slate-50">
            <div><div class="font-bold text-slate-700 text-xs">${name}</div><div class="text-[10px] text-slate-400 mt-0.5">${c.qty} ${unit} × ${formatPrice(price)}</div></div>
            <div class="flex items-center gap-2"><span class="font-mono font-bold text-slate-600 text-xs">${formatPrice(total)}</span><button class="text-rose-400 px-2 btn-remove-comp" data-idx="${idx}">×</button></div>
        </div>`;
    }).join('');
    
    // Attach remove events
    listEl.querySelectorAll('.btn-remove-comp').forEach(btn => {
        btn.onclick = () => removeComp(id, btn.dataset.idx);
    });
}

// --- Actions ---
async function addComp(e){
    e.preventDefault(); if(!state.activeFormulaId)return;
    const val=document.getElementById('comp-select').value; const qty=parseFloat(document.getElementById('comp-qty').value);
    if(!val||!qty)return;
    const [p,id]=val.split(':'); 
    if(p==='FORM' && id===state.activeFormulaId){ alert('خطا: ارجاع به خود!'); return; }
    const f=state.formulas.find(x=>x.$id===state.activeFormulaId); let comps=JSON.parse(f.components_json||'[]');
    const ex=comps.find(c=>c.id===id && c.type===(p==='MAT'?'mat':'form'));
    if(ex) ex.qty+=qty; else comps.push({id, type:p==='MAT'?'mat':'form', qty});
    await db.updateDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, {components_json:JSON.stringify(comps)});
    document.getElementById('comp-qty').value=''; loadAllData();
}
async function removeComp(fid,idx){
    const f=state.formulas.find(x=>x.$id===fid); let comps=JSON.parse(f.components_json||'[]');
    comps.splice(idx,1);
    await db.updateDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, fid, {components_json:JSON.stringify(comps)});
    loadAllData();
}
async function updateCost(k,v){
    await db.updateDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, {[k]:parseFloat(v.replace(/,/g,''))||0});
    loadAllData();
}
async function editFormulaName(){
    const n=prompt('نام جدید:', document.getElementById('active-formula-name').innerText);
    if(n) { await db.updateDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, {name:n}); loadAllData(); }
}
async function deleteFormula(){
    if(confirm('حذف شود؟')){ await db.deleteDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId); state.activeFormulaId=null; loadAllData(); }
}

// --- Materials ---
async function handleSaveMaterial(e) {
    e.preventDefault();
    const { ID } = Appwrite;
    const id = document.getElementById('mat-id').value;
    const data = {
        name: document.getElementById('mat-name').value,
        unit: document.getElementById('mat-unit').value,
        price: parseFloat(document.getElementById('mat-price').value.replace(/,/g,''))||0,
        category_id: document.getElementById('mat-category').value || null
    };
    try {
        if(id) await db.updateDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.MATS, id, data);
        else await db.createDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.MATS, ID.unique(), data);
        resetMaterialForm(); loadAllData();
    } catch(e){ alert(e.message); }
}
function renderMaterials(filter='') {
    const sort = document.getElementById('sort-materials').value;
    let list = state.materials.filter(m => m.name.includes(filter));
    list.sort((a,b) => sort==='date_desc' ? new Date(b.$updatedAt)-new Date(a.$updatedAt) : a.name.localeCompare(b.name));
    const el = document.getElementById('materials-container');
    el.innerHTML = list.map(m => {
        const cat = state.categories.find(c => c.$id === m.category_id)?.name || '-';
        return `
        <div class="bg-white p-3 rounded-xl border border-slate-100 group relative">
            <div class="flex justify-between mb-1"><span class="text-[10px] bg-slate-50 px-1 rounded text-slate-400">${cat}</span>
            <div class="flex gap-1"><button class="text-amber-500 px-1 btn-edit-mat" data-id="${m.$id}">✎</button><button class="text-rose-500 px-1 btn-del-mat" data-id="${m.$id}">×</button></div></div>
            <div class="font-bold text-xs text-slate-800 truncate">${m.name}</div>
            <div class="flex justify-between items-end mt-1"><span class="text-[10px] text-slate-400">${m.unit}</span><span class="font-mono font-bold text-teal-700">${formatPrice(m.price)}</span></div>
        </div>`;
    }).join('');
    
    el.querySelectorAll('.btn-edit-mat').forEach(b => b.onclick = () => editMaterial(b.dataset.id));
    el.querySelectorAll('.btn-del-mat').forEach(b => b.onclick = () => deleteDoc(APPWRITE_CONFIG.COLS.MATS, b.dataset.id));
}
function editMaterial(id){
    const m = state.materials.find(x=>x.$id===id);
    document.getElementById('mat-id').value=m.$id; document.getElementById('mat-name').value=m.name;
    document.getElementById('mat-unit').value=m.unit; document.getElementById('mat-price').value=formatPrice(m.price);
    document.getElementById('mat-category').value=m.category_id||'';
    const btn = document.getElementById('mat-submit-btn'); btn.innerText='ویرایش'; btn.className='btn bg-amber-500 text-white flex-grow text-xs';
    document.getElementById('mat-cancel-btn').classList.remove('hidden');
    if(window.innerWidth<768) document.getElementById('tab-materials').scrollIntoView({behavior:'smooth'});
}
function resetMaterialForm(){
    document.getElementById('material-form').reset(); document.getElementById('mat-id').value='';
    const btn = document.getElementById('mat-submit-btn'); btn.innerText='ذخیره کالا'; btn.className='btn btn-primary flex-grow text-xs';
    document.getElementById('mat-cancel-btn').classList.add('hidden');
}

// --- Categories ---
async function handleAddCategory(e){
    e.preventDefault(); const n=document.getElementById('cat-name').value; if(!n)return; const {ID}=Appwrite;
    await db.createDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.CATS, ID.unique(), {name:n});
    document.getElementById('cat-name').value=''; loadAllData();
}
function renderCategories(){
    const el = document.getElementById('category-list');
    el.innerHTML = state.categories.map(c=>`
        <div class="flex justify-between p-2 bg-slate-50 rounded border mb-1 text-xs"><span>${c.name}</span><button class="text-rose-500 btn-del-cat" data-id="${c.$id}">🗑</button></div>
    `).join('');
    el.querySelectorAll('.btn-del-cat').forEach(b => b.onclick = () => deleteDoc(APPWRITE_CONFIG.COLS.CATS, b.dataset.id));
}

// --- Store ---
function renderStore(){
    const el = document.getElementById('store-container');
    if(!state.publicFormulas.length) { el.innerHTML = '<p class="col-span-full text-center text-slate-400">خالی</p>'; return; }
    el.innerHTML = state.publicFormulas.map(f=>`
        <div class="bg-white p-3 rounded border text-center"><div class="font-bold mb-2">${f.name}</div><button class="btn bg-indigo-50 text-indigo-600 text-xs w-full btn-copy-store" data-id="${f.$id}">افزودن</button></div>
    `).join('');
    el.querySelectorAll('.btn-copy-store').forEach(b => b.onclick = () => copyTemplate(b.dataset.id));
}
async function copyTemplate(id){
    if(!confirm('کپی شود؟'))return; const t=state.publicFormulas.find(x=>x.$id===id); const {ID}=Appwrite;
    await db.createDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, ID.unique(), {
        name:t.name+' (کپی)', components_json:t.components_json, labor:t.labor, overhead:t.overhead, profit:t.profit, is_public:false
    });
    alert('انجام شد'); loadAllData(); switchTab('formulas');
}

// --- Common ---
async function deleteDoc(col,id){ if(confirm('حذف؟')){await db.deleteDocument(APPWRITE_CONFIG.DB_ID, col, id); loadAllData();} }
function updateDropdowns() {
    const c=state.categories.map(x=>`<option value="${x.$id}">${x.name}</option>`).join('');
    document.getElementById('mat-category').innerHTML='<option value="">بدون دسته</option>'+c;
    document.getElementById('comp-filter').innerHTML='<option value="">همه...</option>'+c+'<option value="FORM">فرمول‌ها</option>';
    updateComponentSelect();
}
function updateComponentSelect() {
    const sel = document.getElementById('comp-select'); if(!sel)return;
    const f=document.getElementById('comp-filter').value; let h='<option value="">انتخاب...</option>';
    if(f==='FORM') {
        h+=state.formulas.filter(x=>x.$id!==state.activeFormulaId).map(x=>`<option value="FORM:${x.$id}">🔗 ${x.name}</option>`).join('');
    } else {
        state.categories.forEach(cat=>{
            if(f&&f!==cat.$id)return;
            const m=state.materials.filter(x=>x.category_id===cat.$id);
            if(m.length) h+=`<optgroup label="${cat.name}">`+m.map(x=>`<option value="MAT:${x.$id}">${x.name}</option>`).join('')+`</optgroup>`;
        });
        const o=state.materials.filter(x=>!x.category_id);
        if((!f||f==='null')&&o.length) h+=`<optgroup label="سایر">`+o.map(x=>`<option value="MAT:${x.$id}">${x.name}</option>`).join('')+`</optgroup>`;
    }
    sel.innerHTML=h;
}
function printFormula(){
    if(!state.activeFormulaId)return; const f=state.formulas.find(x=>x.$id===state.activeFormulaId);
    const calc=calculateCost(f); const comps=JSON.parse(f.components_json||'[]');
    document.getElementById('print-title').innerText=f.name; document.getElementById('print-id').innerText=f.$id.substring(0,6);
    document.getElementById('print-date').innerText=formatDate(new Date());
    document.getElementById('print-rows').innerHTML=comps.map(c=>{
        let n='-'; if(c.type==='mat'){const m=state.materials.find(x=>x.$id===c.id);n=m?m.name:'-';}else{const s=state.formulas.find(x=>x.$id===c.id);n=s?s.name:'-';}
        return `<tr><td class="py-2 text-right">${n}</td><td class="text-center">${c.qty}</td><td class="text-center text-xs text-slate-400">-</td></tr>`;
    }).join('');
    const sub=calc.final; const vat=Math.round(sub*0.1);
    document.getElementById('print-profit').innerText=formatPrice(calc.profit);
    document.getElementById('print-subtotal').innerText=formatPrice(sub);
    document.getElementById('print-vat').innerText=formatPrice(vat);
    document.getElementById('print-final').innerText=formatPrice(sub+vat);
    openModal('print-modal');
}