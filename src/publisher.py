import logging
import threading
import time
from typing import Optional
from src.config import MONGODB_URI, MONGODB_DB, BATCH_INTERVAL
from src.database import Database
from src.models import Device, AccessPoint
from src.vendor_lookup import VendorLookup

logger = logging.getLogger(__name__)

class Publisher:
    def __init__(self):
        self.db = Database(MONGODB_URI, MONGODB_DB)
        self.device_batch: list[Device] = []
        self.ap_batch: list[AccessPoint] = []
        self.lock = threading.Lock()
        self.running = False
        self.flush_thread: Optional[threading.Thread] = None

    def connect(self) -> bool:
        return self.db.connect()

    def on_device(self, device: Device, is_new: bool) -> None:
        if is_new and not device.vendor:
            vendor = VendorLookup.lookup(device.mac_address)
            if vendor:
                device.vendor = vendor

        with self.lock:
            self.device_batch.append(device)

    def on_access_point(self, ap: AccessPoint, is_new: bool) -> None:
        with self.lock:
            self.ap_batch.append(ap)

    def _flush_batches(self) -> None:
        while self.running:
            time.sleep(BATCH_INTERVAL)

            with self.lock:
                devices_to_flush = self.device_batch.copy()
                aps_to_flush = self.ap_batch.copy()
                self.device_batch.clear()
                self.ap_batch.clear()

            if devices_to_flush:
                for device in devices_to_flush:
                    self.db.upsert_device(device)
                logger.debug(f"Flushed {len(devices_to_flush)} devices to database")

            if aps_to_flush:
                for ap in aps_to_flush:
                    self.db.upsert_access_point(ap)
                logger.debug(f"Flushed {len(aps_to_flush)} APs to database")

    def start(self) -> None:
        self.running = True
        self.flush_thread = threading.Thread(target=self._flush_batches, daemon=True)
        self.flush_thread.start()
        logger.info("Publisher started")

    def stop(self) -> None:
        self.running = False
        if self.flush_thread:
            self.flush_thread.join(timeout=5)

        with self.lock:
            for device in self.device_batch:
                self.db.upsert_device(device)
            for ap in self.ap_batch:
                self.db.upsert_access_point(ap)

        self.db.close()
        logger.info("Publisher stopped")
