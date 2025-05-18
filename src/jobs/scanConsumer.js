import { getChannel } from "../config/rabbitmq.js";
import { createIdentifierService } from "../services/flareService.js";
import { createAlertService } from "../services/alertService.js";
import { Identifier } from "../models/Identifier.js";

export const startScanConsumer = async () => {
    const channel = getChannel();
    
    if (!channel) {
        console.error("[❌] No se pudo obtener el canal de RabbitMQ");
        return;
    }

    channel.prefetch(15); //Prefetch para procesar 15 trabajos a la vez

    await channel.consume(process.env.QUEUE_NAME, async (message) => {
        if (message !== null) {
            const data = JSON.parse(message.content.toString());
            console.log("[✅] Trabajado recibido de las cola: ", data);

            try {
                //1. Crear el asset o identificador en Flare
                const asset = await createIdentifierService(data.type, data.name);

                //2. Crear la alerta en Flare
                const alert = await createAlertService({
                    assetId: asset.id,
                    name: asset.name,
                    searchTypes: asset.searchTypes,
                    risks: asset.risks,
                    frequency: data.frequency || 2,
                })

                //3. Guardar el identificador en MongoDB
                const identifier = new Identifier({
                    flareId: asset.id,
                    name: asset.name,
                    type: asset.type,
                    searchTypes: asset.searchTypes,
                    risks: asset.risks,
                    dataUpdatedAt: asset.dataUpdatedAt,
                    isDisabled: asset.isDisabled,
                    urn: asset.urn,
                })

                const saved = await identifier.save();

                

                console.log("[✅] Identificador guardado en MongoDB: ", saved);
                console.log("[✅] Alerta creada en Flare: ", alert);
                channel.ack(message);
            } catch (error) {
                console.error("[❌] Error procesando el trabajo: ", error);
                channel.nack(message, false, false); //No reintenta
            }
        } 
    });

    console.log("[✅] Esperando trabajos en la cola...");
};
