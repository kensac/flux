import json
import csv
from datetime import datetime, timedelta
from typing import Optional
from src.database import Database

class Analytics:
    def __init__(self, db: Database):
        self.db = db

    def get_unique_devices(self, hours: int = 24) -> int:
        if self.db.devices is None:
            return 0

        cutoff = datetime.now() - timedelta(hours=hours)
        count = self.db.devices.count_documents({
            "last_seen": {"$gte": cutoff}
        })
        return count

    def get_peak_hours(self, days: int = 7) -> dict:
        if self.db.devices is None:
            return {}

        cutoff = datetime.now() - timedelta(days=days)
        pipeline = [
            {"$match": {"last_seen": {"$gte": cutoff}}},
            {"$project": {
                "hour": {"$hour": "$last_seen"}
            }},
            {"$group": {
                "_id": "$hour",
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}}
        ]

        results = list(self.db.devices.aggregate(pipeline))
        return {str(r["_id"]): r["count"] for r in results}

    def get_device_dwell_time(self, mac_address: str) -> Optional[dict]:
        if self.db.devices is None:
            return None

        device = self.db.devices.find_one({"mac_address": mac_address})
        if not device:
            return None

        first_seen = device.get("first_seen")
        last_seen = device.get("last_seen")

        if first_seen and last_seen:
            duration = (last_seen - first_seen).total_seconds()
            return {
                "mac_address": mac_address,
                "first_seen": first_seen.isoformat(),
                "last_seen": last_seen.isoformat(),
                "dwell_time_seconds": duration,
                "packet_count": device.get("packet_count", 0)
            }
        return None

    def export_devices_json(self, filepath: str, hours: Optional[int] = None) -> None:
        if self.db.devices is None:
            return

        query = {}
        if hours:
            cutoff = datetime.now() - timedelta(hours=hours)
            query["last_seen"] = {"$gte": cutoff}

        devices = list(self.db.devices.find(query, {"_id": 0}))

        for device in devices:
            if "first_seen" in device:
                device["first_seen"] = device["first_seen"].isoformat()
            if "last_seen" in device:
                device["last_seen"] = device["last_seen"].isoformat()
            if "probe_ssids" in device and isinstance(device["probe_ssids"], set):
                device["probe_ssids"] = list(device["probe_ssids"])

        with open(filepath, 'w') as f:
            json.dump(devices, f, indent=2)

    def export_devices_csv(self, filepath: str, hours: Optional[int] = None) -> None:
        if self.db.devices is None:
            return

        query = {}
        if hours:
            cutoff = datetime.now() - timedelta(hours=hours)
            query["last_seen"] = {"$gte": cutoff}

        devices = list(self.db.devices.find(query, {"_id": 0}))

        if not devices:
            return

        with open(filepath, 'w', newline='') as f:
            fieldnames = ["mac_address", "first_seen", "last_seen", "packet_count", "average_rssi", "probe_ssids"]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()

            for device in devices:
                row = {
                    "mac_address": device.get("mac_address", ""),
                    "first_seen": device.get("first_seen", "").isoformat() if device.get("first_seen") else "",
                    "last_seen": device.get("last_seen", "").isoformat() if device.get("last_seen") else "",
                    "packet_count": device.get("packet_count", 0),
                    "average_rssi": sum(device.get("rssi_values", [])) / len(device.get("rssi_values", [1])),
                    "probe_ssids": ",".join(device.get("probe_ssids", []))
                }
                writer.writerow(row)

    def get_hourly_stats(self, hours: int = 24) -> list[dict]:
        if self.db.events is None:
            return []

        cutoff = datetime.now() - timedelta(hours=hours)
        pipeline = [
            {"$match": {
                "timestamp": {"$gte": cutoff},
                "event_type": "device_discovered"
            }},
            {"$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d %H:00",
                        "date": "$timestamp"
                    }
                },
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]

        results = list(self.db.events.aggregate(pipeline))
        return [{"hour": r["_id"], "devices": r["count"]} for r in results]
