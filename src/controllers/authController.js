import { generateToken } from "../services/authService.js";

// This function handles the generation of a token for the Flare API
export const handleGenerateToken = async (req, res) => {
  try {
    const token = await generateToken();
    respone.status(200).json(token)
  } catch (error) {
    console.error("Error generating token:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
}
