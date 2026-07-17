/* ============================================================
 * toast.js — 輕量提示與「可復原」動作
 * 取代原生 confirm()/alert()：動作先執行，再用 Toast 提供「復原」。
 * show() 回傳 { close }，可提前關閉。倒數進度條到底即自動收起。
 * ============================================================ */

const ToastManager = {
  container: null,

  ensure() {
    if (this.container) return;
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      this.container.setAttribute('aria-live', 'polite');
      document.body.appendChild(this.container);
    }
  },

  /* opts: { icon, actionLabel, onAction, duration=5000, tone } */
  show(message, opts = {}) {
    this.ensure();
    const { icon = '', actionLabel, onAction, duration = 5000, tone = '' } = opts;

    const toast = document.createElement('div');
    toast.className = 'toast' + (tone ? ` toast--${tone}` : '');
    toast.setAttribute('role', 'status');

    if (icon) {
      const ic = document.createElement('span');
      ic.className = 'toast-icon';
      // 支援 SVG 字串（以 '<' 開頭）或純文字 / emoji
      if (typeof icon === 'string' && icon.trim().charAt(0) === '<') ic.innerHTML = icon;
      else ic.textContent = icon;
      toast.appendChild(ic);
    }

    const msg = document.createElement('span');
    msg.className = 'toast-msg';
    msg.textContent = message;
    toast.appendChild(msg);

    let closed = false;
    let timer = null;
    const close = () => {
      if (closed) return;
      closed = true;
      if (timer) clearTimeout(timer);
      toast.classList.add('toast--out');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
      // 動畫被關閉（reduced-motion）時的保險
      setTimeout(() => toast.remove(), 400);
    };

    if (actionLabel && onAction) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toast-action';
      btn.textContent = actionLabel;
      btn.addEventListener('click', () => { onAction(); close(); });
      toast.appendChild(btn);
    }

    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'toast-close';
    dismiss.setAttribute('aria-label', '關閉提示');
    dismiss.textContent = '✕';
    dismiss.addEventListener('click', close);
    toast.appendChild(dismiss);

    // 底部倒數進度條（純視覺，寬度由 CSS transition 收縮）
    const bar = document.createElement('div');
    bar.className = 'toast-bar';
    bar.style.transitionDuration = duration + 'ms';
    toast.appendChild(bar);

    this.container.appendChild(toast);
    // 觸發進度條收縮
    requestAnimationFrame(() => { bar.style.transform = 'scaleX(0)'; });

    timer = setTimeout(close, duration);
    return { close };
  },
};

window.MapleToast = ToastManager;
