import amqp from "amqplib";
import EventEmitter from 'events';

let connection = null;
let channel = null;
let currentConnectionRetries = 0;
let isManuallyClosing = false;
let connectPromise = null;

const MAX_RETRIES = parseInt(process.env.RABBITMQ_MAX_RETRIES || "10", 10);
const RETRY_DELAY_BASE = parseInt(process.env.RABBITMQ_RETRY_DELAY_BASE || "2000", 10);
const RABBITMQ_URL = process.env.RABBITMQ_URL;
const QUEUE_NAME = process.env.QUEUE_NAME;

// New constants for DLX/DLQ
const DLX_NAME = process.env.RABBITMQ_DLX_NAME || 'dlx.default';
const DLQ_NAME = process.env.RABBITMQ_DLQ_NAME || `${QUEUE_NAME}.dlq`; // Default DLQ name based on main queue
const DLQ_ROUTING_KEY = process.env.RABBITMQ_DLQ_ROUTING_KEY || `${QUEUE_NAME}.dlq`; // Routing key for DLX to DLQ

export const rabbitEmitter = new EventEmitter();

const attemptConnectionRecovery = () => {
  if (isManuallyClosing || (connectPromise && currentConnectionRetries > 0 && currentConnectionRetries < MAX_RETRIES)) {
    return;
  }
  if (channel) { try { channel.removeAllListeners(); } catch (e) { /* ignore */ } channel = null; }
  if (connection) { try { connection.removeAllListeners(); } catch (e) { /* ignore */ } connection = null; }

  currentConnectionRetries++;
  if (currentConnectionRetries <= MAX_RETRIES) {
    const delay = Math.min(Math.pow(2, currentConnectionRetries - 1) * RETRY_DELAY_BASE, 30000);
    console.log(`[⚠️] RabbitMQ: Conexión perdida/fallida. Reintentando (intento ${currentConnectionRetries}/${MAX_RETRIES}) en ${delay / 1000}s...`);
    connectPromise = new Promise(resolve => setTimeout(resolve, delay)).then(() => wrappedConnect());
    return connectPromise;
  } else {
    console.error(`[❌] RabbitMQ: Máximo de ${MAX_RETRIES} intentos de reconexión alcanzado.`);
    const err = new Error(`No se pudo conectar a RabbitMQ después de ${MAX_RETRIES} reintentos.`);
    rabbitEmitter.emit('failed', err);
    connectPromise = null;
    return Promise.reject(err);
  }
};

const setupChannelLogic = async (connInstance) => {
  if (isManuallyClosing || !connInstance) {
    console.log("[ℹ️] RabbitMQ: setupChannelLogic - Abortando: cierre manual o sin conexión.");
    return false;
  }
  let tempChannel;
  try {
    tempChannel = await connInstance.createChannel();
    console.log("[ℹ️] RabbitMQ: Canal creado.");

    tempChannel.on("error", (err) => console.error("[❌] RabbitMQ: Error en el canal:", err.message));
    tempChannel.on("close", () => {
      console.warn("[⚠️] RabbitMQ: Canal cerrado.");
      if (channel === tempChannel) {
        channel = null;
        if (!isManuallyClosing && connection === connInstance) {
          console.log("[ℹ️] RabbitMQ: El canal activo se cerró, intentando reabrir...");
          setTimeout(async () => {
            if (!isManuallyClosing && connection === connInstance && !channel) await setupChannelLogic(connInstance);
          }, RETRY_DELAY_BASE);
        }
      }
    });

    // DLX/DLQ Setup
    await tempChannel.assertExchange(DLX_NAME, 'direct', { durable: true });
    console.log(`[✅] RabbitMQ: DLX '${DLX_NAME}' asegurado.`);
    // Assert DLQ and bind it to DLX
    await tempChannel.assertQueue(DLQ_NAME, { durable: true });
    console.log(`[✅] RabbitMQ: DLQ '${DLQ_NAME}' asegurada.`);
    await tempChannel.bindQueue(DLQ_NAME, DLX_NAME, DLQ_ROUTING_KEY); // Use specific routing key for binding
    console.log(`[✅] RabbitMQ: DLQ '${DLQ_NAME}' vinculada a DLX '${DLX_NAME}' con routing key '${DLQ_ROUTING_KEY}'.`);

    // Main Queue Setup with DLX arguments
    await tempChannel.assertQueue(QUEUE_NAME, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': DLX_NAME,
        'x-dead-letter-routing-key': DLQ_ROUTING_KEY // Route nack'd messages with the same key
      }
    });
    console.log(`[✅] RabbitMQ: Cola principal '${QUEUE_NAME}' asegurada y configurada con DLX '${DLX_NAME}'.`);

    channel = tempChannel;
    rabbitEmitter.emit('connected', channel);
    console.log("[✅] RabbitMQ: Conexión y canal listos (con DLX/DLQ).");
    return true;

  } catch (error) {
    console.error("[❌] RabbitMQ: Error configurando el canal (con DLX/DLQ):", error.message, error.stack);
    if (channel === tempChannel) channel = null;
    return false;
  }
};

