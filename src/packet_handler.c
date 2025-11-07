#include "packet_handler.h"
#include "http_client.h"
#include <string.h>
#include <stdio.h>
#include <time.h>

#define IEEE80211_FTYPE_MGMT 0x00
#define IEEE80211_STYPE_BEACON 0x08
#define IEEE80211_STYPE_PROBE_REQ 0x04

typedef struct {
    uint8_t fc[2];
    uint16_t duration;
    uint8_t addr1[6];
    uint8_t addr2[6];
    uint8_t addr3[6];
    uint16_t seq_ctrl;
} __attribute__((packed)) ieee80211_hdr_t;

typedef struct {
    uint8_t version;
    uint8_t pad;
    uint16_t len;
    uint32_t present;
} __attribute__((packed)) radiotap_hdr_t;

static int8_t extract_rssi(const uint8_t *packet, uint16_t rtap_len) {
    if (rtap_len < sizeof(radiotap_hdr_t)) return -100;

    const radiotap_hdr_t *rtap = (const radiotap_hdr_t *)packet;
    uint32_t present = rtap->present;
    const uint8_t *pos = packet + sizeof(radiotap_hdr_t);

    if (present & (1 << 5)) {
        return (int8_t)*pos;
    }

    return -100;
}

static void handle_beacon(sniffer_t *sniffer, const ieee80211_hdr_t *hdr, const uint8_t *body, uint32_t body_len, int8_t rssi) {
    static int beacon_count = 0;
    char ssid[33] = {0};
    int channel = 0;

    if (body_len > 12) {
        const uint8_t *ie = body + 12;
        uint32_t ie_len = body_len - 12;

        while (ie_len > 2) {
            uint8_t id = ie[0];
            uint8_t len = ie[1];

            if (len + 2 > ie_len) break;

            if (id == 0 && len > 0 && len < 33) {
                memcpy(ssid, ie + 2, len);
                ssid[len] = '\0';
            } else if (id == 3 && len == 1) {
                channel = ie[2];
            }

            ie += len + 2;
            ie_len -= len + 2;
        }
    }

    beacon_count++;
    if (beacon_count <= 5) {
        printf("Beacon from %02x:%02x:%02x:%02x:%02x:%02x SSID=%s CH=%d RSSI=%ddBm\n",
               hdr->addr3[0], hdr->addr3[1], hdr->addr3[2],
               hdr->addr3[3], hdr->addr3[4], hdr->addr3[5],
               ssid[0] ? ssid : "(hidden)", channel, rssi);
    }

    http_post_ap(sniffer->api_url, hdr->addr3, ssid, channel, rssi);
}

static void handle_probe_req(sniffer_t *sniffer, const ieee80211_hdr_t *hdr, const uint8_t *body, uint32_t body_len, int8_t rssi) {
    static int probe_count = 0;
    char ssid[33] = {0};

    if (body_len > 0) {
        const uint8_t *ie = body;
        uint32_t ie_len = body_len;

        while (ie_len > 2) {
            uint8_t id = ie[0];
            uint8_t len = ie[1];

            if (len + 2 > ie_len) break;

            if (id == 0 && len > 0 && len < 33) {
                memcpy(ssid, ie + 2, len);
                ssid[len] = '\0';
                break;
            }

            ie += len + 2;
            ie_len -= len + 2;
        }
    }

    probe_count++;
    if (probe_count <= 5) {
        printf("Probe from %02x:%02x:%02x:%02x:%02x:%02x SSID=%s RSSI=%ddBm\n",
               hdr->addr2[0], hdr->addr2[1], hdr->addr2[2],
               hdr->addr2[3], hdr->addr2[4], hdr->addr2[5],
               ssid[0] ? ssid : "(broadcast)", rssi);
    }
    http_post_device(sniffer->api_url, hdr->addr2, rssi, ssid);
}

void packet_handler(u_char *args, const struct pcap_pkthdr *header, const u_char *packet) {
    sniffer_t *sniffer = (sniffer_t *)args;
    static uint32_t packet_count = 0;

    packet_count++;
    if (packet_count % 100 == 0) {
        printf("Processed %u packets...\n", packet_count);
        fflush(stdout);
    }

    if (header->len < sizeof(radiotap_hdr_t)) return;

    const radiotap_hdr_t *rtap = (const radiotap_hdr_t *)packet;
    uint16_t rtap_len = rtap->len;

    if (header->len < rtap_len + sizeof(ieee80211_hdr_t)) return;

    int8_t rssi = extract_rssi(packet, rtap_len);

    const ieee80211_hdr_t *wifi = (const ieee80211_hdr_t *)(packet + rtap_len);

    uint8_t type = (wifi->fc[0] >> 2) & 0x03;
    uint8_t subtype = (wifi->fc[0] >> 4) & 0x0F;

    if (type != IEEE80211_FTYPE_MGMT) return;

    const uint8_t *body = packet + rtap_len + sizeof(ieee80211_hdr_t);
    uint32_t body_len = header->len - rtap_len - sizeof(ieee80211_hdr_t);

    if (subtype == IEEE80211_STYPE_BEACON) {
        handle_beacon(sniffer, wifi, body, body_len, rssi);
    } else if (subtype == IEEE80211_STYPE_PROBE_REQ) {
        handle_probe_req(sniffer, wifi, body, body_len, rssi);
    }
}
