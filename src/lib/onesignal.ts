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
 * Envia o playerId do OneSignal para a API e salva no localStorage.
 */
async function syncPlayerId(playerId: string): Promise<void> {
  if (!playerId) return;

  localStorage.setItem(STORAGE_KEY, playerId);
  console.log('[OneSignal] Player ID salvo no localStorage:', playerId);

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
 * Registra a função global `window.onReceivePlayerId` para ser chamada
 * pela WebView Android quando o OneSignal estiver pronto.
 */
export function registerOneSignalReceiver(): void {
  window.onReceivePlayerId = (playerId: string) => {
    console.log('[OneSignal] Player ID recebido via WebView:', playerId);
    syncPlayerId(playerId);
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
    syncPlayerId(playerId);
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
