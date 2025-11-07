#ifndef HTTP_CLIENT_H
#define HTTP_CLIENT_H

#include <stdint.h>

void http_post_device(const char *api_url, const uint8_t *mac, int rssi);
void http_post_ap(const char *api_url, const uint8_t *bssid, const char *ssid, int channel, int rssi);

#endif
