#!/bin/bash
set -e

# Configure Apache port based on Render's $PORT environment variable
PORT="${PORT:-80}"
sed -i "s/<VirtualHost \*:80>/<VirtualHost \*:${PORT}>/g" /etc/apache2/sites-available/000-default.conf
echo "Configuring Apache to listen on port ${PORT}..."

# Fix storage permissions
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Generate application key if not set
if [ -z "$APP_KEY" ]; then
    echo "Generating application key..."
    php artisan key:generate --force
fi

# Link storage
php artisan storage:link || true

# Run database migrations in production
if [ "$RUN_MIGRATIONS" != "false" ]; then
    echo "Running database migrations..."
    php artisan migrate --force || true
    
    # Run seeder if curriculum flashcards are needed
    if [ "$RUN_SEEDER" = "true" ]; then
        echo "Running WikaPlaySeeder..."
        php artisan db:seed --class=WikaPlaySeeder --force || true
    fi
fi

# Cache production configuration & routes
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

echo "WikaPlay Laravel API is ready! Starting Apache server on port ${PORT}..."
exec "$@"
