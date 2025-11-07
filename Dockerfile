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

COPY Makefile .
COPY src/ ./src/

RUN make

CMD ["./flux"]
