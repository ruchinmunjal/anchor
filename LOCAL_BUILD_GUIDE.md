# Step-by-Step Migration for Local Development

This guide will help you build and test the new image locally before pushing to production.

## Step 1: Sync Your Fork with Main

```powershell
cd D:\batcave\self-hosted-tools\anchor

# Fetch latest from origin
git fetch origin

# Switch to main branch (or create new branch from main)
git checkout main

# Verify you're on main
git branch -a
git log --oneline -5
```

**Expected Output:**
- Latest commit should match `origin/main`
- Should see recent commits like "docs: add issue forms" and version bumps

## Step 2: Review Key Differences

The main changes from your fork (v0.9.1) to main (v0.18.1):

### Code Changes
- **Dockerfile:** Node 24 (vs 26), pnpm 9 via corepack (vs direct install)
- **Dependencies:** Likely newer versions of @nestjs/*, Prisma, etc.
- **Features:** Support for attachments, improved mobile sync
- **Migrations:** 15+ instead of 12 (new: add_note_attachments, etc.)

### Database Schema Changes
Your fork removed these tables (now in main):
- `NoteAttachment` - file uploads
- `NotePin`, `NoteArchive` - deprecated features (now simple boolean flags)
- `NoteReminder`, `NoteRevision`, `SyncState`, `ChangeLog` - sync/versioning features

**Main's approach is simpler:**
- `isPinned`, `isArchived` boolean fields instead of separate tables
- No complex sync/versioning system
- Focus on core features

## Step 3: Build Local Docker Image

```powershell
# From repo root
cd D:\batcave\self-hosted-tools\anchor

# Build the image
docker build -t anchor:latest -f Dockerfile .

# Monitor the build
# This will:
# - Build server & web
# - Install dependencies
# - Compile TypeScript
# - Build Next.js app
# - Create runtime image with Postgres + Node

# Expected time: 5-10 minutes on first build
```

**If build fails:**
- Check error message for missing dependencies
- Ensure Docker Desktop is running
- Try: `docker system prune` to free space

## Step 4: Run Locally (Optional - For Testing)

```powershell
# Create .env.prod for local testing
# Copy your Neon DATABASE_URL
cat > .env.prod @"
NODE_ENV=production
DATABASE_URL=postgresql://neondb_owner:npg_gTlWRE6qfNQ8@ep-square-frost-abrzbyjn-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=test_secret_key_local
API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3000/api
"@

# Start the container
docker compose -f docker-compose.prod.yml up

# In another terminal, test health
curl http://127.0.0.1:7000/api/health

# Press Ctrl+C to stop
```

**Note:** This won't update your production Neon database if running locally.

## Step 5: Tag and Push to GHCR

```powershell
# Log in to GitHub Container Registry (use Personal Access Token)
# Create token at: https://github.com/settings/tokens
# - Scopes: write:packages, read:packages

docker login ghcr.io
# Username: ruchinmunjal
# Password: <GITHUB_TOKEN>

# Tag the image
docker tag anchor:latest ghcr.io/ruchinmunjal/anchor:latest
docker tag anchor:latest ghcr.io/ruchinmunjal/anchor:0.18.1

# Push to GHCR
docker push ghcr.io/ruchinmunjal/anchor:latest
docker push ghcr.io/ruchinmunjal/anchor:0.18.1

# Verify on GitHub
# https://github.com/ruchinmunjal/anchor/pkgs/container/anchor
```

## Step 6: Deploy to Azure VM

### On Your Local Machine

```powershell
# Generate SSH command
# Example if key is at ~/.ssh/id_rsa
# ssh -i ~/.ssh/id_rsa user@vm-ip
```

### SSH into Azure VM

```bash
ssh user@your-vm-ip

# Verify current state
cd /opt/anchor
docker ps --filter name=anchor

# Show current env
cat .env.prod | grep DATABASE_URL
```

### Backup Current Data

```bash
# Option 1: Backup the Docker volume
docker compose -f docker-compose.prod.yml down
# (data persists in volume)

# Option 2: Backup to file
docker run --rm -v anchor_data:/data -v $(pwd):/backup alpine tar czf /backup/anchor_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C / data/
ls -lh anchor_backup_*.tar.gz

# Option 3: Backup Neon database directly (recommended)
# Log into Neon console and use the backup feature
# Or use pg_dumpall if you have psql installed:
# pg_dump -h ep-square-frost-abrzbyjn-pooler.eu-west-2.aws.neon.tech -U neondb_owner -d neondb > backup.sql
```

### Update and Restart

```bash
# Edit docker-compose.prod.yml
nano docker-compose.prod.yml

# Change:
# FROM: image: ghcr.io/ruchinmunjal/anchor:1.0.0
# TO:   image: ghcr.io/ruchinmunjal/anchor:latest

# Or use sed:
sed -i 's|ghcr.io/ruchinmunjal/anchor:1.0.0|ghcr.io/ruchinmunjal/anchor:latest|g' docker-compose.prod.yml

# Pull the new image
docker pull ghcr.io/ruchinmunjal/anchor:latest

# Restart with new image
docker compose -f docker-compose.prod.yml up -d

# Monitor startup (Prisma migrations may take 1-2 minutes)
docker logs -f anchor

# Wait for: "Nest application successfully started"
# Then Ctrl+C to exit logs
```

### Verify Deployment

```bash
# Check container is running and healthy
docker ps --filter name=anchor --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'

# Should show: "healthy" status

# Test health endpoint
curl http://127.0.0.1:3000/api/health
# Or via Nginx:
curl https://notes.ruchinmunjal.dev/api/health

# Check logs for errors
docker logs anchor | tail -50

# Verify data is intact
docker exec anchor npm run prisma -- db execute --stdin < /dev/null
# Or test via web UI: https://notes.ruchinmunjal.dev
```

## Step 7: Verify Mobile App Works

1. Open mobile app
2. Log in with same account
3. Check if:
   - Notes sync properly
   - Can create new notes
   - Can view/edit existing notes
   - No authentication errors

If mobile app shows errors, check:
```bash
# Server logs for auth issues
docker logs anchor | grep -i "auth\|token\|error"

# CORS issues
docker logs anchor | grep -i "cors"

# Version mismatch
docker exec anchor npm -v
docker exec anchor node -v
```

## Step 8: Rollback Plan (If Needed)

```bash
# If new version has critical issues:

# Stop current container
docker compose -f docker-compose.prod.yml down

# Restore old image
docker pull ghcr.io/ruchinmunjal/anchor:1.0.0

# Edit docker-compose.prod.yml back to 1.0.0
sed -i 's|ghcr.io/ruchinmunjal/anchor:latest|ghcr.io/ruchinmunjal/anchor:1.0.0|g' docker-compose.prod.yml

# Restart
docker compose -f docker-compose.prod.yml up -d

# Verify restored
docker ps --filter name=anchor
curl https://notes.ruchinmunjal.dev/api/health
```

## Troubleshooting

### Build Fails
```powershell
# Clean build
docker system prune -a
docker build -t anchor:latest --no-cache -f Dockerfile .

# Check specific layer
docker build -t anchor:latest -f Dockerfile . --progress=plain
```

### Image Won't Start
```bash
# Check logs immediately
docker logs anchor

# Common issues:
# 1. DATABASE_URL not set: check .env.prod
# 2. Database unreachable: verify Neon connection
# 3. Port already in use: check docker ps for conflicts
# 4. Permission denied: check volume ownership
```

### Database Migration Fails
```bash
# Check migration logs
docker logs anchor | grep -i "prisma\|migration\|error"

# If stuck, try:
docker exec anchor npm run prisma -- migrate deploy --skip-generate

# Or reset (WARNING: deletes data!)
docker exec anchor npm run prisma -- migrate reset
```

### Can't Connect to Neon
```bash
# Verify connection string in .env.prod
docker exec anchor env | grep DATABASE_URL

# Test connection from container
docker exec anchor nc -zv ep-square-frost-abrzbyjn-pooler.eu-west-2.aws.neon.tech 5432
```

## Success Criteria

✅ Image builds without errors
✅ Container starts and shows "healthy"
✅ Health endpoint returns 200 OK
✅ Can access web app: https://notes.ruchinmunjal.dev
✅ Can login with existing credentials
✅ Existing notes are visible and unchanged
✅ Mobile app can connect and sync
✅ No critical errors in `docker logs anchor`
✅ Volume `/data` permissions are correct

## Next Steps After Successful Migration

1. Keep old image (`1.0.0`) for 24-48 hours in case rollback needed
2. Monitor logs daily for unexpected errors
3. Test all features (notes, sharing, mobile sync)
4. After 1 week of stability, can remove old image: `docker rmi ghcr.io/ruchinmunjal/anchor:1.0.0`
5. Update CI/CD pipelines if any exist
6. Document any custom configurations or hardening changes
