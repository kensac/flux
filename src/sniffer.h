#ifndef SNIFFER_H
#define SNIFFER_H

#include <pcap.h>
#include <stdint.h>
#include <stdbool.h>

#define MAX_DEVICES 10000
#define MAX_APS 1000

typedef struct {
    uint8_t mac[6];
    time_t first_seen;
    time_t last_seen;
    int8_t rssi;
    uint32_t packet_count;
} device_t;

typedef struct {
    uint8_t bssid[6];
    char ssid[33];
    uint8_t channel;
    time_t first_seen;
    time_t last_seen;
    int8_t rssi;
    uint32_t beacon_count;
} ap_t;

typedef struct {
    char interface[16];
    pcap_t *handle;
    bool running;
    device_t devices[MAX_DEVICES];
    ap_t aps[MAX_APS];
    uint32_t device_count;
    uint32_t ap_count;
} sniffer_t;

int sniffer_init(sniffer_t *sniffer, const char *interface);
int sniffer_start(sniffer_t *sniffer);
void sniffer_stop(sniffer_t *sniffer);
void sniffer_cleanup(sniffer_t *sniffer);

#endif
