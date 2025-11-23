// مدیریت ساختار کلی صفحه (Layout) - نسخه ماژولار
import { getHeaderHTML, getTabsHTML } from './layout/header.js';
import { getMaterialsTabHTML } from './layout/materials.js';
import { getFormulasTabHTML } from './layout/formulas.js';
import { getOtherTabsHTML } from './layout/others.js';
import { getModalsHTML, getLoadingHTML } from './layout/modals.js';
import { openModal } from './utils.js';

export function injectAppLayout() {
    const appHTML = `
        ${getLoadingHTML()}

        <div id="app-content" class="hidden h-screen flex flex-col overflow-hidden bg-slate-50">
            ${getHeaderHTML()}
            ${getTabsHTML()}

            <main class="flex-1 overflow-hidden p-2 md:p-4 relative">
                ${getFormulasTabHTML()}
                ${getMaterialsTabHTML()}
                ${getOtherTabsHTML()}
            </main>
        </div>

        ${getModalsHTML()}
    `;

    document.body.innerHTML = appHTML;

    // اتصال رویدادهای اولیه که مربوط به خود لی‌اوت هستند (مثل دکمه‌های مدال)
    setupLayoutEvents();
}

function setupLayoutEvents() {
    const btnOpenNewFormula = document.getElementById('btn-open-new-formula');
    if (btnOpenNewFormula) {
        btnOpenNewFormula.onclick = () => openModal('new-formula-modal');
    }
}