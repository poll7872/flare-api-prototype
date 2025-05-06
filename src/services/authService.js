import axios from 'axios';

//This function generates a token for the Flare API
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
