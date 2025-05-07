import { generateToken } from "./authService.js";

export const scanSocialMedia = async ({ nombre, apellido, username }) => {
  const token = await generateToken();

  const url = process.env.FLARE_API_BASE_URL

  const query = `${nombre} ${apellido} @${username}`;

  const body = {
    query: {
      text: query,
    },
    size: 20,
    from: "0",
    order: desc,
    filters: {
      severity: ["low"],
      type: ["social_media"],
    }
  }

  const response = await axios.post(
    url,
    body,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    }
  )

  return response.data
}
