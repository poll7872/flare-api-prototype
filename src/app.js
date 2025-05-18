import express from "express";
import dotenv from "dotenv";
import scanRoutes from "./routes/identifierRoutes.js";
import connectDB from "./config/db.js";
import { limiter } from "./middlewares/rateLimiter.js";
import { connectToRabbitMQ } from "./config/rabbitmq.js";
import { startScanConsumer } from "./jobs/scanConsumer.js";
dotenv.config();

//Conexión a mongo
connectDB();

const app = express();
app.use(express.json());

//Rutas
app.use('/api/scan', limiter, scanRoutes);

//Conectar a RabbitMQ y arrancar el consumidor
await connectToRabbitMQ();
startScanConsumer();

//Servidor
const PORT = process.env.PORT
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
