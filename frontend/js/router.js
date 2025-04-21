// js/router.js

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
      window.history.pushState({}, '', `#${path}`);

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
    let el = document.getElementById('pageLoading');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pageLoading';
      el.className = 'fixed inset-0 z-50 bg-white/60 flex items-center justify-center';
      el.innerHTML = `
        <div class="text-center text-gray-500 text-sm">
          <div class="animate-spin h-6 w-6 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          Loading...
        </div>`;
      document.body.appendChild(el);
    } else {
      el.classList.remove('hidden');
    }
  },

  hideLoading() {
    const el = document.getElementById('pageLoading');
    if (el) el.classList.add('hidden');
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
	window.addEventListener('popstate', load);
  }
};

export default Router;