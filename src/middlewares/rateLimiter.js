import rateLimit from "express-rate-limit";

export const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  limit: 100, // 100 peticiones por IP
  message: {
    status: 429,
    message: "Too many requests, please try again later.",
  },
  legacyHeaders: false, // Disable the X-RateLimit headers
  standardHeaders: true,
});
