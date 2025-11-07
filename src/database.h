#ifndef DATABASE_H
#define DATABASE_H

#include <mongoc/mongoc.h>
#include "sniffer.h"

typedef struct {
    mongoc_client_t *client;
    mongoc_collection_t *devices;
    mongoc_collection_t *access_points;
} db_t;

int db_connect(db_t *db, const char *uri);
void db_upsert_device(db_t *db, const device_t *device);
void db_upsert_ap(db_t *db, const ap_t *ap);
void db_close(db_t *db);

#endif
