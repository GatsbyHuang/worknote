// js/pageState.js

const PageState = {
  locks: {},

  /**
   * 檢查該頁面是否應該初始化
   * @param {string} pageName 頁面名稱
   * @returns {boolean} true=應該初始化，false=已鎖住
   */
  shouldInit(pageName) {
    if (this.locks[pageName]) {
      console.log(`[🚫] Page "${pageName}" 已初始化，跳過`);
      return false;
    }
    this.locks[pageName] = true;
    console.log(`[✅] Page "${pageName}" 初始化鎖定`);
    return true;
  },

  /**
   * 解鎖指定頁面
   * @param {string} pageName 頁面名稱
   */
  unlock(pageName) {
    if (this.locks[pageName]) {
      delete this.locks[pageName];
      console.log(`[🔓] Page "${pageName}" 解鎖`);
    }
  },

  /**
   * 解鎖所有頁面
   */
  resetAll() {
    this.locks = {};
    console.log('[🔄] 所有頁面鎖已重置');
  },

  /**
   * 解鎖除指定頁面以外的所有頁面
   * @param {string} currentPage 當前頁面名稱
   */
  unlockOther(currentPage) {
    Object.keys(this.locks).forEach(page => {
      if (page !== currentPage) {
        this.unlock(page);
      }
    });
  },

  /**
   * 檢查某個頁面是否已鎖定
   * @param {string} pageName 頁面名稱
   * @returns {boolean}
   */
  isLocked(pageName) {
    return !!this.locks[pageName];
  }
};

export default PageState;
