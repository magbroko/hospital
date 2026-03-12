/**
 * Minimal Bootstrap-like Modal and Toast shim for Tailwind-only build.
 * Provides just enough API surface for existing code that expects
 * window.bootstrap.Modal / window.bootstrap.Toast without loading Bootstrap.
 */

(function () {
  if (typeof window === 'undefined') return;

  const modalInstances = new WeakMap();
  const toastInstances = new WeakMap();

  class ShimModal {
    constructor(element) {
      this._el = element;
    }

    show() {
      if (!(this._el instanceof HTMLElement)) return;
      this._el.classList.add('show');
      this._el.style.display = 'block';
      this._el.removeAttribute('aria-hidden');
      document.body.classList.add('modal-open');
    }

    hide() {
      if (!(this._el instanceof HTMLElement)) return;
      this._el.classList.remove('show');
      this._el.style.display = 'none';
      this._el.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
    }

    static getOrCreateInstance(element) {
      if (!element) return null;
      let instance = modalInstances.get(element);
      if (!instance) {
        instance = new ShimModal(element);
        modalInstances.set(element, instance);
      }
      return instance;
    }

    static getInstance(element) {
      return element ? modalInstances.get(element) || null : null;
    }
  }

  class ShimToast {
    constructor(element, options) {
      this._el = element;
      this._delay = (options && options.delay) || 3000;
    }

    show() {
      if (!(this._el instanceof HTMLElement)) return;
      this._el.classList.add('show');
      const delay = this._delay;
      setTimeout(() => {
        this._el.classList.remove('show');
        const evt = new CustomEvent('hidden.bs.toast', { bubbles: true });
        this._el.dispatchEvent(evt);
      }, delay);
    }

    static getOrCreateInstance(element, options) {
      if (!element) return null;
      let instance = toastInstances.get(element);
      if (!instance) {
        instance = new ShimToast(element, options);
        toastInstances.set(element, instance);
      }
      return instance;
    }

    static getInstance(element) {
      return element ? toastInstances.get(element) || null : null;
    }
  }

  if (!window.bootstrap) {
    window.bootstrap = {};
  }

  if (!window.bootstrap.Modal) {
    window.bootstrap.Modal = ShimModal;
  }

  if (!window.bootstrap.Toast) {
    window.bootstrap.Toast = ShimToast;
  }
})();

