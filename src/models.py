from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Set

@dataclass
class Device:
    mac_address: str
    first_seen: datetime = field(default_factory=datetime.now)
    last_seen: datetime = field(default_factory=datetime.now)
    rssi_values: list[int] = field(default_factory=list)
    probe_ssids: Set[str] = field(default_factory=set)
    packet_count: int = 0
    vendor: Optional[str] = None

    def update_rssi(self, rssi: int) -> None:
        self.rssi_values.append(rssi)
        self.last_seen = datetime.now()
        self.packet_count += 1

    def add_probe_ssid(self, ssid: str) -> None:
        if ssid:
            self.probe_ssids.add(ssid)

    @property
    def average_rssi(self) -> Optional[float]:
        return sum(self.rssi_values) / len(self.rssi_values) if self.rssi_values else None

@dataclass
class AccessPoint:
    bssid: str
    ssid: str
    channel: int
    first_seen: datetime = field(default_factory=datetime.now)
    last_seen: datetime = field(default_factory=datetime.now)
    rssi_values: list[int] = field(default_factory=list)
    beacon_count: int = 0
    encryption: Optional[str] = None

    def update(self, rssi: int) -> None:
        self.rssi_values.append(rssi)
        self.last_seen = datetime.now()
        self.beacon_count += 1

    @property
    def average_rssi(self) -> Optional[float]:
        return sum(self.rssi_values) / len(self.rssi_values) if self.rssi_values else None
