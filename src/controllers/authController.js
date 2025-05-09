import { generateToken } from "../services/authService.js";

// Está función genera un token de acceso para la API de Flare
export const handleGenerateToken = async (req, res) => {
  try {
    const token = await generateToken();
    respone.status(200).json(token)
  } catch (error) {
    console.error("Error generating token:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
}
