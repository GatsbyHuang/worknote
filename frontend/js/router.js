// js/router.js
//import PageState from './pages/pagestate.js';

import { showToast } from './pages/utils.js';	


const Router = {
  beforeHooks: [],
  afterHooks: [],

  onBefore(fn) {
    this.beforeHooks.push(fn);
  },

  onAfter(fn) {
    this.afterHooks.push(fn);
  },

  async loadPage(path) {
    const basePath = path.split('?')[0];
    const query = new URLSearchParams(path.split('?')[1] || '');
    const mainContent = document.getElementById('main-content');
    try {
      // 🔄 Loading indicator
      this.showLoading();
	  this.disableMenuItems(true);  // 🚫 點下就馬上鎖按鈕


      // 🔸 Global before hooks
      for (const hook of this.beforeHooks) await hook(path);

      // 📥 Fetch HTML
      const res = await fetch(`pages/${basePath}.html`);
      if (!res.ok) throw new Error(`[router] Failed to load ${basePath}.html`);

      const content = await res.text();
      mainContent.innerHTML = content;
	  // ✅ Reset PageState（解鎖其它頁面）
	  //PageState.unlockOther(basePath);
      window.history.replaceState({}, '', `#${path}`);

      // 📦 Try load module
      let module = null;
      try {
		console.log(basePath)
        module = await import(`./pages/${basePath}.js`);
      } catch (modErr) {
		console.warn(`[router] 無 JS 模組對應：${basePath}`, modErr);
      }

      // 🔸 Module before hook
      await module?.onBefore?.(query);

      // ▶️ Main init
      await module?.init?.(query);

      // 🔸 Module after hook
      await module?.onAfter?.(query);

      // 🔸 Global after hooks
      for (const hook of this.afterHooks) await hook(path);
	 
	  // ✅ Page Load Toast（新增這塊）
	  const basePathKey = basePath.replace('-', '');
	  showToast(`page.${basePathKey}`,'page');
	  
    } catch (err) {
      console.error('[router] Page load failed:', err);
      mainContent.innerHTML = `
        <div class="text-red-600 p-6">
          ❌ Failed to load page <code>${path}</code><br>${err.message}
        </div>`;
      try {
        const module = await import(`./pages/${basePath}.js`);
        module?.onError?.(err);
      } catch (_) {}
    } finally {
      this.hideLoading();
	  this.disableMenuItems(false); // ✅ 載入完成才還原

    }
  },

	showLoading() {
	  const el = document.getElementById('pageLoading');
	  if (el) {
		el.classList.remove('hidden');  // 只控制顯示
	  }
	},

	hideLoading() {
	  const el = document.getElementById('pageLoading');
	  if (el) {
		el.classList.add('hidden');  // 控制隱藏
	  }
	},

  
  disableMenuItems(disabled = true) {
	document.querySelectorAll('.sidebar-item').forEach(btn => {
		btn.classList.toggle('opacity-50', disabled);
		btn.classList.toggle('cursor-not-allowed', disabled);
		btn.style.pointerEvents = disabled ? 'none' : 'auto';
	  });
},

  
  init() {
    const defaultPath = location.hash?.slice(1) || 'dashboard';
    this.loadPage(defaultPath);

    document.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        this.loadPage(btn.dataset.page);
      });
    });

    document.getElementById('newNoteBtn')?.addEventListener('click', () => {
      sessionStorage.removeItem('currentNoteId');
      this.loadPage('note-editor');
    });

    document.getElementById('menuToggle')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('hidden');
    });

	const load = () => {
	  const path = location.hash?.slice(1) || 'dashboard';
	  this.loadPage(path);
	};

	window.addEventListener('hashchange', load);
	//window.addEventListener('popstate', load);
  }
};

export default Router;