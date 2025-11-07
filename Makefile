CC = gcc
CFLAGS = -Wall -Wextra -O2 -pthread
LDFLAGS = -lpcap -lmongoc-1.0 -lbson-1.0
INCLUDES = -I/usr/include/libmongoc-1.0 -I/usr/include/libbson-1.0

TARGET = flux
SRCS = src/main.c src/sniffer.c src/packet_handler.c src/database.c
OBJS = $(SRCS:.c=.o)

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

%.o: %.c
	$(CC) $(CFLAGS) $(INCLUDES) -c $< -o $@

clean:
	rm -f $(OBJS) $(TARGET)

.PHONY: all clean
