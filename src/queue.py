import json
import logging
from typing import Callable, Optional
import pika
from pika.adapters.blocking_connection import BlockingChannel
from pika.exceptions import AMQPConnectionError, AMQPChannelError

logger = logging.getLogger(__name__)

class MessageQueue:
    def __init__(self, host: str = "localhost", queue_name: str = "flux_events"):
        self.host = host
        self.queue_name = queue_name
        self.connection: Optional[pika.BlockingConnection] = None
        self.channel: Optional[BlockingChannel] = None

    def connect(self) -> bool:
        try:
            parameters = pika.ConnectionParameters(
                host=self.host,
                heartbeat=600,
                blocked_connection_timeout=300
            )
            self.connection = pika.BlockingConnection(parameters)
            self.channel = self.connection.channel()
            self.channel.queue_declare(queue=self.queue_name, durable=True)
            logger.info(f"Connected to RabbitMQ at {self.host}")
            return True
        except AMQPConnectionError as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            return False

    def publish(self, message: dict) -> bool:
        if not self.channel:
            logger.warning("Cannot publish: not connected to queue")
            return False

        try:
            self.channel.basic_publish(
                exchange='',
                routing_key=self.queue_name,
                body=json.dumps(message),
                properties=pika.BasicProperties(
                    delivery_mode=2,
                )
            )
            return True
        except (AMQPConnectionError, AMQPChannelError) as e:
            logger.error(f"Failed to publish message: {e}")
            return False

    def consume(self, callback: Callable[[dict], None]) -> None:
        if not self.channel:
            logger.error("Cannot consume: not connected to queue")
            return

        def message_callback(ch, method, properties, body):
            try:
                message = json.loads(body)
                callback(message)
                ch.basic_ack(delivery_tag=method.delivery_tag)
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

        try:
            self.channel.basic_qos(prefetch_count=1)
            self.channel.basic_consume(
                queue=self.queue_name,
                on_message_callback=message_callback
            )
            logger.info(f"Starting to consume from {self.queue_name}")
            self.channel.start_consuming()
        except KeyboardInterrupt:
            self.channel.stop_consuming()
        except Exception as e:
            logger.error(f"Consume error: {e}")

    def close(self) -> None:
        if self.connection and not self.connection.is_closed:
            self.connection.close()
            logger.info("RabbitMQ connection closed")
