# Copy-Paste Commands for Anchor Migration

## 🚀 For Local Build (Windows PowerShell)

### Step 1: Sync Code
```powershell
cd D:\batcave\self-hosted-tools\anchor
git fetch origin
git checkout main
git log --oneline -5
```

### Step 2: Build Image
```powershell
docker build -t anchor:latest -f Dockerfile .
```

### Step 3: Verify Build
```powershell
docker images | Select-String anchor
docker run --rm anchor:latest node --version
```

### Step 4: Tag for GHCR
```powershell
docker tag anchor:latest ghcr.io/ruchinmunjal/anchor:latest
docker tag anchor:latest ghcr.io/ruchinmunjal/anchor:0.18.1
```

### Step 5: Login to GHCR
```powershell
# Replace <GITHUB_TOKEN> with your personal access token from https://github.com/settings/tokens
docker login ghcr.io -u ruchinmunjal -p <GITHUB_TOKEN>
```

### Step 6: Push to GHCR
```powershell
docker push ghcr.io/ruchinmunjal/anchor:latest
docker push ghcr.io/ruchinmunjal/anchor:0.18.1
```

---

## 🔧 For Azure VM Deployment (Bash via SSH)

### Setup: Connect to VM
```bash
# Replace with your actual VM IP
ssh user@your-vm-ip

# If using SSH key
ssh -i ~/.ssh/id_rsa user@your-vm-ip
```

### Step 1: Check Current State
```bash
cd /opt/anchor
docker ps --filter name=anchor --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
docker ps --filter name=anchor --format 'table {{.Status}}'
```

### Step 2: Record Database Counts (Before Migration)
```bash
docker exec anchor npm run prisma -- db execute --stdin <<< "SELECT COUNT(*) as users FROM \"User\";"
docker exec anchor npm run prisma -- db execute --stdin <<< "SELECT COUNT(*) as notes FROM \"Note\";"
```

### Step 3: Backup Docker Volume
```bash
# Single command to backup
docker run --rm -v anchor_data:/data -v $(pwd):/backup alpine tar czf /backup/anchor_data_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C / data/

# Verify backup created
ls -lh anchor_data_backup_*.tar.gz
```

### Step 4: Backup Environment
```bash
cp .env.prod .env.prod.backup
cat .env.prod
```

### Step 5: Stop Container
```bash
docker compose -f docker-compose.prod.yml down
```

### Step 6: Update docker-compose.prod.yml
```bash
# Option A: Using sed (automated)
sed -i 's|ghcr.io/ruchinmunjal/anchor:1.0.0|ghcr.io/ruchinmunjal/anchor:latest|g' docker-compose.prod.yml

# Option B: Manual edit
nano docker-compose.prod.yml
# Change: image: ghcr.io/ruchinmunjal/anchor:1.0.0
# To:     image: ghcr.io/ruchinmunjal/anchor:latest
# Save with: Ctrl+O, Enter, Ctrl+X
```

### Step 7: Pull New Image
```bash
docker pull ghcr.io/ruchinmunjal/anchor:latest
```

### Step 8: Start Container (This runs Prisma migrations)
```bash
docker compose -f docker-compose.prod.yml up -d
```

### Step 9: Monitor Startup (Wait 1-2 minutes)
```bash
# Follow logs in real-time
docker logs -f anchor

# Press Ctrl+C when you see: "Nest application successfully started"
```

### Step 10: Verify Health
```bash
# Check container status
docker ps --filter name=anchor --format 'table {{.Names}}\t{{.Status}}'

# Should show: "healthy"

# Test health endpoint
curl http://127.0.0.1:3000/api/health
```

### Step 11: Verify Data Integrity
```bash
# Count records (should match Step 2)
docker exec anchor npm run prisma -- db execute --stdin <<< "SELECT COUNT(*) as users FROM \"User\";"
docker exec anchor npm run prisma -- db execute --stdin <<< "SELECT COUNT(*) as notes FROM \"Note\";"

# View sample data
docker exec anchor npm run prisma -- db execute --stdin <<< "SELECT email, name, createdAt FROM \"User\" LIMIT 5;"
```

### Step 12: Check Logs
```bash
# Last 50 lines
docker logs anchor | tail -50

# Search for errors
docker logs anchor | grep -i error

# Full logs
docker logs anchor
```

### Step 13: Verify via Web
```bash
# From your laptop/desktop, visit:
https://notes.ruchinmunjal.dev/api/health

# Should return: {"status":"ok"}
```

---

## 🔙 If You Need to Rollback (Use Only If Something Went Wrong)

