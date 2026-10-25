#!/bin/bash
set -e

# Configure Apache port based on Render's $PORT environment variable (default: 80)
PORT="${PORT:-80}"
echo "Configuring Apache to listen on port ${PORT}..."
echo "Listen ${PORT}" > /etc/apache2/ports.conf
sed -i -E "s/<VirtualHost \*:[0-9]+>/<VirtualHost \*:${PORT}>/g" /etc/apache2/sites-available/*.conf

# Fix storage permissions
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Generate application key if not set
if [ -z "$APP_KEY" ]; then
    if [ ! -f /var/www/html/.env ]; then
        touch /var/www/html/.env
    fi
    echo "Warning: APP_KEY not provided in environment variables. Generating temporary key..."
    php artisan key:generate --force
fi

# Link storage
php artisan storage:link || true

# Run database migrations in production
if [ "$RUN_MIGRATIONS" != "false" ]; then
    echo "Running database migrations..."
    php artisan migrate --force || true
    
    # Run seeder if enabled
    if [ "$RUN_SEEDER" = "true" ]; then
        echo "Running WikaPlaySeeder..."
        php artisan db:seed --class=WikaPlaySeeder --force || true
        echo "Running CollectiblesSeeder..."
        php artisan db:seed --class=CollectiblesSeeder --force || true
    fi
fi

# Cache production configuration & routes
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

echo "WikaPlay Laravel API is ready! Starting Apache server on port ${PORT}..."
exec "$@"
