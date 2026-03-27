import { phpApiRequest } from './api';

const STORAGE_KEY = 'onesignal_player_id';

// Declara a interface global para o AndroidApp e a função de callback
declare global {
  interface Window {
    onReceivePlayerId: (playerId: string) => void;
    AndroidApp?: {
      getPlayerId?: () => string;
    };
  }
}

/**
 * Verifica se há um token de autenticação válido no localStorage.
 */
function isAuthenticated(): boolean {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (!authStorage) return false;
    const parsed = JSON.parse(authStorage);
    return !!parsed?.state?.token;
  } catch {
    return false;
  }
}

/**
 * Envia o playerId para a API (sem verificação de auth — usar internamente).
 */
async function sendToApi(playerId: string): Promise<void> {
  try {
    await phpApiRequest('update_push_id.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId }),
    });
    console.log('[OneSignal] Player ID sincronizado com a API.');
  } catch (error) {
    console.error('[OneSignal] Falha ao sincronizar Player ID com a API:', error);
  }
}

/**
 * Salva o playerId no localStorage imediatamente (sempre).
 * Só chama a API se o usuário já estiver autenticado —
 * caso contrário, o ID fica "pendente" até syncPendingPlayerId() ser chamado.
 */
async function saveAndMaybeSync(playerId: string): Promise<void> {
  if (!playerId) return;

  localStorage.setItem(STORAGE_KEY, playerId);
  console.log('[OneSignal] Player ID salvo no localStorage:', playerId);

  if (!isAuthenticated()) {
    console.log('[OneSignal] Usuário não autenticado ainda. ID salvo como pendente.');
    return;
  }

  await sendToApi(playerId);
}

/**
 * Chame esta função logo após o login bem-sucedido.
 * Se houver um Player ID pendente no localStorage, ele será enviado para a API.
 */
export async function syncPendingPlayerId(): Promise<void> {
  const pendingId = localStorage.getItem(STORAGE_KEY);
  if (!pendingId) {
    console.log('[OneSignal] Nenhum Player ID pendente para sincronizar.');
    return;
  }
  console.log('[OneSignal] Sincronizando Player ID pendente após login:', pendingId);
  await sendToApi(pendingId);
}

/**
 * Registra a função global `window.onReceivePlayerId` para ser chamada
 * pela WebView Android quando o OneSignal estiver pronto.
 */
export function registerOneSignalReceiver(): void {
  window.onReceivePlayerId = (playerId: string) => {
    console.log('[OneSignal] Player ID recebido via WebView:', playerId);
    saveAndMaybeSync(playerId);
  };

  console.log('[OneSignal] window.onReceivePlayerId registrado.');
}

/**
 * Helper: verifica se a interface `window.AndroidApp` está disponível
 * e tenta buscar o Player ID manualmente como fallback.
 */
export function tryFetchPlayerIdFromAndroid(): void {
  if (typeof window.AndroidApp === 'undefined') {
    console.log('[OneSignal] Interface AndroidApp não encontrada. Provavelmente não é WebView.');
    return;
  }

  if (typeof window.AndroidApp.getPlayerId !== 'function') {
    console.warn('[OneSignal] AndroidApp existe mas getPlayerId não é uma função.');
    return;
  }

  const playerId = window.AndroidApp.getPlayerId();
  if (playerId) {
    console.log('[OneSignal] Player ID obtido manualmente via AndroidApp.getPlayerId:', playerId);
    saveAndMaybeSync(playerId);
  } else {
    console.warn('[OneSignal] AndroidApp.getPlayerId() retornou vazio.');
  }
}

/**
 * Inicializa tudo: registra o receiver global e tenta o fallback via AndroidApp.
 * Chamar isso o mais cedo possível no ciclo de vida da app.
 */
export function initOneSignal(): void {
  registerOneSignalReceiver();

  // Tenta buscar manualmente após um pequeno delay,
  // caso a WebView já tenha o Player ID disponível antes do callback.
  setTimeout(() => {
    const alreadySaved = localStorage.getItem(STORAGE_KEY);
    if (!alreadySaved) {
      tryFetchPlayerIdFromAndroid();
    }
  }, 2000);
}
