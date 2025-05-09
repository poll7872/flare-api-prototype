import { generateToken } from "./authService.js"

//Este método crea un asset para poder realizar la alerta
export const createAsset = async ({ name, searchType, type }) => {
  const token = await generateToken();

  const response = await axios.post(
    'https://api.flare.io/firework/v2/assets/',
    {
      data: {},
      experimental_search_types: [],
      name,
      risks: [],
      search_types: [searchType],
      type: type,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    }
  );

  return response.data.asset?.id; // asset_id
};

//Este método creá una alerta para un asset
export const createAlert = async ({ assetId, name }) => {
  const token = await generateToken();

  const body = {
    created_at: new Date().toISOString(),
    experimental_search_types: [],
    feed_target_id: assetId,
    feed_target_type: "assets/groups",
    feed_url: "",
    frequency: 1440, // cada 24 horas
    name,
    organization_id: 123, // usar valor real despues
    params: {},
    risks: [],
    search_types: ["social_media"],
    start_at: new Date().toISOString(),
    tenant_alert_channel_id: 123, // usar valor real despues
    tenant_id: 123, // usar valor real despues
    type: "email" //Tipo de comunicación de la alerta
  };

  const response = await axios.post(
    `https://api.flare.io/firework/v2/assets/${assetId}/alerts`,
    body,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    }
  );

  return response.data;
};
