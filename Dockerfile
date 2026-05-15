FROM docker.io/denoland/deno:latest AS builder
RUN apt-get update \
	&& apt-get upgrade -y \
	&& apt-get install -y unzip
WORKDIR /app
COPY . ./
RUN deno compile \
	--allow-env \
	--allow-net=api.telegram.org \
	--allow-read \
	--allow-run=git,gnuplot \
	--allow-write=data,/tmp \
	iphone-battery-health-tgbot.ts


FROM docker.io/library/debian:trixie-slim AS final
RUN apt-get update \
	&& apt-get upgrade -y \
	&& apt-get install -y git \
	&& apt-get install -y --no-install-recommends gnuplot \
	&& apt-get clean \
	&& groupadd --system --gid 923 runner \
	&& useradd --system --uid 923 --gid 923 --create-home runner \
	&& rm -rf /etc/*- /var/lib/apt/lists/* /var/cache/* /var/log/*

WORKDIR /app
VOLUME /app/data

COPY --chown=runner gitconfig /home/runner/.gitconfig
COPY --chown=runner known_hosts /home/runner/.ssh/known_hosts
COPY *.gnuplot ./

COPY --from=builder /app/iphone-battery-health-tgbot /usr/local/bin/

USER runner
CMD ["iphone-battery-health-tgbot"]
