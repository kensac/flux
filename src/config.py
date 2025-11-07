import os
from dotenv import load_dotenv

load_dotenv()

INTERFACE = os.getenv("INTERFACE", "wlan0")
CHANNEL_HOP_INTERVAL = float(os.getenv("CHANNEL_HOP_INTERVAL", "0.5"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
MONGODB_DB = os.getenv("MONGODB_DB", "flux")

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
RABBITMQ_QUEUE = os.getenv("RABBITMQ_QUEUE", "flux_events")

BATCH_SIZE = int(os.getenv("BATCH_SIZE", "50"))
BATCH_INTERVAL = int(os.getenv("BATCH_INTERVAL", "10"))

CHANNELS_2_4GHZ = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
CHANNELS_5GHZ = [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165]
