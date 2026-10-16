// VITE_API_URL="/" (build do Docker): mesma origem, o nginx encaminha /api ao backend.
// Sem VITE_API_URL (npm run dev): usa o mesmo host da página na porta 8080.
const BASE_URL = (
  import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8080`
).replace(/\/$/, "");

// Endereços que o backend devolve começando com "/api" (ex.: a foto de perfil) viram URLs completas
export function urlDaApi(caminho) {
  return caminho && caminho.startsWith("/") ? `${BASE_URL}${caminho}` : caminho;
}

// requisições HTTP com o token JWT
async function request(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Erro: ${response.status}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

// Métodos auxiliares do cliente REST
export const api = {
  get: (endpoint) => request(endpoint, { method: "GET" }),
  post: (endpoint, body) => request(endpoint, { method: "POST", body: JSON.stringify(body) }),
  put: (endpoint, body, params = "") => {
    const query = params ? `?${params}` : "";
    return request(`${endpoint}${query}`, { method: "PUT", body: JSON.stringify(body) });
  },
  delete: (endpoint) => request(endpoint, { method: "DELETE" }),
};
