import { generateToken } from "./authService"

export const createAsset = async ({ name, searchType }) => {
  const token = await generateToken();

  const response = await axios.post(
    'https://api.flare.io/firework/v2/assets/',
    {
      data: {},
      experimental_search_types: [],
      name,
      risks: [],
      search_types: [searchType],
      type,
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
    type: "email"
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
