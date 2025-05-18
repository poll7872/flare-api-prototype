import axios from 'axios';

let cachedToken = null;
let tokenExpiresAt = null;

export const generateToken = async () => {
  const now = Date.now();

  if (cachedToken && tokenExpiresAt && now < tokenExpiresAt) {
    return { access_token: cachedToken };
  }

  const { AUTHORIZATION, TENANT_ID, FLARE_API_BASE_URL } = process.env;

  const response = await axios.post(
    `${FLARE_API_BASE_URL}/tokens/generate`,
    { tenantId: TENANT_ID },
    {
      headers: {
        Authorization: AUTHORIZATION,
        'Content-Type': 'application/json',
      }
    }
  );

  const { access_token } = response.data;

  // Guardar token y su tiempo de expiración (1 hora = 3600000ms)
  cachedToken = access_token;
  tokenExpiresAt = now + 60 * 60 * 1000; // 1 hora

  return { access_token };
};
