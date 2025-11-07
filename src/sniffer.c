#include "sniffer.h"
#include "packet_handler.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <pthread.h>
#include <sys/wait.h>
#include <sys/stat.h>
#include <time.h>
#include <curl/curl.h>

static void set_channel(const char *interface, int channel) {
    char cmd[256];
    snprintf(cmd, sizeof(cmd), "iw dev %s set channel %d 2>/dev/null", interface, channel);
    system(cmd);
}

// Buffer to store API response
struct curl_response {
    char *data;
    size_t size;
};

static size_t curl_write_callback(void *contents, size_t size, size_t nmemb, void *userp) {
    size_t realsize = size * nmemb;
    struct curl_response *mem = (struct curl_response *)userp;

    char *ptr = realloc(mem->data, mem->size + realsize + 1);
    if (!ptr) {
        fprintf(stderr, "Not enough memory for config response\n");
        return 0;
    }

    mem->data = ptr;
    memcpy(&(mem->data[mem->size]), contents, realsize);
    mem->size += realsize;
    mem->data[mem->size] = 0;

    return realsize;
}

// Read channel hopping config from API
static void read_config(sniffer_t *sniffer) {
    CURL *curl = curl_easy_init();
    if (!curl) {
        fprintf(stderr, "Failed to init curl for config fetch\n");
        sniffer->hopping_enabled = true;
        sniffer->hopping_timeout_ms = 300;
        return;
    }

    char url[512];
    snprintf(url, sizeof(url), "%s/config/channel-hopping", sniffer->api_url);

    struct curl_response response = {0};

    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, curl_write_callback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)&response);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 5L);

    CURLcode res = curl_easy_perform(curl);

    if (res != CURLE_OK) {
        // Use defaults on error
        sniffer->hopping_enabled = true;
        sniffer->hopping_timeout_ms = 300;
        curl_easy_cleanup(curl);
        if (response.data) free(response.data);
        return;
    }

    // Simple JSON parsing - look for "enabled" and "timeout_ms" fields
    if (response.data) {
        char *enabled_ptr = strstr(response.data, "\"enabled\":");
        if (enabled_ptr) {
            enabled_ptr += 10; // Skip past "enabled":
            while (*enabled_ptr == ' ') enabled_ptr++;
            sniffer->hopping_enabled = (strncmp(enabled_ptr, "true", 4) == 0);
        }

        char *timeout_ptr = strstr(response.data, "\"timeout_ms\":");
        if (timeout_ptr) {
            timeout_ptr += 13; // Skip past "timeout_ms":
            sniffer->hopping_timeout_ms = atoi(timeout_ptr);
            if (sniffer->hopping_timeout_ms < 50) sniffer->hopping_timeout_ms = 50;
            if (sniffer->hopping_timeout_ms > 10000) sniffer->hopping_timeout_ms = 10000;
        }

        free(response.data);
    }

    curl_easy_cleanup(curl);
}

static void* channel_hopper(void *arg) {
    sniffer_t *sniffer = (sniffer_t *)arg;
    int channels[] = {1, 6, 11, 2, 7, 3, 8, 4, 9, 5, 10};
    int num_channels = sizeof(channels) / sizeof(channels[0]);
    int idx = 0;
    time_t last_config_check = 0;

    printf("Channel hopping thread started\n");

    while (sniffer->running) {
        // Check config every 5 seconds
        time_t now = time(NULL);
        if (now - last_config_check >= 5) {
            read_config(sniffer);
            last_config_check = now;
        }

        // Only hop if enabled
        if (sniffer->hopping_enabled) {
            set_channel(sniffer->interface, channels[idx]);
            idx = (idx + 1) % num_channels;
        }

        // Use configured timeout (convert ms to microseconds)
        usleep(sniffer->hopping_timeout_ms * 1000);
    }

    return NULL;
}

int sniffer_init(sniffer_t *sniffer, const char *interface, const char *api_url) {
    char errbuf[PCAP_ERRBUF_SIZE];

    memset(sniffer, 0, sizeof(sniffer_t));
    strncpy(sniffer->interface, interface, sizeof(sniffer->interface) - 1);
    strncpy(sniffer->api_url, api_url, sizeof(sniffer->api_url) - 1);

    // Load initial channel hopping configuration
    read_config(sniffer);
    printf("Channel hopping: %s, timeout: %dms\n",
           sniffer->hopping_enabled ? "enabled" : "disabled",
           sniffer->hopping_timeout_ms);

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
