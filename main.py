#!/usr/bin/env python3

import logging
import signal
import sys
import time
from src.config import LOG_LEVEL
from src.sniffer import WiFiSniffer
from src.publisher import Publisher

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('flux.log')
    ]
)

logger = logging.getLogger(__name__)

publisher = None
sniffer = None

def signal_handler(_signum, _frame):
    logger.info("Received interrupt signal, shutting down...")
    if publisher:
        publisher.stop()
    if sniffer:
        sniffer.stop()
    sys.exit(0)

def main():
    global publisher, sniffer

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    publisher = Publisher()
    if not publisher.connect():
        logger.warning("Database/Queue connection failed, running in standalone mode")
        publisher = None

    sniffer = WiFiSniffer(
        on_device_callback=publisher.on_device if publisher else None,
        on_ap_callback=publisher.on_access_point if publisher else None
    )

    try:
        logger.info("Starting Flux WiFi Sniffer")

        if publisher:
            publisher.start()

        stats_thread = StatsReporter(sniffer)
        stats_thread.start()

        sniffer.start()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)
    finally:
        if sniffer:
            sniffer.stop()
        if publisher:
            publisher.stop()

class StatsReporter:
    def __init__(self, sniffer: WiFiSniffer, interval: int = 30):
        self.sniffer = sniffer
        self.interval = interval
        self.thread = None

    def start(self):
        import threading
        self.thread = threading.Thread(target=self._report_loop, daemon=True)
        self.thread.start()

    def _report_loop(self):
        while True:
            time.sleep(self.interval)
            stats = self.sniffer.get_stats()
            logger.info(f"Stats - Devices: {stats['devices']}, APs: {stats['access_points']}, Channel: {stats['current_channel']}")

if __name__ == "__main__":
    main()
