import { getChannel, rabbitEmitter } from "../config/rabbitmq.js"; // Import rabbitEmitter
import { createIdentifierService } from "../services/flareService.js";
import { createAlertService } from "../services/alertService.js";
import { Identifier } from "../models/Identifier.js";

const PREFETCH_COUNT = parseInt(process.env.RABBITMQ_PREFETCH_COUNT || "15", 10);
const QUEUE_NAME = process.env.QUEUE_NAME;

let consumerTag = null; // To keep track of the active consumer

export const startScanConsumer = async () => {
    if (consumerTag) {
        const currentChannel = getChannel();
        if (currentChannel) { // If channel exists, check if consumer is still valid on it
            try {
                // A lightweight way to check if consumerTag might still be valid or if channel is responsive
                // This isn't foolproof but can prevent re-subscribing if not needed.
                // A better check would be specific to amqplib's state if available.
                await currentChannel.checkQueue(QUEUE_NAME); // Simple check on queue
                console.log(`[ℹ️] ScanConsumer: Consumidor ya activo con tag '${consumerTag}' y canal parece OK. Saltando inicio.`);
                return;
            } catch (error) {
                console.warn(`[⚠️] ScanConsumer: Canal para consumidor '${consumerTag}' parece no estar OK (${error.message}). Permitiendo posible reinicio.`);
                consumerTag = null; // Force re-creation
            }
        } else {
             console.log(`[ℹ️] ScanConsumer: Consumidor tenia tag '${consumerTag}' pero no hay canal. Permitiendo reinicio.`);
             consumerTag = null; // Force re-creation
        }
    }

    // Re-check consumerTag after potential reset from above block
    if (consumerTag) { // If still set (e.g. first check passed)
        return;
    }

    const channel = getChannel();
    
    if (!channel) {
        console.error("[❌] ScanConsumer: No se pudo obtener el canal de RabbitMQ. El consumidor no se iniciará.");
        return;
    }

    try {
        await channel.prefetch(PREFETCH_COUNT);
        console.log(`[ℹ️] ScanConsumer: Prefetch count configurado a ${PREFETCH_COUNT}.`);

        const consumeResponse = await channel.consume(QUEUE_NAME, async (message) => {
            if (message !== null) {
                const data = JSON.parse(message.content.toString());
                console.log(`[🔄] ScanConsumer: Trabajo recibido de la cola '${QUEUE_NAME}':`, data.name);

                try {
                    const asset = await createIdentifierService(data.type, data.name);
                    const alert = await createAlertService({
                        assetId: asset.id,
                        name: asset.name,
                        searchTypes: asset.searchTypes,
                        risks: asset.risks,
                        frequency: data.frequency || 2,
                    });
                    const identifier = new Identifier({
                        flareId: asset.id,
                        name: asset.name,
                        type: asset.type,
                        searchTypes: asset.searchTypes,
                        risks: asset.risks,
                        dataUpdatedAt: asset.dataUpdatedAt,
                        isDisabled: asset.isDisabled,
                        urn: asset.urn,
                    });
                    const saved = await identifier.save();

                    console.log(`[✅] ScanConsumer: Identificador '${saved.name}' guardado en MongoDB.`);
                    console.log(`[✅] ScanConsumer: Alerta para '${asset.name}' creada en Flare.`);
                    channel.ack(message);
                    console.log(`[ACK] ScanConsumer: Mensaje procesado y confirmado para '${data.name}'.`);
                } catch (error) {
                    console.error(`[❌] ScanConsumer: Error procesando el trabajo para '${data.name}':`, error.message);
                    channel.nack(message, false, false);
                    console.log(`[NACK] ScanConsumer: Mensaje para '${data.name}' enviado a DLX.`);
                }
            }
        }, { noAck: false }); // Ensure noAck is false, which is default but good to be explicit

        consumerTag = consumeResponse.consumerTag;
        console.log(`[✅] ScanConsumer: Esperando trabajos en la cola '${QUEUE_NAME}' con consumerTag '${consumerTag}'.`);

        const activeChannel = channel;

        const clearConsumerInfo = () => {
            console.warn(`[⚠️] ScanConsumer: Limpiando información del consumidor (tag: ${consumerTag}) debido a cierre/error del canal.`);
            if (consumerTag) { // Check if it's the one we are tracking
                 consumerTag = null;
            }
            activeChannel.removeListener('close', clearConsumerInfo);
            activeChannel.removeListener('error', clearConsumerInfo);
        };

        activeChannel.once('close', clearConsumerInfo);
        activeChannel.on('error', clearConsumerInfo);


    } catch (error) {
        console.error("[❌] ScanConsumer: Error al iniciar el consumidor:", error.message, error.stack);
        consumerTag = null;
    }
};

rabbitEmitter.on('disconnected', () => {
    if (consumerTag) {
        console.warn(`[⚠️] ScanConsumer (Emitter): RabbitMQ desconectado. Limpiando consumerTag '${consumerTag}' para permitir reinicio del consumidor en la próxima conexión.`);
        consumerTag = null;
    }
});

if (!QUEUE_NAME) {
    console.error("[❌] ScanConsumer: QUEUE_NAME no está definida en las variables de entorno. El consumidor no funcionará correctamente.");
}
