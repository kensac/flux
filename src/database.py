import logging
from datetime import datetime
from typing import Optional
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.collection import Collection
from pymongo.errors import ConnectionFailure, OperationFailure
from src.models import Device, AccessPoint

logger = logging.getLogger(__name__)

class Database:
    def __init__(self, uri: str = "mongodb://localhost:27017/", db_name: str = "flux"):
        self.client: Optional[MongoClient] = None
        self.uri = uri
        self.db_name = db_name
        self.devices: Optional[Collection] = None
        self.access_points: Optional[Collection] = None
        self.events: Optional[Collection] = None

    def connect(self) -> bool:
        try:
            self.client = MongoClient(self.uri, serverSelectionTimeoutMS=5000)
            self.client.admin.command('ping')

            db = self.client[self.db_name]
            self.devices = db.devices
            self.access_points = db.access_points
            self.events = db.events

            self._create_indexes()
            logger.info(f"Connected to MongoDB: {self.db_name}")
            return True
        except (ConnectionFailure, OperationFailure) as e:
            logger.error(f"Database connection failed: {e}")
            return False

    def _create_indexes(self) -> None:
        if self.devices:
            self.devices.create_index([("mac_address", ASCENDING)], unique=True)
            self.devices.create_index([("last_seen", DESCENDING)])

        if self.access_points:
            self.access_points.create_index([("bssid", ASCENDING)], unique=True)
            self.access_points.create_index([("last_seen", DESCENDING)])

        if self.events:
            self.events.create_index([("timestamp", DESCENDING)])
            self.events.create_index([("mac_address", ASCENDING)])

    def upsert_device(self, device: Device) -> None:
        if not self.devices:
            return

        try:
            self.devices.update_one(
                {"mac_address": device.mac_address},
                {
                    "$set": {
                        "last_seen": device.last_seen,
                        "vendor": device.vendor,
                    },
                    "$setOnInsert": {
                        "first_seen": device.first_seen,
                    },
                    "$push": {
                        "rssi_values": {"$each": device.rssi_values[-10:]}
                    },
                    "$addToSet": {
                        "probe_ssids": {"$each": list(device.probe_ssids)}
                    },
                    "$inc": {"packet_count": device.packet_count}
                },
                upsert=True
            )
        except OperationFailure as e:
            logger.error(f"Failed to upsert device {device.mac_address}: {e}")

    def upsert_access_point(self, ap: AccessPoint) -> None:
        if not self.access_points:
            return

        try:
            self.access_points.update_one(
                {"bssid": ap.bssid},
                {
                    "$set": {
                        "ssid": ap.ssid,
                        "channel": ap.channel,
                        "last_seen": ap.last_seen,
                        "encryption": ap.encryption,
                    },
                    "$setOnInsert": {
                        "first_seen": ap.first_seen,
                    },
                    "$push": {
                        "rssi_values": {"$each": ap.rssi_values[-10:]}
                    },
                    "$inc": {"beacon_count": ap.beacon_count}
                },
                upsert=True
            )
        except OperationFailure as e:
            logger.error(f"Failed to upsert AP {ap.bssid}: {e}")

    def log_event(self, event_type: str, mac_address: str, metadata: dict = None) -> None:
        if not self.events:
            return

        try:
            event = {
                "timestamp": datetime.now(),
                "event_type": event_type,
                "mac_address": mac_address,
                "metadata": metadata or {}
            }
            self.events.insert_one(event)
        except OperationFailure as e:
            logger.error(f"Failed to log event: {e}")

    def get_active_devices(self, since_minutes: int = 5) -> list:
        if not self.devices:
            return []

        try:
            cutoff = datetime.now().timestamp() - (since_minutes * 60)
            cursor = self.devices.find(
                {"last_seen": {"$gte": datetime.fromtimestamp(cutoff)}}
            )
            return list(cursor)
        except OperationFailure as e:
            logger.error(f"Failed to query active devices: {e}")
            return []

    def close(self) -> None:
        if self.client:
            self.client.close()
            logger.info("Database connection closed")
