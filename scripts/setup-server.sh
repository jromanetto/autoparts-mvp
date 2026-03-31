#!/usr/bin/env bash
# Initial server setup for Hetzner Cloud CX21 (Ubuntu 24.04)
# Run this once on a fresh VM: ssh root@<IP> 'bash -s' < scripts/setup-server.sh
set -euo pipefail

DEPLOY_USER="deploy"

echo "==> Updating system"
apt-get update && apt-get upgrade -y

echo "==> Installing Docker"
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "==> Creating deploy user"
if ! id "$DEPLOY_USER" &>/dev/null; then
    adduser --disabled-password --gecos "" "$DEPLOY_USER"
    usermod -aG docker "$DEPLOY_USER"
    mkdir -p /home/$DEPLOY_USER/.ssh
    cp /root/.ssh/authorized_keys /home/$DEPLOY_USER/.ssh/
    chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
    chmod 700 /home/$DEPLOY_USER/.ssh
    chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys
fi

echo "==> Configuring firewall"
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Creating app directory"
mkdir -p /opt/autoparts
chown $DEPLOY_USER:$DEPLOY_USER /opt/autoparts

echo "==> Setting up automatic security updates"
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

echo "==> Done. Now:"
echo "  1. SSH as deploy: ssh deploy@<IP>"
echo "  2. Clone/copy the repo to /opt/autoparts"
echo "  3. Run: scripts/deploy.sh"
