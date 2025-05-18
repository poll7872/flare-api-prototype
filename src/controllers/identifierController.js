import { getChannel } from '../config/rabbitmq.js';

//Crear un identificador en Flare (asset)
export const createIdentifier = async (req, res) => {
    const { type, name } = req.body;

    if (!type || !name) {
        return res.status(400).json({ message: 'Type and name are required' });
    }

    try {
        const job = { type, name };
        const channel = getChannel();

        if (!channel) {
            return res.status(500).json({ message: 'RabbitMQ channel not found' });
        }

        channel.sendToQueue('scan_queue', Buffer.from(JSON.stringify(job)));
        console.log(`[✅] Escaneo encolado: ${JSON.stringify(job)}`);

        res.status(201).json({ message: 'El escaneo se ha encolado correctamente' });
    } catch (error) {
        console.error('[❌] Error al encolar el escaneo: ', error);
        res.status(500).json({ message: 'Error creando el identificador', error: error.message });
    }
}