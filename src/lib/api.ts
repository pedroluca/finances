
export const PHP_API_URL = 'https://api-finances.pedroluca.dev.br';

export async function phpApiRequest(endpoint: string, options: RequestInit = {}) {
  const authStorage = localStorage.getItem('auth-storage');
  let userId: number | null = null;
  let token: string | null = null;

  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      token = parsed.state?.token;
      userId = parsed.state?.user?.id;
    } catch (e) {
      console.error('Erro ao parsear auth storage:', e);
    }
  }

  // Adicionar user_id à URL se for GET e não tiver user_id
  let url = `${PHP_API_URL}/${endpoint}`;
  if (userId && options.method === 'GET' && !url.includes('user_id=')) {
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}user_id=${userId}`;
  }

  // Para POST/PUT, adicionar user_id no body se não existir
  let body = options.body;
  if (userId && (options.method === 'POST' || options.method === 'PUT') && body) {
    try {
      const bodyObj = JSON.parse(body as string);
      if (!bodyObj.user_id) {
        bodyObj.user_id = userId;
        body = JSON.stringify(bodyObj);
      }
    } catch (e) {
      // Se não conseguir parsear, não modifica
    }
  }

  // Adicionar token no header se existir
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || `Erro HTTP ${response.status}`);
  }
  return data;
}
