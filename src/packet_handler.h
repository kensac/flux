#ifndef PACKET_HANDLER_H
#define PACKET_HANDLER_H

#include <pcap.h>
#include "sniffer.h"

void packet_handler(u_char *args, const struct pcap_pkthdr *header, const u_char *packet);

#endif
