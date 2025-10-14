
// Novo helper para requisições PHP API externa
export const PHP_API_URL = 'https://api-finances.pedroluca.dev.br';

export async function phpApiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${PHP_API_URL}/${endpoint}`;
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || `Erro HTTP ${response.status}`);
  }
  return data;
}
