import axios from 'axios';
import { generateToken } from '../utils/generateToken.js';

const { FLARE_API_BASE_URL } = process.env;

const SEARCH_CONFIG = {
    username: ['social_media', 'forum_profile', 'open_web'],
    email: ['leak', 'open_web', 'social_media', 'stealer_log'],
    domain: ['domains', 'illicit_networks', 'open_web'],
  };

//Crear un identificador en Flare (asset)
export const createIdentifierService = async (type, name) => {
  const { access_token } = await generateToken();
  const search_types = SEARCH_CONFIG[type];
  if (!search_types) throw new Error(`Unsupported identifier type: ${type}`);

  const payload = {
    name,
    type,
    search_types,
    experimental_search_types: [],
    risks: [],
    data: {},
  };

  const response = await axios.post(
    `${FLARE_API_BASE_URL}/firework/v2/assets/`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.asset;
}

//Obtener un identificador por su ID
export const getIdentifierById = async (identifierId) => {
    try {
        const { access_token } = await generateToken();

        const response = await axios.get(`${FLARE_API_BASE_URL}/firework/v2/assets/${identifierId}`, {
            headers: {
                Authorization: `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error getting identifier:', error?.response?.data || error.message);
        throw error;
    }
}

