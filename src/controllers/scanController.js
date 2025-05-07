import { scanSocialMedia } from "../services/scanService";

export const searchSocialMedia = async (req, res) => {
  try {
    const { nombre, apellido, username } = req.body;

    if (!nombre || !apellido || !username) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    const result = await scanSocialMedia({ nombre, apellido, username });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error searching by social media' });
  }
}
