# Deployment Guide: Anchor on Azure VM

This guide covers the steps to build, push, and deploy the Anchor application to an Azure VM running Ubuntu/Debian, using Docker Hub for private image hosting and Nginx as a reverse proxy.

## 1. Build and Push the Docker Image

First, build the Docker image locally and push it to your private Docker Hub repository.

```bash
# 1. Log in to Docker Hub
docker login

# 2. Build the image with your Docker Hub username
docker build -t ruchinmunjal/anchor:prod -f Dockerfile .

# 3. Push the image to Docker Hub
docker push ruchinmunjal/anchor:prod
```

_Note: Ensure your repository `ruchinmunjal/anchor` is set to **Private** in your Docker Hub repository settings._

## 2. Prepare the Azure VM

SSH into your Azure VM to set up the environment.

```bash
ssh user@your-vm-ip
```

### 2.1 Install Docker (if not already installed)

```bash
# Install Docker and Docker Compose plugin
sudo apt update
sudo apt install -y docker.io docker-compose-v2

# Add your user to the docker group (optional, avoids needing sudo for docker commands)
sudo usermod -aG docker $USER
newgrp docker
```

### 2.2 Set Up the Application Directory

```bash
# Create a directory for the application
sudo mkdir -p /opt/anchor
sudo chown $USER:$USER /opt/anchor
cd /opt/anchor
```

### 2.3 Transfer Files and Configure Environment

1. Copy your `docker-compose.prod.yml` to `/opt/anchor/docker-compose.prod.yml` on the VM.
2. Create the `.env.prod` file to securely pass environment variables at runtime:

   ```bash
   nano .env.prod
   ```
   _Add your production environment variables here. Example:_

   ```env
   NODE_ENV=production
   DATABASE_URL=postgresql://user:password@host:5432/db
   JWT_SECRET=your_super_secret_key
   ```
3. Secure the `.env.prod` file so only the owner can read/write it:

   ```bash
   chmod 600 .env.prod
   ```

## 3. Run the Application

Since the image is private, you must log in to Docker Hub on the VM before pulling.

```bash
# Log in to Docker Hub on the VM
docker login

#Alternatively for GHCR you can use
docker login ghcr.io -u ruchinmunjal -p <PATTOKEN>
# Pull the image and start the container in detached mode
docker compose -f docker-compose.prod.yml up -d
```

_Security Note: The `docker-compose.prod.yml` correctly binds port 7000 to `127.0.0.1` (`127.0.0.1:7000:3000`). This ensures the container is only accessible locally via the Nginx proxy and cannot be accessed directly from the internet._

## 4. Configure Nginx Reverse Proxy

Set up Nginx to route traffic from `notes.ruchinmunjal.dev` to your Docker container.

### 4.1 Create an Nginx Server Block

Create a new configuration file for your domain:

```bash
sudo nano /etc/nginx/sites-available/notes.ruchinmunjal.dev
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name notes.ruchinmunjal.dev;

    location / {
        proxy_pass http://127.0.0.1:7000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4.2 Enable the Site and Reload Nginx

```bash
# Enable the site by creating a symlink
sudo ln -s /etc/nginx/sites-available/notes.ruchinmunjal.dev /etc/nginx/sites-enabled/

# Test Nginx configuration for syntax errors
sudo nginx -t

# Reload Nginx to apply changes
sudo systemctl reload nginx
```

## 5. Secure with SSL (Certbot)

Use Let's Encrypt to provision a free SSL certificate and automatically configure Nginx to use HTTPS.

```bash
# Install Certbot and the Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# Obtain and install the SSL certificate
sudo certbot --nginx -d notes.ruchinmunjal.dev
```

Certbot will automatically modify your Nginx configuration to listen on port 443 (HTTPS) and set up a redirect from HTTP (port 80) to HTTPS.

## 6. Security Best Practices Checklist

- [x] **Private Docker Registry:** Images are stored privately on Docker Hub.
- [x] **Localhost Binding:** Docker port is bound to `127.0.0.1:7000`, preventing direct external access bypassing Nginx.
- [x] **Environment Variables:** Secrets are injected at runtime via `.env.prod` (which is secured with `chmod 600`).
- [x] **SSL/TLS:** Traffic is encrypted using Let's Encrypt certificates.
- [x] **Container Security:** The `docker-compose.prod.yml` drops all capabilities (`cap_drop: ALL`), adds only necessary ones, sets a read-only root filesystem, and limits resources (PIDs, memory, CPUs).
- [ ] **Firewall (UFW):** Ensure the VM's internal firewall only allows necessary ports (SSH, HTTP, HTTPS).
  ```bash
  sudo ufw allow OpenSSH
  sudo ufw allow 'Nginx Full'
  sudo ufw enable
  ```
- [x] **Azure NSG:** You confirmed that the Azure Network Security Group already has inbound rules for ports `80` (HTTP) and `443` (HTTPS). Ensure no other unnecessary ports are open to the internet.
