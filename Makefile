CC = gcc
CFLAGS = -Wall -Wextra -O2 -pthread
LDFLAGS = -lpcap -lcurl

TARGET = flux-sniffer
SRCS = src/main.c src/sniffer.c src/packet_handler.c src/http_client.c
OBJS = $(SRCS:.c=.o)

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(OBJS) $(TARGET)

.PHONY: all clean