const wrappedConnect = async () => {
  if (connection) {
     if (channel) {
        rabbitEmitter.emit('connected', channel); return connection;
     }
     if (await setupChannelLogic(connection)) return connection;
     console.warn("[⚠️] RabbitMQ: wrappedConnect - Conexión existe pero falló setupChannel. Forzando cierre.");
     try { if(connection && !isManuallyClosing) await connection.close(); } catch (e) { /* ignore */ }
     throw new Error("Falló setupChannel en conexión existente.");
  }
  if (isManuallyClosing) throw new Error("Cierre manual en progreso.");

  const attemptNo = currentConnectionRetries;
  console.log(`[ℹ️] RabbitMQ: wrappedConnect - Intentando conectar AMQP (intento ${attemptNo})...`);
  try {
    const newConnection = await amqp.connect(RABBITMQ_URL);
    console.log("[✅] RabbitMQ: Conexión AMQP establecida.");
    newConnection.on("error", (err) => console.error("[❌] RabbitMQ: Error en la conexión AMQP:", err.message));
    newConnection.on("close", () => {
      console.warn("[⚠️] RabbitMQ: Conexión AMQP cerrada.");
      if (connection === newConnection) {
        const oldActiveConnection = connection; connection = null;
        if (channel) { channel.removeAllListeners(); channel = null; }
        rabbitEmitter.emit('disconnected');
        if (!isManuallyClosing && oldActiveConnection) attemptConnectionRecovery();
      }
    });
    connection = newConnection;
    if (await setupChannelLogic(connection)) {
      currentConnectionRetries = 0; return connection;
    } else {
      console.warn("[⚠️] RabbitMQ: wrappedConnect - Falló setupChannelLogic. Cerrando para reintentar.");
      if (connection && !isManuallyClosing) try { await connection.close(); } catch (e) { /* ignore */ }
      throw new Error("Falló la configuración del canal después de conectar.");
    }
  } catch (error) {
    console.error(`[❌] RabbitMQ: wrappedConnect - Fallo en intento ${attemptNo}:`, error.message);
    connection = null;
    throw error;
  }
};

export const connectToRabbitMQ = () => {
  isManuallyClosing = false;
  if (connection && channel) return Promise.resolve(channel);
  if (connectPromise) {
      return connectPromise.then(() => channel, async (err) => {
          connectPromise = null; return Promise.reject(err);
      });
  }
  currentConnectionRetries = 0;
  connectPromise = new Promise((resolve, reject) => {
    const onConnected = (ch) => { rabbitEmitter.off('failed', onFailed); resolve(ch); };
    const onFailed = (err) => { rabbitEmitter.off('connected', onConnected); connectPromise = null; reject(err); };
    rabbitEmitter.once('connected', onConnected);
    rabbitEmitter.once('failed', onFailed);
    attemptConnectionRecovery();
  });
  return connectPromise.then(() => channel);
};

export const getChannel = () => channel;

export const closeRabbitMQConnection = async () => {
  console.log("[ℹ️] RabbitMQ: Iniciando cierre manual...");
  isManuallyClosing = true;
  connectPromise = null;
  currentConnectionRetries = MAX_RETRIES + 1;
  rabbitEmitter.removeAllListeners('connected'); rabbitEmitter.removeAllListeners('failed');
  const chToClose = channel; channel = null;
  if (chToClose) {
    try { chToClose.removeAllListeners(); await chToClose.close(); console.log("[✅] RabbitMQ: Canal cerrado manualmente."); }
    catch (error) { console.error("[❌] RabbitMQ: Error al cerrar canal manualmente:", error.message); }
  }
  const connToClose = connection; connection = null;
  if (connToClose) {
    try { connToClose.removeAllListeners(); await connToClose.close(); console.log("[✅] RabbitMQ: Conexión cerrada manualmente."); }
    catch (error) { console.error("[❌] RabbitMQ: Error al cerrar conexión manualmente:", error.message); }
  }
  console.log("[ℹ️] RabbitMQ: Cierre manual finalizado.");
  currentConnectionRetries = 0;
};

if (!QUEUE_NAME) {
    console.error("[❌] RabbitMQ: QUEUE_NAME no está definida en las variables de entorno.");
    // Consider throwing an error if critical for app startup,
    // but for now, just logging to align with previous behavior.
}
if (!RABBITMQ_URL) {
    console.error("[❌] RabbitMQ: RABBITMQ_URL no está definida en las variables de entorno.");
}
