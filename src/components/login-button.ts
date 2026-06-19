import { loginWithGoogle } from '../firebase/auth';
import { showToast } from '../utils/toast';

/**
 * <login-button> — Botão de login com Google.
 *
 * Usa Shadow DOM para encapsular totalmente seus estilos (independente do
 * Tailwind global), demonstrando componentização com Web Components.
 */
export class LoginButton extends HTMLElement {
  private shadow: ShadowRoot;
  private button!: HTMLButtonElement;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.render();
    this.button = this.shadow.querySelector('button')!;
    this.button.addEventListener('click', this.handleClick);
  }

  disconnectedCallback(): void {
    this.button?.removeEventListener('click', this.handleClick);
  }

  private handleClick = async (): Promise<void> => {
    this.setLoading(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error(error);
      showToast('Não foi possível entrar. Tente novamente.', 'error');
      this.setLoading(false);
    }
  };

  private setLoading(loading: boolean): void {
    this.button.disabled = loading;
    this.button.classList.toggle('loading', loading);
    const label = this.shadow.querySelector('.label')!;
    label.textContent = loading ? 'Entrando…' : 'Entrar com Google';
  }

  private render(): void {
    this.shadow.innerHTML = `
      <style>
        :host { display: inline-block; }
        button {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 0.75rem 1.5rem;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.05s ease;
        }
        button:hover { background: #f9fafb; box-shadow: 0 4px 10px rgba(0,0,0,0.08); }
        button:active { transform: translateY(1px); }
        button:disabled { opacity: 0.7; cursor: progress; }
        svg { width: 20px; height: 20px; }
        .spinner { display: none; width: 18px; height: 18px; border: 2px solid #cbd5e1; border-top-color: #0d9488; border-radius: 50%; animation: spin 0.7s linear infinite; }
        button.loading .gicon { display: none; }
        button.loading .spinner { display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
      <button type="button" aria-label="Entrar com Google">
        <svg class="gicon" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
          <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
          <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
          <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
        </svg>
        <span class="spinner" aria-hidden="true"></span>
        <span class="label">Entrar com Google</span>
      </button>
    `;
  }
}

customElements.define('login-button', LoginButton);
