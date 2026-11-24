# Data Preservation Strategy for Anchor Migration

## Your Data Locations

### 1. Primary Database: Neon (PostgreSQL - External)
**Where:** `postgresql://neondb_owner:***@ep-square-frost-abrzbyjn-pooler.eu-west-2.aws.neon.tech/neondb`

**What's stored:**
- All users, notes, tags, sharing relationships
- API tokens, refresh tokens
- Authentication settings (OIDC subjects)
- User profiles and settings

**Safety Level:** ✅ **SAFEST** - Managed by Neon, backed up automatically

**Risk during migration:** 
- ⚠️ LOW - Prisma migrations might fail mid-way, leaving database in inconsistent state
- 🔒 MITIGATION: Neon supports point-in-time restore (check Neon dashboard)

### 2. Docker Volume: `/data` (Local filesystem on VM)
**Location:** Docker volume `anchor_data` on Azure VM

**What's stored:**
- PostgreSQL data files (`/data/postgres/`)
- Possibly application cache/temp files
- File uploads if attachments are stored locally (not applicable in your current setup - using Neon)

**Safety Level:** ⚠️ **MEDIUM** - Needs manual backup

**Risk during migration:**
- 🔴 CRITICAL if volume is deleted: `docker compose down -v` removes it
- ✅ SAFE if using: `docker compose down` (without `-v` flag)

### 3. Docker Configuration: `.env.prod`
**Location:** `/opt/anchor/.env.prod` on Azure VM

**What's stored:**
- `DATABASE_URL` - Neon connection string (CRITICAL)
- `JWT_SECRET` - Authentication key (CRITICAL)
- `API_URL`, `NEXT_PUBLIC_API_URL` - Application URLs
- Other environment settings

**Safety Level:** ⚠️ **MEDIUM** - In plaintext file with 600 permissions

**Risk during migration:**
- File persists across container restarts
- Only risk if VM is destroyed

## Data Preservation Checklist

### Before Migration (Local Preparation)

- [ ] **Record current state:**
  ```bash
  docker exec anchor npm run prisma -- db execute --stdin < /dev/null
  # Count records
  docker exec anchor npm run prisma -- db execute --stdin <<< "SELECT COUNT(*) as users FROM \"User\";"
  docker exec anchor npm run prisma -- db execute --stdin <<< "SELECT COUNT(*) as notes FROM \"Note\";"
  ```

- [ ] **Export Neon backup (Recommended):**
  ```bash
  # Option A: Via Neon Dashboard
  # 1. Go to https://console.neon.tech
  # 2. Select your database
  # 3. Click "Backups" or "Point-in-time restore"
  # 4. Create manual backup
  
  # Option B: Via psql (if installed locally)
  # Install: https://www.postgresql.org/download/
  PGPASSWORD=npg_gTlWRE6qfNQ8 pg_dump \
    -h ep-square-frost-abrzbyjn-pooler.eu-west-2.aws.neon.tech \
    -U neondb_owner \
    -d neondb \
    --ssl-mode=require > anchor_backup_$(date +%Y%m%d).sql
  
  # Store backup file: anchor_backup_20260224.sql (safe location, not on VM)
  ```

- [ ] **Record Docker volume state:**
  ```bash
  docker volume inspect anchor_data
  # Note the Mountpoint and driver info
  ```

### During Migration (VM Preparation)

- [ ] **Stop container gracefully:**
  ```bash
  cd /opt/anchor
  docker compose -f docker-compose.prod.yml down
  # ✅ Data persists in volume and Neon
  ```

- [ ] **Backup Docker volume to file (Optional but Recommended):**
  ```bash
  # Create backup of /data directory
  docker run --rm \
    -v anchor_data:/data \
    -v $(pwd):/backup \
    alpine tar czf /backup/anchor_data_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C / data/
  
  # Verify backup created
  ls -lh anchor_data_backup_*.tar.gz
  
  # Keep backup for 7 days before deleting
  ```

- [ ] **Record current environment:**
  ```bash
  cp .env.prod .env.prod.backup
  cat .env.prod
  # Keep safely; will reuse for new container
  ```

### After Starting New Container

- [ ] **Verify Prisma migrations completed:**
  ```bash
  docker logs anchor | grep -i "prisma\|migrate\|migration"
  # Should see: "✔ Migrations: X migrations have been applied"
  ```

- [ ] **Verify data integrity:**
  ```bash
  # Count should match pre-migration counts
  docker exec anchor npm run prisma -- db execute --stdin <<< "SELECT COUNT(*) FROM \"User\";"
  docker exec anchor npm run prisma -- db execute --stdin <<< "SELECT COUNT(*) FROM \"Note\";"
  
  # Spot check - list users
  docker exec anchor npm run prisma -- db execute --stdin <<< "SELECT email, name, createdAt FROM \"User\" LIMIT 5;"
  ```

- [ ] **Test application:**
  ```bash
  curl https://notes.ruchinmunjal.dev/api/health
  # Try logging in via web UI
  # Try syncing on mobile app
  ```

