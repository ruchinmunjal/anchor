# 🔄 CORRECTED Commands - Build from Main, Keep Custom Files

## Quick Copy-Paste Version

### Local (Windows PowerShell)

```powershell
cd D:\batcave\self-hosted-tools\anchor

# 1. Commit migration guides
git add .
git commit -m "chore: add comprehensive migration guides"

# 2. Create temporary branch with latest main
git fetch origin
git checkout -b main-build origin/main

# 3. Verify you're on main-build
git branch
git log --oneline -1

# 4. Build Docker image from latest main code
docker build -t anchor:latest -f Dockerfile .

# 5. Tag images
docker tag anchor:latest ghcr.io/ruchinmunjal/anchor:latest
docker tag anchor:latest ghcr.io/ruchinmunjal/anchor:0.18.1

# 6. Login to GHCR
docker login ghcr.io -u ruchinmunjal -p <GITHUB_TOKEN>

# 7. Push to GHCR
docker push ghcr.io/ruchinmunjal/anchor:latest
docker push ghcr.io/ruchinmunjal/anchor:0.18.1

# 8. Return to your fork branch (custom files are still here!)
git checkout rucho-anchor
git branch

# 9. Optional: Delete temporary branch
git branch -d main-build
```

### Remote (Azure VM - Bash)

```bash
ssh user@your-vm-ip
cd /opt/anchor

# 1. Backup (optional but recommended)
docker run --rm -v anchor_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/anchor_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C / data/

# 2. Update docker-compose.prod.yml image tag
sed -i 's|ghcr.io/ruchinmunjal/anchor:1.0.0|ghcr.io/ruchinmunjal/anchor:latest|g' \
  docker-compose.prod.yml

# 3. Stop current container
docker compose -f docker-compose.prod.yml down

# 4. Pull new image (built from latest main code!)
docker pull ghcr.io/ruchinmunjal/anchor:latest

# 5. Start new container
docker compose -f docker-compose.prod.yml up -d

# 6. Monitor startup (wait for Prisma migrations)
docker logs -f anchor
# Press Ctrl+C when you see: "Nest application successfully started"

# 7. Verify health
docker ps --filter name=anchor --format 'table {{.Names}}\t{{.Status}}'
# Should show: "healthy"

# 8. Health check
curl http://127.0.0.1:3000/api/health

# 9. Check data integrity
docker exec anchor npm run prisma -- db execute --stdin <<< "SELECT COUNT(*) FROM \"User\";"
docker exec anchor npm run prisma -- db execute --stdin <<< "SELECT COUNT(*) FROM \"Note\";"
```

---

## What This Accomplishes

✅ **What You Keep:**
- `rucho-anchor` branch with all your custom files
- `docker-compose.prod.yml` (hardened config)
- `DEPLOYMENT.md` (your guide)
- All migration documentation
- All custom configurations

✅ **What You Get:**
- Latest application code from main (v0.18.1)
- File attachment support
- 20+ bug fixes
- Security patches
- Performance improvements

✅ **How:**
- Build Docker image from latest main code
- Use your custom docker-compose.prod.yml to deploy
- No merge conflicts
- Clean git history
- Full backwards compatibility

---

## Key Differences from Original Instructions

| Step | Original | CORRECTED | Why |
|------|----------|-----------|-----|
| Branch | `git checkout main` | `git checkout -b main-build origin/main` | Keeps your custom files safe |
| Files | Lose docker-compose.prod.yml | Keep on rucho-anchor | Your hardened config stays |
| Guides | Lost after checkout | Stay on rucho-anchor | Reference materials preserved |
| Build | From your old code | From latest main | Gets all improvements |
| Deploy | Same | Same | Still uses your custom files |

---

## Why This Works

```
Before:
  rucho-anchor (custom files + old code)
  origin/main (new code, no custom files)
  Problem: Checking out main loses your files!

After (CORRECTED):
  rucho-anchor (custom files + old code) ← Stays here!
  main-build (temporary, latest code) ← Build from here
  Docker image (from main-build) ← Push this
  Deploy (with docker-compose.prod.yml from rucho-anchor) ← Use this
  Result: Best of both worlds! ✨
```

---

## Timeline (CORRECTED)

```
Now:          Read CORRECTED_STRATEGY.md         (5 min)
  ↓
+5 min:       Commit + create main-build         (1 min)
  ↓
+6 min:       Build Docker image                 (10-15 min)
  ↓
+21 min:      Push to GHCR                       (2-5 min)
  ↓
+26 min:      Return to rucho-anchor             (< 1 min)
  ↓
+26 min:      SSH to VM                          (1 min)
  ↓
+27 min:      Backup + Update + Restart          (3 min)
  ↓
+30 min:      Verify & Monitor                   (5 min)
  ↓
+35 min:      ✅ DONE!

Total: Same 30-35 minutes, but with correct branch handling!
```

---

## Safety Checklist

Before running commands:
- [ ] You're on rucho-anchor branch: `git branch`
- [ ] No uncommitted changes: `git status`
- [ ] origin/main is updated: `git fetch origin`
- [ ] Docker Desktop is running
- [ ] GitHub token is ready

After build:
- [ ] Image built successfully: `docker images | grep anchor`
- [ ] Image pushed to GHCR: https://github.com/ruchinmunjal/anchor/pkgs/container/anchor

After deployment:
- [ ] Container is healthy: `docker ps --filter name=anchor`
- [ ] Health endpoint works: `curl https://notes.ruchinmunjal.dev/api/health`
- [ ] All custom files still on rucho-anchor: `git status`

---

## Verification

After completing the migration:

```bash
# 1. On your laptop, verify branch
git branch
# Should show: * rucho-anchor (your fork branch with custom files)

# 2. Verify custom files exist
cat docker-compose.prod.yml | head -5
# Should show: services:

# 3. On Azure VM, verify image version
docker inspect anchor | grep Image
# Should show: ghcr.io/ruchinmunjal/anchor:latest

# 4. Verify app works
curl https://notes.ruchinmunjal.dev/api/health
# Should return: OK

# 5. Test mobile app
# Should connect and sync without errors
```

---

## Troubleshooting (CORRECTED Version)

**Q: I checked out main and lost my files!**
A: Don't worry:
```bash
git checkout rucho-anchor
# Your files are back! You were just on the wrong branch.
```

**Q: Can I still see the old rucho-anchor branch?**
A: Yes! It has all your custom files. Use it for reference and deployment.

**Q: What about main-build branch?**
A: It's temporary. Can delete with: `git branch -d main-build`

**Q: Does the Docker image have my custom files?**
A: No, and that's good! Docker image has the app code (from main), your docker-compose.prod.yml configures how it runs.

---

## Summary

**Before:** Confusion about losing custom files when checking out main
**After:** Keep custom files on rucho-anchor, build image from latest main, deploy with custom config
**Result:** ✅ All improvements + all customizations!
