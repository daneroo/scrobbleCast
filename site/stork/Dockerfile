# FROM alpine:3
FROM ubuntu:20.04

# meant to be used as:
#  docker run --rm -it -v $(pwd)/data:/data stork

RUN apt-get update && apt-get install -y wget && \
  wget https://files.stork-search.net/releases/latest/stork-ubuntu-latest && \
  chmod +x stork-ubuntu-latest && \
  mkdir -p /data

WORKDIR /data

CMD /stork-ubuntu-latest --build config.toml