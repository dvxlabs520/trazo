#!/usr/bin/env bash
# Sube el código al servidor y reconstruye el contenedor.
# Uso: DEPLOY_HOST=mi-servidor TRAZO_HOST=trazo.midominio.com ./deploy.sh
#   DEPLOY_HOST  alias SSH del servidor (por defecto: goldencup)
#   DEPLOY_DIR   carpeta en el servidor (por defecto: /opt/trazo)
#   TRAZO_HOST   dominio público; solo hace falta la primera vez (queda guardado en .env del servidor)
set -euo pipefail
HOST="${DEPLOY_HOST:-goldencup}"
DIR="${DEPLOY_DIR:-/opt/trazo}"
cd "$(dirname "$0")"

# one shared SSH connection: servers that rate-limit SSH would refuse the 2nd/3rd login otherwise
SSH_OPTS="-o ControlMaster=auto -o ControlPath=/tmp/trazo-ssh-%r@%h-%p -o ControlPersist=60 -o ConnectTimeout=15"
ssh $SSH_OPTS "$HOST" "mkdir -p $DIR"
rsync -az --delete -e "ssh $SSH_OPTS" \
  --exclude node_modules --exclude dist --exclude data --exclude .git \
  --exclude .env --exclude .taste-skill --exclude .DS_Store --exclude docs \
  ./ "$HOST:$DIR/"

ssh $SSH_OPTS "$HOST" bash -s <<EOS
set -e
cd $DIR
if [ ! -f .env ]; then
  echo "TEAM_CODE=trazo-\$(openssl rand -hex 3)" > .env
  echo "SECRET=\$(openssl rand -hex 32)" >> .env
  chmod 600 .env
  echo ".env creado con un código de equipo nuevo"
fi
NEW_HOST="${TRAZO_HOST:-}"
if ! grep -q '^TRAZO_HOST=' .env; then
  if [ -z "\$NEW_HOST" ]; then echo "Falta TRAZO_HOST (ej: TRAZO_HOST=trazo.midominio.com ./deploy.sh)"; exit 1; fi
  echo "TRAZO_HOST=\$NEW_HOST" >> .env
fi
docker compose up -d --build
docker image prune -f >/dev/null
docker compose ps
EOS
