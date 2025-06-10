import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose"; // Import mongoose
import scanRoutes from "./routes/identifierRoutes.js";
import connectDB from "./config/db.js";
import { limiter } from "./middlewares/rateLimiter.js";
import { connectToRabbitMQ, closeRabbitMQConnection, rabbitEmitter, getChannel } from "./config/rabbitmq.js"; // Import close and emitter
import { startScanConsumer } from "./jobs/scanConsumer.js";

dotenv.config();

const app = express();
app.use(express.json());

// Rutas
app.use('/api/scan', limiter, scanRoutes);

const PORT = process.env.PORT || 3000; // Default port
let server; // To store the HTTP server instance

const main = async () => {
  try {
    // Conexión a mongo
    await connectDB();

    // Conectar a RabbitMQ
    try {
      await connectToRabbitMQ();
      if (getChannel()) {
        console.log("[ℹ️] App: RabbitMQ conectado inicialmente, iniciando consumidor...");
        startScanConsumer();
      } else {
        console.warn("[⚠️] App: RabbitMQ no conectado tras el intento inicial. El consumidor no se iniciará hasta que se conecte.");
      }
    } catch (rmqError) {
      console.error("[❌] App: Error en la conexión inicial a RabbitMQ. El consumidor no se iniciará.", rmqError.message);
    }

    rabbitEmitter.on('connected', () => {
        console.log("[ℹ️] App: Evento 'connected' de RabbitMQ recibido. Asegurando que el consumidor esté iniciado.");
        if (getChannel()) {
             console.log("[ℹ️] App: Consumidor ya debería estar usando el nuevo canal via getChannel().")
        }
    });

    rabbitEmitter.on('failed', (error) => {
        console.error("[❌] App: Evento 'failed' de RabbitMQ recibido. No se pudo conectar después de reintentos.", error.message);
        // Consider if app should exit: gracefulShutdown('SIGTERM', true);
    });

    rabbitEmitter.on('disconnected', () => {
        console.warn("[⚠️] App: Evento 'disconnected' de RabbitMQ recibido.");
    });

    // Servidor
    server = app.listen(PORT, () => {
      console.log(`[✅] Servidor HTTP corriendo en el puerto ${PORT}`);
    });

  } catch (error) {
    console.error("[❌] App: Error fatal durante el inicio:", error);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal, isCriticalError = false) => {
  console.log(`
[ℹ️] App: Recibida señal ${signal}. Iniciando apagado elegante...`);

  if (isCriticalError) {
    console.error("[❌] App: Apagado elegante iniciado debido a un error crítico.");
  }

  process.removeAllListeners('SIGINT');
  process.removeAllListeners('SIGTERM');
  process.removeAllListeners('uncaughtException');
  process.removeAllListeners('unhandledRejection');


  if (server) {
    console.log("[ℹ️] App: Cerrando servidor HTTP...");
    const serverClosePromise = new Promise((resolve, reject) => {
        server.close((err) => {
            if (err) {
                console.error('[❌] App: Error al cerrar el servidor HTTP:', err.message);
                return reject(err);
            }
            console.log('[✅] App: Servidor HTTP cerrado.');
            resolve();
        });
    });

    const shutdownTimeout = setTimeout(() => {
        console.error('[❌] App: Timeout! Forzando apagado después de 10s.');
        process.exit(isCriticalError ? 1 : 0);
    }, 10000);
    shutdownTimeout.unref();

    await serverClosePromise.catch(() => {}); // Wait for server to close, ignore error here as we will exit anyway
  }

  console.log("[ℹ️] App: Cerrando otras conexiones...");
  await closeRabbitMQConnection();

  try {
    await mongoose.connection.close();
    console.log('[✅] App: Conexión a MongoDB cerrada.');
  } catch (dbError) {
    console.error('[❌] App: Error cerrando la conexión a MongoDB:', dbError.message);
  }

  console.log('[✅] App: Apagado elegante completado. Saliendo.');
  process.exit(isCriticalError ? 1 : 0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error, origin) => {
  console.error(`[❌] App: Excepción no capturada: ${error.message}, Origin: ${origin}`);
  console.error(error.stack);
  gracefulShutdown('uncaughtException', true);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[❌] App: Rechazo de promesa no manejado en:', promise, 'razón:', reason);
   gracefulShutdown('unhandledRejection', true);
});

main();