## Rollback Procedures

### Scenario 1: Container Won't Start

**Symptom:** `docker logs anchor` shows error, container exits

**Recovery:**
```bash
# 1. Revert image in docker-compose.prod.yml
sed -i 's|ghcr.io/ruchinmunjal/anchor:latest|ghcr.io/ruchinmunjal/anchor:1.0.0|g' docker-compose.prod.yml

# 2. Restart with old image (data unchanged)
docker pull ghcr.io/ruchinmunjal/anchor:1.0.0
docker compose -f docker-compose.prod.yml up -d

# 3. Verify
docker ps --filter name=anchor
```

**Data safety:** ✅ SAFE - Only rolling back container version

### Scenario 2: Database Migrations Failed Partially

**Symptom:** `docker logs anchor` shows Prisma errors, app crashes during startup

**Recovery Option A: Neon Point-in-Time Restore**
```bash
# 1. Go to Neon Console: https://console.neon.tech
# 2. Select database > Backups
# 3. Use "Point-in-Time Restore" to restore to 15 minutes ago
# 4. Wait for restore to complete
# 5. Restart container:
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

**Data safety:** ✅ SAFE - You'll lose ~15 minutes of changes, but nothing older

**Recovery Option B: Restore from SQL Backup**
```bash
# 1. Stop container
docker compose -f docker-compose.prod.yml down

# 2. Create new temporary Neon database or use Neon branch feature
# 3. Restore from backup SQL file
PGPASSWORD=npg_*** psql \
  -h ep-square-frost-abrzbyjn-pooler.eu-west-2.aws.neon.tech \
  -U neondb_owner \
  -d neondb_restore \
  --ssl-mode=require < anchor_backup_20260224.sql

# 4. Update .env.prod to point to restore database
# 5. Restart container to verify
docker compose -f docker-compose.prod.yml up -d

# 6. If successful, can delete old database or switch back to original
```

**Data safety:** ⚠️ MEDIUM - Requires manual restore effort

### Scenario 3: Data Corrupted / Wrong Schema Applied

**Symptom:** `docker logs anchor` completes but data looks wrong

**Recovery:**
```bash
# 1. Restore volume from backup
docker compose -f docker-compose.prod.yml down

# 2. Clear corrupted volume
docker volume rm anchor_data

# 3. Create new volume
docker volume create anchor_data

# 4. Restore backup
docker run --rm \
  -v anchor_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/anchor_data_backup_*.tar.gz -C /

# 5. Restart container
docker compose -f docker-compose.prod.yml up -d

# 6. Run migrations fresh
docker exec anchor npm run prisma -- migrate deploy --skip-generate
```

**Data safety:** ⚠️ MEDIUM-HIGH - Depends on backup age

## Automated Backup Strategy (Future)

Once stable, consider setting up automated backups:

```bash
# Add cron job on VM (runs daily at 2 AM)
crontab -e

# Add line:
0 2 * * * cd /opt/anchor && docker run --rm -v anchor_data:/data -v $(pwd):/backup alpine tar czf /backup/anchor_data_$(date +\%Y\%m\%d).tar.gz -C / data/ && find /opt/anchor -name 'anchor_data_*.tar.gz' -mtime +7 -delete
```

This will:
- Create daily backup of Docker volume
- Automatically delete backups older than 7 days
- Run at 2 AM to avoid user impact

## Database Connection String Security

**Current:** `.env.prod` on VM contains Neon connection string with password

**Risk:** If VM is compromised, password exposed

**Better approach (Future):**
1. Use Neon's connection pooling (already in URL: `pooler.eu-west-2.aws.neon.tech`)
2. Rotate Neon password periodically
3. Consider Azure Key Vault integration:
   ```bash
   # Store connection string in Key Vault
   az keyvault secret set --vault-name my-vault --name ANCHOR_DATABASE_URL --value "postgresql://..."
   
   # Retrieve in container startup
   docker exec anchor az keyvault secret show --vault-name my-vault --name ANCHOR_DATABASE_URL
   ```

## Summary of Data Safety

| Component | Current Safety | Risk | Mitigation |
|-----------|-----------------|------|-----------|
| Neon Database | ✅ HIGH | Partial migration failure | Neon point-in-time restore |
| Docker Volume `/data` | ⚠️ MEDIUM | Deleted by mistake | Don't use `docker down -v` |
| `.env.prod` secrets | ⚠️ MEDIUM | Exposed if VM compromised | Azure Key Vault (future) |
| Old image on GHCR | ✅ HIGH | Nothing | Keep for 48 hours minimum |

**Overall: Your data is safe. Proceed with confidence.** ✅

The main things to remember:
1. **NEVER** run `docker compose down -v` (keeps volume)
2. **ALWAYS** use `docker compose down` (without `-v`)
3. **BACKUP** Neon before major migrations
4. **TEST** migrations locally first if possible
5. **KEEP** old image available for quick rollback
