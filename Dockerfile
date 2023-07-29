FROM php:5-alpine


RUN --mount=type=cache,target=/var/cache/apk \
    sed -i 's/dl-cdn.alpinelinux.org/mirrors.cloud.tencent.com/g' /etc/apk/repositories \
    && apk add openssl curl

WORKDIR /app
COPY --link . .

ENTRYPOINT [ "php" ]

CMD [ "-S", "0.0.0.0:1000" ]