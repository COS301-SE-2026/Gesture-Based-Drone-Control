#!/usr/bin/env bash
# Runs ON the server after GitHub Actions has rsynced new files
# Installs backend deps if they changed and restarts the service
set -euo pipefail

APP=/opt/gbdc/app
VENV=/opt/gbdc/venv
REQ="$APP/apps/web_backend/requirements.txt"
STAMP="$VENV/.requirements.sha256"

NEW_HASH="$(sha256sum "$REQ" | cut -d' ' -f1)"
if [ ! -f "$STAMP" ] || [ "$(cat "$STAMP")" != "$NEW_HASH" ]; then
	echo "requirements changed, installing"
	"$VENV/bin/pip" install --quiet --upgrade pip
	"$VENV/bin/pip" install --quiet -r "$REQ"
	echo "$NEW_HASH" > "$STAMP"
fi

sudo /usr/bin/systemctl restart gbdc-web

# wait for it to come back
for _ in $(seq 1 20); do
	if curl -fsS http://127.0.0.1:3001/api/health >/dev/null; then
		echo "backend healthy"
		exit 0
	fi
	sleep 1
done
echo "backend did not become healthy" >&2
sudo /usr/bin/systemctl is-active gbdc-web || true
exit 1
