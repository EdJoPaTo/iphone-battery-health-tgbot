FROM docker.io/denoland/deno:latest AS builder
RUN apt-get update \
	&& apt-get upgrade -y \
	&& apt-get install -y unzip
WORKDIR /app
COPY . ./
# Deno regression doesnt work with --allow-net=api.telegram.org:443 currently and fails with `ENOTFOUND api.telegram.org` without showing permissions errors in the log.
RUN deno compile \
	--allow-env \
	--allow-net \
	--allow-read \
	--allow-run=git \
	--allow-write=data \
	iphone-battery-health-tgbot.ts


FROM docker.io/library/debian:trixie-slim AS final
RUN apt-get update \
	&& apt-get upgrade -y \
	&& apt-get install -y git \
	&& apt-get clean \
	&& rm -rf /var/lib/apt/lists/* /var/cache/* /var/log/*

WORKDIR /app
VOLUME /app/data

COPY gitconfig /root/.gitconfig
COPY known_hosts /root/.ssh/known_hosts

COPY --from=builder /app/iphone-battery-health-tgbot /usr/local/bin/
CMD ["iphone-battery-health-tgbot"]
