#include "database.h"
#include <stdio.h>
#include <string.h>
#include <bson/bson.h>

int db_connect(db_t *db, const char *uri) {
    bson_error_t error;

    db->client = mongoc_client_new(uri);
    if (!db->client) {
        fprintf(stderr, "Failed to create MongoDB client\n");
        return -1;
    }

    if (!mongoc_client_get_server_status(db->client, NULL, NULL, &error)) {
        fprintf(stderr, "Failed to connect to MongoDB: %s\n", error.message);
        mongoc_client_destroy(db->client);
        return -1;
    }

    mongoc_database_t *database = mongoc_client_get_database(db->client, "flux");
    db->devices = mongoc_database_get_collection(database, "devices");
    db->access_points = mongoc_database_get_collection(database, "access_points");
    mongoc_database_destroy(database);

    printf("Connected to MongoDB\n");
    return 0;
}

void db_upsert_device(db_t *db, const device_t *device) {
    if (!db->devices) return;

    bson_t *query = BCON_NEW("mac_address", BCON_UTF8(
        bson_strdup_printf("%02x:%02x:%02x:%02x:%02x:%02x",
                          device->mac[0], device->mac[1], device->mac[2],
                          device->mac[3], device->mac[4], device->mac[5])));

    bson_t *update = BCON_NEW(
        "$set", "{",
            "last_seen", BCON_DATE_TIME(device->last_seen * 1000),
            "rssi", BCON_INT32(device->rssi),
        "}",
        "$setOnInsert", "{",
            "first_seen", BCON_DATE_TIME(device->first_seen * 1000),
        "}",
        "$inc", "{",
            "packet_count", BCON_INT32(device->packet_count),
        "}"
    );

    bson_t opts = BSON_INITIALIZER;
    BSON_APPEND_BOOL(&opts, "upsert", true);

    bson_error_t error;
    if (!mongoc_collection_update_one(db->devices, query, update, &opts, NULL, &error)) {
        fprintf(stderr, "Failed to upsert device: %s\n", error.message);
    }

    bson_destroy(query);
    bson_destroy(update);
    bson_destroy(&opts);
}

void db_upsert_ap(db_t *db, const ap_t *ap) {
    if (!db->access_points) return;

    bson_t *query = BCON_NEW("bssid", BCON_UTF8(
        bson_strdup_printf("%02x:%02x:%02x:%02x:%02x:%02x",
                          ap->bssid[0], ap->bssid[1], ap->bssid[2],
                          ap->bssid[3], ap->bssid[4], ap->bssid[5])));

    bson_t *update = BCON_NEW(
        "$set", "{",
            "ssid", BCON_UTF8(ap->ssid),
            "channel", BCON_INT32(ap->channel),
            "last_seen", BCON_DATE_TIME(ap->last_seen * 1000),
            "rssi", BCON_INT32(ap->rssi),
        "}",
        "$setOnInsert", "{",
            "first_seen", BCON_DATE_TIME(ap->first_seen * 1000),
        "}",
        "$inc", "{",
            "beacon_count", BCON_INT32(ap->beacon_count),
        "}"
    );

    bson_t opts = BSON_INITIALIZER;
    BSON_APPEND_BOOL(&opts, "upsert", true);

    bson_error_t error;
    if (!mongoc_collection_update_one(db->access_points, query, update, &opts, NULL, &error)) {
        fprintf(stderr, "Failed to upsert AP: %s\n", error.message);
    }

    bson_destroy(query);
    bson_destroy(update);
    bson_destroy(&opts);
}

void db_close(db_t *db) {
    if (db->devices) {
        mongoc_collection_destroy(db->devices);
        db->devices = NULL;
    }
    if (db->access_points) {
        mongoc_collection_destroy(db->access_points);
        db->access_points = NULL;
    }
    if (db->client) {
        mongoc_client_destroy(db->client);
        db->client = NULL;
    }
}
