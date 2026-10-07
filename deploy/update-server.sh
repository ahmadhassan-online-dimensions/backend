#!/usr/bin/env bash
# Update ONLY this backend on the server. Run it on the server as root (or the app's user):
#
#   APP_DIR=/var/www/jewellery-backend PM2_NAME=jewellery-api bash update-server.sh
#
# It touches nothing outside APP_DIR and never restarts other pm2 apps, nginx or apache.
set -euo pipefail

: "${APP_DIR:?Set APP_DIR to this backend's folder, e.g. /var/www/jewellery-backend}"
: "${PM2_NAME:?Set PM2_NAME to this backend's pm2 name (see: pm2 list)}"

cd "$APP_DIR"
echo "==> Updating $APP_DIR (pm2 app: $PM2_NAME)"

# 1. backup: code + .env, in a dated folder next to the app
BACKUP="$APP_DIR.backup.$(date +%F-%H%M)"
echo "==> Backup -> $BACKUP"
cp -a "$APP_DIR" "$BACKUP"

# 2. new code
echo "==> Pulling latest code"
git pull --ff-only

echo "==> Installing dependencies"
npm ci --omit=dev

# 3. .env sanity check (names only, secrets are never printed)
echo "==> Checking .env"
need=(PORT MONGOURL JWT_SECRET TWOCHECKOUT_MERCHANT_CODE TWOCHECKOUT_BUYLINK_SECRET
      TWOCHECKOUT_SECRET_KEY TWOCHECKOUT_CODE_MODEL_01 TWOCHECKOUT_CODE_MODEL_02
      PAYMENT_CURRENCY PAYMENT_RETURN_URL)
bad=0
for k in "${need[@]}"; do
  n=$(grep -c "^${k}=" .env || true)
  v=$(grep "^${k}=" .env | tail -1 | cut -d= -f2- || true)
  if [ "$n" -eq 0 ];  then echo "   MISSING  $k"; bad=1
  elif [ "$n" -gt 1 ]; then echo "   DUPLICATE $k (appears $n times)"; bad=1
  elif [ -z "$v" ];    then echo "   EMPTY    $k"; bad=1
  else echo "   ok       $k"; fi
done
if [ "$bad" -eq 1 ]; then
  echo "!! Fix .env first (nano $APP_DIR/.env), then run this script again."
  echo "!! Nothing was restarted. Backup is at $BACKUP"
  exit 1
fi

# 4. store the 2Checkout product codes on the products
echo "==> Saving product codes"
npm run seed

# 5. restart only this app
echo "==> Restarting $PM2_NAME"
pm2 restart "$PM2_NAME" --update-env
sleep 3

# 6. health check on the app's own port
PORT=$(grep "^PORT=" .env | cut -d= -f2-)
if curl -fsS "http://127.0.0.1:${PORT}/api/health" >/dev/null; then
  echo "==> OK: backend answers on port $PORT"
else
  echo "!! Backend did not answer. Last logs:"; pm2 logs "$PM2_NAME" --lines 30 --nostream
  echo "!! Roll back with:  rm -rf $APP_DIR && mv $BACKUP $APP_DIR && pm2 restart $PM2_NAME"
  exit 1
fi
echo "==> Done. Other sites and pm2 apps were not touched."
