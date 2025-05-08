import { createAlert, createAsset } from "../services/alertService.js";
import { scanSocialMedia } from "../services/scanService.js";

export const searchSocialMedia = async (req, res) => {
  try {
    const { nombre, apellido, username } = req.body;

    if (!nombre || !apellido || !username) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    //Ejecutar escaneo
    const result = await scanSocialMedia({ nombre, apellido, username });

    //Crear asset 
    const assetName = `${nombre} ${apellido} @${username}`;
    const assetId = await createAsset({ name: assetName, searchType: "social_media" });

    //Crear alerta
    const alert = await createAlert({ assetId, name: `Alerta para ${assetName}` });

    res.status(200).json({ scanResult: result, alertCreated: alert });
  } catch (error) {
    console.error('Error searching by social media:', error);
    res.status(500).json({ error: 'Error searching by social media' });
  }
}
