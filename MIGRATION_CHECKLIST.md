# Anchor Migration - Quick Reference Checklist

## Phase 1: Local Build (5-10 minutes)

```
[ ] Switch to main branch: git checkout main
[ ] Verify branch: git log --oneline -5
[ ] Build image locally: docker build -t anchor:latest -f Dockerfile .
[ ] Check build succeeded: docker images | grep anchor
[ ] (Optional) Test locally: docker compose -f docker-compose.prod.yml up
[ ] Tag images:
    [ ] docker tag anchor:latest ghcr.io/ruchinmunjal/anchor:latest
    [ ] docker tag anchor:latest ghcr.io/ruchinmunjal/anchor:0.18.1
```

## Phase 2: Push to GHCR (2-5 minutes)

```
[ ] Log in: docker login ghcr.io
[ ] Push latest: docker push ghcr.io/ruchinmunjal/anchor:latest
[ ] Push versioned: docker push ghcr.io/ruchinmunjal/anchor:0.18.1
[ ] Verify: https://github.com/ruchinmunjal/anchor/pkgs/container/anchor
```

## Phase 3: Pre-Migration on Azure VM

```
SSH into VM: ssh user@your-vm-ip

[ ] Check current state:
    docker ps --filter name=anchor --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'

[ ] Record database counts (before migration):
    docker exec anchor npm run prisma -- db execute --stdin <<< "SELECT COUNT(*) as users FROM \"User\";"
    docker exec anchor npm run prisma -- db execute --stdin <<< "SELECT COUNT(*) as notes FROM \"Note\";"

[ ] Backup Neon (Optional but recommended):
    - Go to https://console.neon.tech
    - Database > Backups > Create backup

[ ] Backup volume to file:
    docker run --rm -v anchor_data:/data -v $(pwd):/backup alpine tar czf /backup/anchor_data_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C / data/

[ ] Record .env.prod:
    cp .env.prod .env.prod.backup

[ ] Stop container:
    cd /opt/anchor
    docker compose -f docker-compose.prod.yml down
```

## Phase 4: Update Container

```
[ ] Update docker-compose.prod.yml:
    - Option A: sed -i 's|ghcr.io/ruchinmunjal/anchor:1.0.0|ghcr.io/ruchinmunjal/anchor:latest|g' docker-compose.prod.yml
    - Option B: nano docker-compose.prod.yml (edit manually)

[ ] Pull new image:
    docker pull ghcr.io/ruchinmunjal/anchor:latest

[ ] Start container:
    docker compose -f docker-compose.prod.yml up -d

[ ] Monitor migrations (1-2 minutes):
    docker logs -f anchor
    # Wait for: "Nest application successfully started"
    # Then press Ctrl+C
```

## Phase 5: Verification

```
[ ] Check container health:
    docker ps --filter name=anchor --format 'table {{.Names}}\t{{.Status}}'
    # Should show: healthy

[ ] Test health endpoint:
    curl http://127.0.0.1:3000/api/health

[ ] Verify data integrity:
    docker exec anchor npm run prisma -- db execute --stdin <<< "SELECT COUNT(*) as users FROM \"User\";"
    docker exec anchor npm run prisma -- db execute --stdin <<< "SELECT COUNT(*) as notes FROM \"Note\";"
    # Counts should match pre-migration counts

[ ] Test web app:
    https://notes.ruchinmunjal.dev
    - Log in with existing account
    - Verify notes are present
    - Try creating/editing a note

[ ] Test mobile app:
    - Log in
    - Verify sync works
    - Try creating/editing a note

[ ] Check logs for errors:
    docker logs anchor | tail -50
    # Should have minimal errors, only info logs
```

## Phase 6: Rollback (If Needed)

```
ONLY IF something went wrong:

[ ] Stop container:
    docker compose -f docker-compose.prod.yml down

[ ] Revert image:
    sed -i 's|ghcr.io/ruchinmunjal/anchor:latest|ghcr.io/ruchinmunjal/anchor:1.0.0|g' docker-compose.prod.yml

[ ] Restart:
    docker pull ghcr.io/ruchinmunjal/anchor:1.0.0
    docker compose -f docker-compose.prod.yml up -d

[ ] Verify:
    docker ps
    curl https://notes.ruchinmunjal.dev/api/health
```

