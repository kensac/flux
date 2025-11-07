#include "http_client.h"
#include <curl/curl.h>
#include <stdio.h>
#include <string.h>

static size_t write_callback(void *contents, size_t size, size_t nmemb, void *userp) {
    return size * nmemb;
}

void http_post_device(const char *api_url, const uint8_t *mac, int rssi) {
    CURL *curl = curl_easy_init();
    if (!curl) {
        fprintf(stderr, "Failed to init curl\n");
        return;
    }

    char url[256];
    snprintf(url, sizeof(url), "%s/ingest/device", api_url);

    char json[256];
    snprintf(json, sizeof(json),
             "{\"mac_address\":\"%02x:%02x:%02x:%02x:%02x:%02x\",\"rssi\":%d}",
             mac[0], mac[1], mac[2], mac[3], mac[4], mac[5], rssi);

    struct curl_slist *headers = NULL;
    headers = curl_slist_append(headers, "Content-Type: application/json");

    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, json);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 2L);

    CURLcode res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        static int error_count = 0;
        if (error_count < 5) {
            fprintf(stderr, "Device POST failed: %s\n", curl_easy_strerror(res));
            error_count++;
        }
    }

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
}

void http_post_ap(const char *api_url, const uint8_t *bssid, const char *ssid, int channel, int rssi) {
    CURL *curl = curl_easy_init();
    if (!curl) {
        fprintf(stderr, "Failed to init curl\n");
        return;
    }

    char url[256];
    snprintf(url, sizeof(url), "%s/ingest/access-point", api_url);

    char json[512];
    snprintf(json, sizeof(json),
             "{\"bssid\":\"%02x:%02x:%02x:%02x:%02x:%02x\",\"ssid\":\"%s\",\"channel\":%d,\"rssi\":%d}",
             bssid[0], bssid[1], bssid[2], bssid[3], bssid[4], bssid[5],
             ssid ? ssid : "", channel, rssi);

    struct curl_slist *headers = NULL;
    headers = curl_slist_append(headers, "Content-Type: application/json");

    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, json);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 2L);

    CURLcode res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        static int error_count = 0;
        if (error_count < 5) {
            fprintf(stderr, "AP POST failed: %s\n", curl_easy_strerror(res));
            error_count++;
        }
    }

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
}
