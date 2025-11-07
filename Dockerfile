FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    libpcap-dev \
    libmongoc-dev \
    libbson-dev \
    wireless-tools \
    iw \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY src/ ./src/
COPY Makefile .

RUN make clean || true && make -B && ls -la && test -f flux

CMD ["./flux", "wlan0"]