---

## Key Commands Reference

### Monitor Logs
```bash
docker logs -f anchor                    # Follow logs in real-time
docker logs anchor | tail -50            # Last 50 lines
docker logs anchor | grep -i error       # Search for errors
```

### Database Inspection
```bash
# Count records
docker exec anchor npm run prisma -- db execute --stdin <<< "SELECT COUNT(*) FROM \"User\";"
docker exec anchor npm run prisma -- db execute --stdin <<< "SELECT COUNT(*) FROM \"Note\";"

# List users
docker exec anchor npm run prisma -- db execute --stdin <<< "SELECT email, name, createdAt FROM \"User\";"

# Check database migrations
docker exec anchor npm run prisma -- migrate status
```

### Volume Management
```bash
docker volume ls | grep anchor           # List volumes
docker volume inspect anchor_data        # Inspect volume details
docker run --rm -v anchor_data:/data alpine ls -la /data/   # View volume contents
```

### Image Management
```bash
docker images | grep anchor              # List anchor images
docker rmi ghcr.io/ruchinmunjal/anchor:1.0.0  # Remove old image (after success)
```

### Container Inspection
```bash
docker ps                                # Running containers
docker ps -a                             # All containers
docker inspect anchor                    # Full container details
docker stats anchor                      # CPU/Memory usage
```

---

## Troubleshooting Quick Links

**Container won't start:**
```bash
docker logs anchor
# Check for: DATABASE_URL not set, permission denied, port in use
```

**Database connection failing:**
```bash
docker exec anchor env | grep DATABASE_URL
# Verify Neon URL is correct and contains password
```

**Prisma migrations failing:**
```bash
docker logs anchor | grep -i prisma
# Check: schema changes, missing migrations, database permissions
```

**Health check failing:**
```bash
docker logs anchor | tail -100
docker exec anchor curl http://127.0.0.1:3000/api/health
```

**Volume permission issues:**
```bash
docker exec anchor chown -R node:node /data
docker exec anchor chmod -R 755 /data
```

---

## Success Indicators ✅

After deployment, verify:

- [ ] `docker ps` shows `healthy` status
- [ ] `curl https://notes.ruchinmunjal.dev/api/health` returns 200
- [ ] Can log in to web app
- [ ] All existing notes are visible
- [ ] Mobile app can sync
- [ ] No critical errors in logs
- [ ] New features work (if applicable)

## Time Estimates

| Phase | Duration | Notes |
|-------|----------|-------|
| Local Build | 5-10 min | First time longer, cached builds faster |
| Push to GHCR | 2-5 min | Depends on image size and network |
| VM Backup | 1-2 min | Volume backup to file |
| Container Update | 2-5 min | Pull + start + migrations |
| Verification | 5-10 min | Tests and manual checks |
| **Total** | **15-32 min** | Mostly waiting for processes |

---

## Important Notes

⚠️ **NEVER:**
- Use `docker compose down -v` (deletes volume!)
- Push to production without testing locally
- Delete `.env.prod` from VM
- Force-delete running containers

✅ **ALWAYS:**
- Use `docker compose down` (without `-v`)
- Backup before making changes
- Keep old image for 24-48 hours
- Monitor logs after deployment

---

## Support / More Info

- **Data Preservation:** See `DATA_PRESERVATION_STRATEGY.md`
- **Full Migration Guide:** See `MIGRATION_GUIDE.md`
- **Local Build Details:** See `LOCAL_BUILD_GUIDE.md`
- **Troubleshooting:** See relevant guide for more details

---

## Post-Migration (After 24-48 Hours)

```
[ ] Application running stably
[ ] No critical errors in logs
[ ] Mobile app working correctly
[ ] All user data intact
[ ] Can delete old image:
    docker rmi ghcr.io/ruchinmunjal/anchor:1.0.0
```

Good luck with your migration! 🚀
