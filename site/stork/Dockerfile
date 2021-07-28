# FROM alpine:3
# FROM ubuntu:20.04 / is now broken (libssl.so.1.0.0: cannot open shared object file: No such file or directory)
FROM ubuntu:16.04

# meant to be used as:
#  docker build -t stork stork/  # once only
#  docker run --rm -it -v $(pwd)/data:/data stork

RUN apt-get update && apt-get install -y wget && \
  wget https://files.stork-search.net/releases/latest/stork-ubuntu-16-04 && \
  chmod +x stork-ubuntu-16-04 && \
  mkdir -p /data

WORKDIR /data

CMD /stork-ubuntu-16-04 build --input config.toml --output scrobblecast.st
