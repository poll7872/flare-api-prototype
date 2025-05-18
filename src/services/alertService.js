import axios from 'axios';
import { generateToken } from '../utils/generateToken.js';
import { Alert } from '../models/Alert.js';

const { FLARE_API_BASE_URL, TENANT_ID, ORGANIZATION_ID } = process.env;

export const createAlertService = async ({
    assetId,
    name,
    searchTypes,
    risks,
    frequency,
    type = 'email' // valor por defecto si no se pasa
}) => {
    try {
        const { access_token } = await generateToken();

        const nowISOString = new Date().toISOString(); 

        const payload = {
            name: `${name}-alert`,
            type,
            feed_target_type: 'assets/groups',
            feed_target_id: assetId,
            frequency,
            search_types: searchTypes,
            risks,
            params: {},
            created_at: nowISOString,
            start_at: nowISOString,
            tenant_id: parseInt(TENANT_ID),
            organization_id: parseInt(ORGANIZATION_ID),
        };

        const response = await axios.post(
            `${FLARE_API_BASE_URL}/firework/v2/assets/${assetId}/alerts`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log('[✅] Alerta creada en Flare:', response.data.id);

        // Guardar la alerta en MongoDB
        const savedAlert = await Alert.create({
            flareId: response.data.id,
            assetId: response.data.feed_target_id,
            name: response.data.name,
            type: response.data.type,
            searchTypes: response.data.search_types,
            risks: response.data.risks,
            frequency: response.data.frequency,
            tenantId: response.data.tenant_id,
            organizationId: response.data.organization_id,
            createdAt: response.data.created_at,
            startAt: response.data.start_at,
        });
          
        console.log('[✅] Alerta guardada en MongoDB:', savedAlert);
          return savedAlert;
        
    } catch (error) {
        console.error('[❌] Error al crear alerta en Flare:', error?.response?.data || error.message);
        throw error;
    }
};
