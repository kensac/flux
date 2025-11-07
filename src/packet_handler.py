import logging
from scapy.all import Dot11, Dot11Beacon, Dot11ProbeReq, Dot11Elt, RadioTap
from typing import Optional, Tuple, Callable
from src.models import Device, AccessPoint

logger = logging.getLogger(__name__)

class PacketHandler:
    def __init__(self, on_device_callback: Optional[Callable] = None, on_ap_callback: Optional[Callable] = None):
        self.devices: dict[str, Device] = {}
        self.access_points: dict[str, AccessPoint] = {}
        self.on_device_callback = on_device_callback
        self.on_ap_callback = on_ap_callback

    def process_packet(self, packet) -> None:
        if not packet.haslayer(Dot11):
            return

        try:
            if packet.haslayer(Dot11Beacon):
                self._handle_beacon(packet)
            elif packet.haslayer(Dot11ProbeReq):
                self._handle_probe_request(packet)
        except Exception as e:
            logger.error(f"Error processing packet: {e}")

    def _handle_beacon(self, packet) -> None:
        bssid = packet[Dot11].addr3
        if not bssid or bssid == "ff:ff:ff:ff:ff:ff":
            return

        ssid, channel = self._extract_beacon_info(packet)
        rssi = self._get_rssi(packet)
        encryption = self._get_encryption(packet)

        is_new = bssid not in self.access_points

        if bssid in self.access_points:
            self.access_points[bssid].update(rssi)
        else:
            self.access_points[bssid] = AccessPoint(
                bssid=bssid,
                ssid=ssid or "",
                channel=channel,
                rssi_values=[rssi],
                encryption=encryption
            )

        if self.on_ap_callback:
            self.on_ap_callback(self.access_points[bssid], is_new)

    def _handle_probe_request(self, packet) -> None:
        mac = packet[Dot11].addr2
        if not mac or mac == "ff:ff:ff:ff:ff:ff":
            return

        ssid = self._extract_ssid(packet)
        rssi = self._get_rssi(packet)

        is_new = mac not in self.devices

        if mac in self.devices:
            self.devices[mac].update_rssi(rssi)
            if ssid:
                self.devices[mac].add_probe_ssid(ssid)
        else:
            device = Device(mac_address=mac, rssi_values=[rssi])
            if ssid:
                device.add_probe_ssid(ssid)
            self.devices[mac] = device

        if self.on_device_callback:
            self.on_device_callback(self.devices[mac], is_new)

    def _extract_beacon_info(self, packet) -> Tuple[Optional[str], int]:
        ssid = None
        channel = 0

        if packet.haslayer(Dot11Elt):
            elt = packet[Dot11Elt]
            while elt:
                if elt.ID == 0:
                    ssid = elt.info.decode('utf-8', errors='ignore')
                elif elt.ID == 3:
                    channel = ord(elt.info)
                elt = elt.payload.getlayer(Dot11Elt)

        return ssid, channel

    def _extract_ssid(self, packet) -> Optional[str]:
        if packet.haslayer(Dot11Elt):
            elt = packet[Dot11Elt]
            while elt:
                if elt.ID == 0 and elt.info:
                    return elt.info.decode('utf-8', errors='ignore')
                elt = elt.payload.getlayer(Dot11Elt)
        return None

    def _get_rssi(self, packet) -> int:
        if packet.haslayer(RadioTap):
            return packet[RadioTap].dBm_AntSignal if hasattr(packet[RadioTap], 'dBm_AntSignal') else -100
        return -100

    def _get_encryption(self, packet) -> Optional[str]:
        cap = packet.sprintf("{Dot11Beacon:%Dot11Beacon.cap%}")
        if "privacy" in cap.lower():
            if packet.haslayer(Dot11Elt):
                elt = packet[Dot11Elt]
                while elt:
                    if elt.ID == 48:
                        return "WPA2"
                    elif elt.ID == 221:
                        if b'\x00\x50\xf2\x01\x01\x00' in bytes(elt):
                            return "WPA"
                    elt = elt.payload.getlayer(Dot11Elt)
            return "WEP"
        return "Open"

    def get_device_count(self) -> int:
        return len(self.devices)

    def get_ap_count(self) -> int:
        return len(self.access_points)
