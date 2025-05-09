import axios from 'axios';

//Está función genera un token de acceso para la API de Flare
export const generateToken = async () => {
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
  )

  return response.data;
}
