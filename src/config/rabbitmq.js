import amqp from "amqplib";

let channel;

export const connectToRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(process.env.QUEUE_NAME, { durable: true });

    console.log("[✅] Conectado a RabbitMQ y cola lista: ", process.env.QUEUE_NAME);
  } catch (error) {
    console.error("[❌] Error al conectar a RabbitMQ: ", error);
  }
};

export const getChannel = () => channel;
