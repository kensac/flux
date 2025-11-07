#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <unistd.h>
#include <curl/curl.h>
#include "sniffer.h"

static sniffer_t sniffer;

void signal_handler(int sig) {
    (void)sig;
    printf("\nShutting down...\n");
    sniffer_stop(&sniffer);
    exit(0);
}

int main(int argc, char *argv[]) {
    const char *interface = "wlan0";
    const char *api_url = "http://127.0.0.1:8080";

    if (argc > 1) {
        interface = argv[1];
    }

    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);

    curl_global_init(CURL_GLOBAL_DEFAULT);

    if (sniffer_init(&sniffer, interface, api_url) != 0) {
        fprintf(stderr, "Failed to initialize sniffer\n");
        return 1;
    }

    printf("Starting Flux WiFi Sniffer on %s\n", interface);
    printf("Posting data to %s\n", api_url);

    if (sniffer_start(&sniffer) != 0) {
        fprintf(stderr, "Failed to start sniffer\n");
        sniffer_cleanup(&sniffer);
        return 1;
    }

    sniffer_cleanup(&sniffer);
    curl_global_cleanup();

    return 0;
}
