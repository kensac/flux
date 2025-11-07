import logging
import requests
from typing import Optional
from functools import lru_cache

logger = logging.getLogger(__name__)

class VendorLookup:
    MAC_VENDORS_API = "https://api.macvendors.com"

    @staticmethod
    @lru_cache(maxsize=1024)
    def lookup(mac_address: str) -> Optional[str]:
        try:
            response = requests.get(
                f"{VendorLookup.MAC_VENDORS_API}/{mac_address}",
                timeout=2
            )
            if response.status_code == 200:
                return response.text.strip()
            elif response.status_code == 404:
                return "Unknown"
            else:
                logger.debug(f"Vendor lookup failed for {mac_address}: {response.status_code}")
                return None
        except requests.RequestException as e:
            logger.debug(f"Vendor lookup error for {mac_address}: {e}")
            return None

    @staticmethod
    def get_oui(mac_address: str) -> str:
        return mac_address.replace(":", "").replace("-", "").upper()[:6]
