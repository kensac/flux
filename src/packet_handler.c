#include "packet_handler.h"
#include <string.h>
#include <stdio.h>
#include <time.h>

#define IEEE80211_FTYPE_MGMT 0x00
#define IEEE80211_STYPE_BEACON 0x80
#define IEEE80211_STYPE_PROBE_REQ 0x40

typedef struct {
    uint8_t version:2;
    uint8_t type:2;
    uint8_t subtype:4;
    uint8_t flags;
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

static int find_device(sniffer_t *sniffer, const uint8_t *mac) {
    for (uint32_t i = 0; i < sniffer->device_count; i++) {
        if (memcmp(sniffer->devices[i].mac, mac, 6) == 0) {
            return i;
        }
    }
    return -1;
}

static int find_ap(sniffer_t *sniffer, const uint8_t *bssid) {
    for (uint32_t i = 0; i < sniffer->ap_count; i++) {
        if (memcmp(sniffer->aps[i].bssid, bssid, 6) == 0) {
            return i;
        }
    }
    return -1;
}

static void handle_beacon(sniffer_t *sniffer, const ieee80211_hdr_t *hdr, const uint8_t *body, uint32_t body_len) {
    int idx = find_ap(sniffer, hdr->addr3);
    time_t now = time(NULL);

    if (idx == -1) {
        if (sniffer->ap_count >= MAX_APS) return;

        idx = sniffer->ap_count++;
        memcpy(sniffer->aps[idx].bssid, hdr->addr3, 6);
        sniffer->aps[idx].first_seen = now;
        sniffer->aps[idx].beacon_count = 0;
        sniffer->aps[idx].ssid[0] = '\0';
        sniffer->aps[idx].channel = 0;

        printf("New AP: %02x:%02x:%02x:%02x:%02x:%02x\n",
               hdr->addr3[0], hdr->addr3[1], hdr->addr3[2],
               hdr->addr3[3], hdr->addr3[4], hdr->addr3[5]);
    }

    sniffer->aps[idx].last_seen = now;
    sniffer->aps[idx].beacon_count++;

    if (body_len > 12) {
        const uint8_t *ie = body + 12;
        uint32_t ie_len = body_len - 12;

        while (ie_len > 2) {
            uint8_t id = ie[0];
            uint8_t len = ie[1];

            if (len + 2 > ie_len) break;

            if (id == 0 && len > 0 && len < 33) {
                memcpy(sniffer->aps[idx].ssid, ie + 2, len);
                sniffer->aps[idx].ssid[len] = '\0';
            } else if (id == 3 && len == 1) {
                sniffer->aps[idx].channel = ie[2];
            }

            ie += len + 2;
            ie_len -= len + 2;
        }
    }
}

static void handle_probe_req(sniffer_t *sniffer, const ieee80211_hdr_t *hdr) {
    int idx = find_device(sniffer, hdr->addr2);
    time_t now = time(NULL);

    if (idx == -1) {
        if (sniffer->device_count >= MAX_DEVICES) return;

        idx = sniffer->device_count++;
        memcpy(sniffer->devices[idx].mac, hdr->addr2, 6);
        sniffer->devices[idx].first_seen = now;
        sniffer->devices[idx].packet_count = 0;
        sniffer->devices[idx].rssi = -100;

        printf("New Device: %02x:%02x:%02x:%02x:%02x:%02x\n",
               hdr->addr2[0], hdr->addr2[1], hdr->addr2[2],
               hdr->addr2[3], hdr->addr2[4], hdr->addr2[5]);
    }

    sniffer->devices[idx].last_seen = now;
    sniffer->devices[idx].packet_count++;
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

    const ieee80211_hdr_t *wifi = (const ieee80211_hdr_t *)(packet + rtap_len);

    if (wifi->type != IEEE80211_FTYPE_MGMT) return;

    const uint8_t *body = packet + rtap_len + sizeof(ieee80211_hdr_t);
    uint32_t body_len = header->len - rtap_len - sizeof(ieee80211_hdr_t);

    if (wifi->subtype == IEEE80211_STYPE_BEACON) {
        handle_beacon(sniffer, wifi, body, body_len);
    } else if (wifi->subtype == IEEE80211_STYPE_PROBE_REQ) {
        handle_probe_req(sniffer, wifi);
    }
}
