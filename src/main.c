#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <unistd.h>
#include "sniffer.h"
#include "database.h"

static sniffer_t sniffer;
static db_t db;

void signal_handler(int sig) {
    (void)sig;
    printf("\nShutting down...\n");
    sniffer_stop(&sniffer);
    db_close(&db);
    exit(0);
}

int main(int argc, char *argv[]) {
    const char *interface = "wlan0";
    const char *mongo_uri = "mongodb://127.0.0.1:27017/";

    if (argc > 1) {
        interface = argv[1];
    }

    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);

    mongoc_init();

    if (db_connect(&db, mongo_uri) != 0) {
        fprintf(stderr, "Database connection failed, continuing without DB\n");
    }

    if (sniffer_init(&sniffer, interface) != 0) {
        fprintf(stderr, "Failed to initialize sniffer\n");
        return 1;
    }

    printf("Starting Flux WiFi Sniffer on %s\n", interface);

    if (sniffer_start(&sniffer) != 0) {
        fprintf(stderr, "Failed to start sniffer\n");
        sniffer_cleanup(&sniffer);
        return 1;
    }

    sniffer_cleanup(&sniffer);
    db_close(&db);
    mongoc_cleanup();

    return 0;
}
