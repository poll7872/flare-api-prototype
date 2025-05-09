import { createAlert, createAsset } from "../services/alertService.js";
import { scanSocialMedia } from "../services/scanService.js";

//Este método escanea las redes sociales de un usuario y crea una alerta
export const searchSocialMedia = async (req, res) => {
  try {
    const { nombre, apellido, username } = req.body;

    if (!nombre || !apellido || !username) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    //1. Ejecutar escaneo
    const result = await scanSocialMedia({ nombre, apellido, username });

    //2. Crear asset 
    const assetName = `${nombre} ${apellido} @${username}`;
    const assetId = await createAsset({ name: assetName, searchType: "social_media", type: username });

    //3. Crear alerta
    const alert = await createAlert({ assetId, name: `Alerta para ${assetName}` });

    res.status(200).json({ scanResult: result, alertCreated: alert });
  } catch (error) {
    console.error('Error searching by social media:', error);
    res.status(500).json({ error: 'Error searching by social media' });
  }
}
