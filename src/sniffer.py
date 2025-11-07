import logging
import threading
import time
from scapy.all import sniff, conf
from src.config import INTERFACE, CHANNEL_HOP_INTERVAL, CHANNELS_2_4GHZ
from src.packet_handler import PacketHandler

logger = logging.getLogger(__name__)

class WiFiSniffer:
    def __init__(self, interface: str = INTERFACE, on_device_callback=None, on_ap_callback=None):
        self.interface = interface
        self.packet_handler = PacketHandler(on_device_callback, on_ap_callback)
        self.running = False
        self.channel_hopper_thread: threading.Thread | None = None
        self.current_channel = 1

    def _set_monitor_mode(self) -> bool:
        import subprocess

        try:
            subprocess.run(['sudo', 'ifconfig', self.interface, 'down'], check=True, capture_output=True)
            subprocess.run(['sudo', 'iwconfig', self.interface, 'mode', 'monitor'], check=True, capture_output=True)
            subprocess.run(['sudo', 'ifconfig', self.interface, 'up'], check=True, capture_output=True)
            logger.info(f"Set {self.interface} to monitor mode")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to set monitor mode: {e}")
            return False

    def _set_channel(self, channel: int) -> None:
        import subprocess
        try:
            subprocess.run(['sudo', 'iwconfig', self.interface, 'channel', str(channel)],
                         check=True, capture_output=True, timeout=1)
            self.current_channel = channel
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
            logger.debug(f"Failed to set channel {channel}: {e}")

    def _channel_hopper(self) -> None:
        while self.running:
            for channel in CHANNELS_2_4GHZ:
                if not self.running:
                    break
                self._set_channel(channel)
                time.sleep(CHANNEL_HOP_INTERVAL)

    def start(self) -> None:
        if not self._set_monitor_mode():
            raise RuntimeError("Failed to set monitor mode")

        self.running = True

        self.channel_hopper_thread = threading.Thread(target=self._channel_hopper, daemon=True)
        self.channel_hopper_thread.start()

        logger.info(f"Starting WiFi sniffer on {self.interface}")

        try:
            conf.checkIPaddr = False
            sniff(iface=self.interface, prn=self.packet_handler.process_packet, store=False)
        except KeyboardInterrupt:
            self.stop()
        except Exception as e:
            logger.error(f"Sniffing error: {e}")
            self.stop()

    def stop(self) -> None:
        logger.info("Stopping WiFi sniffer")
        self.running = False
        if self.channel_hopper_thread:
            self.channel_hopper_thread.join(timeout=2)

    def get_stats(self) -> dict:
        return {
            "devices": self.packet_handler.get_device_count(),
            "access_points": self.packet_handler.get_ap_count(),
            "current_channel": self.current_channel
        }
