in zsh at 00:01:57
# Nginx & SSL Setup for Anchor

## Overview

- **Domain:** notes.ruchinmunjal.dev
- **Container:** anchor (image: `ghcr.io/ruchinmunjal/anchor:1.0.0`)
- **Container port mapping:** `127.0.0.1:7000 -> 3000`
- **SSL:** Let's Encrypt via Certbot (expires 2026-05-24, auto-renews)

## Steps Taken

### 1. Created Nginx site config

Created `/etc/nginx/sites-available/anchor` with a reverse proxy to `127.0.0.1:7000`, including WebSocket support for `/socket.io/` and `/collab` paths.

```nginx
server {
    server_name notes.ruchinmunjal.dev;

    location / {
        proxy_pass http://127.0.0.1:7000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://127.0.0.1:7000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_buffering off;
    }

    location /collab {
        proxy_pass http://127.0.0.1:7000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 86400;
    }
}
```

### 2. Enabled the site

```bash
sudo ln -sf /etc/nginx/sites-available/anchor /etc/nginx/sites-enabled/anchor
```

### 3. Tested and reloaded Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Created DNS A record

Added an A record for `notes` pointing to `20.77.24.244` in the DNS provider for `ruchinmunjal.dev`.

### 5. Obtained SSL certificate with Certbot

```bash
sudo certbot --nginx -d notes.ruchinmunjal.dev --non-interactive --agree-tos --redirect
```

Certbot automatically:
- Obtained a Let's Encrypt SSL certificate
- Updated the Nginx config to listen on port 443 with SSL
- Added HTTP-to-HTTPS redirect (port 80 → 443)
- Set up automatic certificate renewal

### SSL Certificate Details

- **Certificate:** `/etc/letsencrypt/live/notes.ruchinmunjal.dev/fullchain.pem`
- **Private key:** `/etc/letsencrypt/live/notes.ruchinmunjal.dev/privkey.pem`
- **Expires:** 2026-05-24 (auto-renews via Certbot timer)

## Result

The site is live at **https://notes.ruchinmunjal.dev** with SSL and automatic HTTP→HTTPS redirect.