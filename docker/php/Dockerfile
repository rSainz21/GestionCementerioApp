FROM php:8.2-fpm-alpine

WORKDIR /var/www/html

RUN apk add --no-cache \
    bash \
    git \
    icu-dev \
    libpng-dev \
    libzip-dev \
    oniguruma-dev \
    sqlite \
    sqlite-dev \
    zip \
    unzip \
  && docker-php-ext-configure intl \
  && docker-php-ext-install -j$(nproc) \
    bcmath \
    intl \
    mbstring \
    pdo \
    pdo_mysql \
    pdo_sqlite \
    zip \
  && rm -rf /tmp/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

CMD ["php-fpm"]
