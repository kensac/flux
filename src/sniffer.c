#include "sniffer.h"
#include "packet_handler.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <pthread.h>
#include <sys/wait.h>

static void set_channel(const char *interface, int channel) {
    char cmd[256];
    snprintf(cmd, sizeof(cmd), "iw dev %s set channel %d 2>/dev/null", interface, channel);
    system(cmd);
}

static void* channel_hopper(void *arg) {
    sniffer_t *sniffer = (sniffer_t *)arg;
    int channels[] = {1, 6, 11, 2, 7, 3, 8, 4, 9, 5, 10};
    int num_channels = sizeof(channels) / sizeof(channels[0]);
    int idx = 0;

    printf("Channel hopping started\n");

    while (sniffer->running) {
        set_channel(sniffer->interface, channels[idx]);
        idx = (idx + 1) % num_channels;
        usleep(300000);
    }

    return NULL;
}

int sniffer_init(sniffer_t *sniffer, const char *interface, const char *api_url) {
    char errbuf[PCAP_ERRBUF_SIZE];

    memset(sniffer, 0, sizeof(sniffer_t));
    strncpy(sniffer->interface, interface, sizeof(sniffer->interface) - 1);
    strncpy(sniffer->api_url, api_url, sizeof(sniffer->api_url) - 1);

    sniffer->handle = pcap_open_live(interface, BUFSIZ, 1, 1000, errbuf);
    if (sniffer->handle == NULL) {
        fprintf(stderr, "Error opening interface %s: %s\n", interface, errbuf);
        return -1;
    }

    if (pcap_datalink(sniffer->handle) != DLT_IEEE802_11_RADIO) {
        fprintf(stderr, "Interface %s is not in monitor mode\n", interface);
        pcap_close(sniffer->handle);
        return -1;
    }

    sniffer->running = true;

    if (pthread_create(&sniffer->hopper_thread, NULL, channel_hopper, sniffer) != 0) {
        fprintf(stderr, "Failed to create channel hopper thread\n");
        pcap_close(sniffer->handle);
        return -1;
    }

    return 0;
}

int sniffer_start(sniffer_t *sniffer) {
    printf("Starting packet capture loop...\n");
    fflush(stdout);

    if (pcap_loop(sniffer->handle, -1, packet_handler, (u_char *)sniffer) == -1) {
        fprintf(stderr, "Error in pcap_loop: %s\n", pcap_geterr(sniffer->handle));
        return -1;
    }
    return 0;
}

void sniffer_stop(sniffer_t *sniffer) {
    sniffer->running = false;
    if (sniffer->handle) {
        pcap_breakloop(sniffer->handle);
    }
    pthread_join(sniffer->hopper_thread, NULL);
}

void sniffer_cleanup(sniffer_t *sniffer) {
    if (sniffer->handle) {
        pcap_close(sniffer->handle);
        sniffer->handle = NULL;
    }
}