### Revert to Old Image
```bash
# Stop current container
docker compose -f docker-compose.prod.yml down

# Update compose file back
sed -i 's|ghcr.io/ruchinmunjal/anchor:latest|ghcr.io/ruchinmunjal/anchor:1.0.0|g' docker-compose.prod.yml

# Pull old image
docker pull ghcr.io/ruchinmunjal/anchor:1.0.0

# Restart
docker compose -f docker-compose.prod.yml up -d

# Verify
docker ps --filter name=anchor
curl https://notes.ruchinmunjal.dev/api/health
```

---

## 🆘 Troubleshooting Commands

### View Logs (Most Important!)
```bash
# Real-time logs
docker logs -f anchor

# Last 100 lines
docker logs anchor | tail -100

# Search for specific errors
docker logs anchor | grep -i "prisma\|error\|fail"
```

### Check Database Connection
```bash
# View database URL
docker exec anchor env | grep DATABASE_URL

# Test connection
docker exec anchor npm run prisma -- db execute --stdin <<< "SELECT NOW();"
```

### Check Container Info
```bash
# Full container details
docker inspect anchor

# Resource usage
docker stats anchor

# Network settings
docker inspect anchor | grep -A 10 "Networks"
```

### Check Volume Status
```bash
# List volumes
docker volume ls | grep anchor

# Inspect volume
docker volume inspect anchor_data

# View volume contents
docker run --rm -v anchor_data:/data alpine ls -la /data/
```

### Force Restart Container
```bash
# Stop forcefully
docker kill anchor

# Or restart
docker restart anchor

# Monitor after restart
docker logs -f anchor
```

### Reset Permissions (If Needed)
```bash
# Fix volume permissions
docker exec anchor chown -R node:node /data
docker exec anchor chmod -R 755 /data
```

---

## 📊 Verification Commands

### All-In-One Health Check
```bash
# Run all checks in sequence
echo "=== Container Status ===" && \
docker ps --filter name=anchor --format 'table {{.Names}}\t{{.Status}}' && \
echo && echo "=== Health Endpoint ===" && \
curl -s http://127.0.0.1:3000/api/health | head -20 && \
echo && echo "=== User Count ===" && \
docker exec anchor npm run prisma -- db execute --stdin <<< "SELECT COUNT(*) as users FROM \"User\";" && \
echo && echo "=== Note Count ===" && \
docker exec anchor npm run prisma -- db execute --stdin <<< "SELECT COUNT(*) as notes FROM \"Note\";" && \
echo && echo "=== Recent Logs ===" && \
docker logs anchor | tail -10
```

### Check Migration Status
```bash
docker exec anchor npm run prisma -- migrate status
```

### List Running Processes in Container
```bash
docker exec anchor ps aux
```

---

## 🧹 Cleanup (After Confirmed Success - 24+ Hours Later)

### Remove Old Image (Once Confirmed Stable)
```bash
docker rmi ghcr.io/ruchinmunjal/anchor:1.0.0
```

### Remove Old Backups (After 7 Days)
```bash
# List backups
ls -lh anchor_data_backup_*.tar.gz
anchor_db_backup_*.sql

# Delete old backups (keep recent ones)
rm anchor_data_backup_*.tar.gz
rm anchor_db_backup_*.sql
```

### Clean Docker System (Optional)
```bash
# Remove dangling images/volumes
docker system prune

# Remove all unused images
docker image prune -a
```

---

## 📝 Notes

- Replace `your-vm-ip` with actual IP address
- Replace `<GITHUB_TOKEN>` with actual token from https://github.com/settings/tokens
- All Neon database operations are managed by Neon (no additional setup needed)
- The `/data` volume is automatically managed by Docker
- Keep backups for at least 7 days

---

## 🎯 Success Criteria Checklist

After running all commands:

```bash
# All of these should succeed:

# 1. Container is running
docker ps --filter name=anchor | grep "Up"

# 2. Health check passes
curl -s http://127.0.0.1:3000/api/health | grep -q "ok"

# 3. Database has users
docker exec anchor npm run prisma -- db execute --stdin <<< "SELECT COUNT(*) FROM \"User\";" | grep -q "[0-9]"

# 4. No critical errors in logs
! docker logs anchor | grep -i "critical\|fatal\|panic"

# 5. App accessible via web
curl -s https://notes.ruchinmunjal.dev/api/health | grep -q "ok"
```

If any check fails, review the troubleshooting section or the DATA_PRESERVATION_STRATEGY.md for detailed recovery steps.

---

Good luck! You've got this! 🚀
