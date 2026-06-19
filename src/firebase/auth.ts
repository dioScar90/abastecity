import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from './config';
import type { AuthUser } from '../types';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };
}

/** Observa mudanças no estado de autenticação. */
export function observeAuth(callback: (user: AuthUser | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => callback(toAuthUser(user)));
}

/**
 * Login com Google. Tenta popup; se o navegador bloquear, faz fallback para
 * redirect (melhor compatibilidade em PWAs instalados e mobile).
 */
export async function loginWithGoogle(): Promise<void> {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    const code = (error as { code?: string }).code ?? '';
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  await signOut(auth);
}
