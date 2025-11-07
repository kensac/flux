#ifndef SNIFFER_H
#define SNIFFER_H

#include <pcap.h>
#include <stdint.h>
#include <stdbool.h>
#include <pthread.h>

typedef struct {
    char interface[16];
    char api_url[256];
    pcap_t *handle;
    bool running;
    pthread_t hopper_thread;
    bool hopping_enabled;
    int hopping_timeout_ms;
    int channels[64];      // Array of channels to hop
    int num_channels;      // Number of channels in array
} sniffer_t;

int sniffer_init(sniffer_t *sniffer, const char *interface, const char *api_url);
int sniffer_start(sniffer_t *sniffer);
void sniffer_stop(sniffer_t *sniffer);
void sniffer_cleanup(sniffer_t *sniffer);

#endif
