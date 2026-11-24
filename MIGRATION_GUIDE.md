# Migration Guide: Upgrading Anchor Server on Azure VM

## Current State Analysis

### Your Fork vs Main Branch
- **Your Fork (rucho-anchor):** v0.9.1 with simplified schema
  - Has: Users, Notes, Tags, Sharing, Auth, Refresh Tokens, API Tokens, OIDC
  - Missing: Attachments (available in main)
  
- **Main Branch:** v0.18.1 with full features
  - Includes: Everything in your fork + Attachments + better mobile support
  - 20+ migrations ahead of your fork

### Database
- Provider: Neon (PostgreSQL, external)
- Current migrations on VM: 12 migrations
- Main branch migrations: 15+ migrations
- **New migrations needed:** add_note_attachments (and potentially others)

### Docker Setup
- Current Image: `ghcr.io/ruchinmunjal/anchor:1.0.0`
- Registry: GitHub Container Registry (GHCR)
- Security: Hardened with read-only filesystem, capability dropping, resource limits
- Volume: `/data` (must preserve)

## Migration Steps

### Phase 1: Prepare Local Environment
```bash
# 1. Update your fork to latest main (keeping /data)
git fetch origin main
git checkout main
# DO NOT force-push your branch; keep it as a reference if needed
```

### Phase 2: Build and Test New Docker Image
```bash
# 2. Build new image with updated code
docker build -t ghcr.io/ruchinmunjal/anchor:latest -f Dockerfile .

# 3. Test locally (optional but recommended)
docker compose -f docker-compose.prod.yml up

# 4. Verify health check passes
curl http://127.0.0.1:7000/api/health
```

### Phase 3: Push to GHCR
```bash
# 5. Log in to GHCR (if not already)
echo $GITHUB_TOKEN | docker login ghcr.io -u ruchinmunjal --password-stdin

# 6. Push the new image
docker push ghcr.io/ruchinmunjal/anchor:latest

# Optional: Also tag as :1.1.0 or current version
docker tag ghcr.io/ruchinmunjal/anchor:latest ghcr.io/ruchinmunjal/anchor:0.18.1
docker push ghcr.io/ruchinmunjal/anchor:0.18.1
```

### Phase 4: Update Azure VM

**4.1 SSH into VM and backup**
```bash
ssh user@your-vm-ip

# Backup current data (important!)
docker exec anchor tar czf /tmp/anchor_backup.tar.gz /data/
docker cp anchor:/tmp/anchor_backup.tar.gz ./anchor_backup_$(date +%Y%m%d).tar.gz

# Optional: Backup database schema
docker exec anchor pg_dumpall -U neondb_owner > anchor_db_backup_$(date +%Y%m%d).sql
```

**4.2 Stop current container gracefully**
```bash
cd /opt/anchor

# Stop the container (data persists in volume)
docker compose -f docker-compose.prod.yml down
# DO NOT use: docker compose down -v (this deletes the volume!)
```

**4.3 Update docker-compose.prod.yml**
Update the image tag:
```yaml
# Change from:
image: ghcr.io/ruchinmunjal/anchor:1.0.0
# To:
image: ghcr.io/ruchinmunjal/anchor:latest
# Or:
image: ghcr.io/ruchinmunjal/anchor:0.18.1
```

**4.4 Pull and start new container**
```bash
# Pull the new image
docker pull ghcr.io/ruchinmunjal/anchor:latest

# Start with new code
docker compose -f docker-compose.prod.yml up -d

# Monitor logs for database migrations
docker logs -f anchor

# Wait for it to be ready (check for "Nest application successfully started" message)
# This may take 1-2 minutes as Prisma runs migrations
```

**4.5 Verify health and data**
```bash
# Check container is healthy
docker ps --filter name=anchor --format 'table {{.Names}}\t{{.Status}}'

# Verify via health endpoint
curl https://notes.ruchinmunjal.dev/api/health

# Check database connection
docker exec anchor npm run prisma -- db execute --stdin < /dev/null
# Or via web interface: https://notes.ruchinmunjal.dev
```

### Phase 5: Rollback Plan (If Something Goes Wrong)

**Keep old image available for 24 hours:**
```bash
# On VM, if needed to rollback:
docker compose -f docker-compose.prod.yml down
# Edit docker-compose.prod.yml to change back to :1.0.0
docker pull ghcr.io/ruchinmunjal/anchor:1.0.0
docker compose -f docker-compose.prod.yml up -d
```

**Restore from backup if data is corrupted:**
```bash
# Stop container
docker compose -f docker-compose.prod.yml down

# Restore volume
docker run --rm -v anchor_data:/data -v $(pwd):/backup alpine tar xzf /backup/anchor_backup_*.tar.gz -C /

# Restart
docker compose -f docker-compose.prod.yml up -d
```

## Automatic Database Migrations

**Prisma will automatically run these new migrations:**
1. **add_note_attachments** - Add attachment support (if on main)
2. Any schema changes from latest main

The migrations run automatically on container startup via the entrypoint script. You should see logs like:
```
Prisma schema loaded from ./prisma/schema.prisma
Prisma migrations applied successfully
```

## Expected Changes After Migration

✅ **Data Preserved:**
- All users, notes, tags, shares, auth tokens remain intact
- PostgreSQL/Neon database stays connected
- `/data` volume structure preserved

✨ **New Features Available:**
- Attachment support (mobile app can upload files)
- Improved mobile app compatibility
- Latest bug fixes and security patches
- Better version alignment between mobile and server

## Verification Checklist

- [ ] Image builds locally without errors
- [ ] Image pushes to GHCR successfully
- [ ] Container starts on VM (check: `docker ps`)
- [ ] Health check passes (check: `curl https://notes.ruchinmunjal.dev/api/health`)
- [ ] Can login to web app
- [ ] Can view existing notes (data integrity check)
- [ ] Mobile app can connect and sync
- [ ] No errors in logs: `docker logs anchor`

## Troubleshooting

**Container won't start:**
```bash
docker logs -f anchor
# Check for: permission errors, database connection issues, migration failures
```

**Database connection failing:**
```bash
# Verify DATABASE_URL in .env.prod
docker exec anchor env | grep DATABASE_URL

# Check if Neon is accessible
docker exec anchor curl -v postgresql://neondb_owner:***@ep-square-frost-abrzbyjn-pooler.eu-west-2.aws.neon.tech:5432/neondb
```

**Health check failing:**
```bash
docker logs anchor | tail -50
# Look for: timeout errors, connection pool issues, middleware errors
```

**Permission errors on volume:**
```bash
# Fix volume permissions
docker exec anchor chown -R node:node /data
```

## Next Steps After Migration

1. Test mobile app connectivity
2. Monitor logs for any unexpected errors (keep terminal open for 30 mins)
3. If stable, can remove old image: `docker rmi ghcr.io/ruchinmunjal/anchor:1.0.0`
4. Update any CI/CD pipelines to use new image tag
