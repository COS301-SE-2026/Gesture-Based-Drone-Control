#!/usr/bin/env bash
# One-time setup for Ubuntu 24.04 EC2 instance
#
#   scp -i key.pem infrastructure/aws/{setup.sh,Caddyfile,gbdc-web.service} ubuntu@<ip>:~
#   ssh -i key.pem ubuntu@<ip> 'sudo bash setup.sh demo.yourdomain.co.za "<deploy public key>"'
#
# Safe to re-run.
set -euo pipefail

DOMAIN="${1:?usage: setup.sh <domain> \"<github actions deploy public key>\"}"
DEPLOY_PUBKEY="${2:?usage: setup.sh <domain> \"<github actions deploy public key>\"}"
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "==> packages"
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
DEBIAN_FRONTEND=noninteractive apt-get install -y \
	python3 python3-venv rsync curl debian-keyring debian-archive-keyring \
	apt-transport-https gnupg unattended-upgrades

echo "==> caddy (official repo)"
if ! command -v caddy >/dev/null; then
	curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
		| gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
	curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
		> /etc/apt/sources.list.d/caddy-stable.list
	apt-get update -y
	apt-get install -y caddy
fi

echo "==> 1 GB swap (cheap insurance on a 1 GB instance)"
if [ ! -f /swapfile ]; then
	fallocate -l 1G /swapfile
	chmod 600 /swapfile
	mkswap /swapfile
	swapon /swapfile
	echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> cap log sizes so the small disk never fills up"
mkdir -p /etc/systemd/journald.conf.d
printf '[Journal]\nSystemMaxUse=100M\n' > /etc/systemd/journald.conf.d/size.conf
systemctl restart systemd-journald

echo "==> user + directories"
id gbdc >/dev/null 2>&1 || useradd --create-home --shell /bin/bash gbdc
mkdir -p /opt/gbdc/app /opt/gbdc/web /home/gbdc/.ssh
chown -R gbdc:gbdc /opt/gbdc
grep -qxF "$DEPLOY_PUBKEY" /home/gbdc/.ssh/authorized_keys 2>/dev/null \
	|| echo "$DEPLOY_PUBKEY" >> /home/gbdc/.ssh/authorized_keys
chown -R gbdc:gbdc /home/gbdc/.ssh
chmod 700 /home/gbdc/.ssh
chmod 600 /home/gbdc/.ssh/authorized_keys

# the deploy user may only restart the demo service, nothing else
cat > /etc/sudoers.d/gbdc <<'SUDO'
gbdc ALL=(root) NOPASSWD: /usr/bin/systemctl restart gbdc-web, /usr/bin/systemctl is-active gbdc-web
SUDO
chmod 440 /etc/sudoers.d/gbdc

echo "==> python venv"
[ -d /opt/gbdc/venv ] || sudo -u gbdc python3 -m venv /opt/gbdc/venv

echo "==> ssh: keys only"
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload ssh || true

echo "==> services"
install -m 644 "$HERE/gbdc-web.service" /etc/systemd/system/gbdc-web.service
sed "s/__DOMAIN__/${DOMAIN}/" "$HERE/Caddyfile" > /etc/caddy/Caddyfile
mkdir -p /var/log/caddy && chown caddy:caddy /var/log/caddy
systemctl daemon-reload
systemctl enable gbdc-web caddy
systemctl restart caddy

echo
echo "Done. Now push to main (or run the 'Deploy Web Demo' workflow manually)"
echo "to upload the app. Caddy will fetch the HTTPS certificate for ${DOMAIN}"
echo "automatically once your DNS A record points at this instance."
