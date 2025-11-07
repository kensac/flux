#ifndef PACKET_HANDLER_H
#define PACKET_HANDLER_H

#include <pcap.h>
#include "sniffer.h"
#include "database.h"

void packet_handler(u_char *args, const struct pcap_pkthdr *header, const u_char *packet);

typedef struct {
    sniffer_t *sniffer;
    db_t *db;
} handler_context_t;

#endif
