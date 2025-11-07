FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    libpcap-dev \
    libcurl4-openssl-dev \
    wireless-tools \
    iw \
    wget \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY scripts/ ./scripts/
COPY src/ ./src/
COPY Makefile .

RUN wget -O /tmp/oui.txt https://standards-oui.ieee.org/oui/oui.txt && \
    python3 scripts/generate_oui.py /tmp/oui.txt src/oui.c && \
    rm /tmp/oui.txt

RUN make clean || true && make -B && ls -la && test -f flux-sniffer

CMD ["./flux-sniffer", "wlx24ec998bf0ce"]
