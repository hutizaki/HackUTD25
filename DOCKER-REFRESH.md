# Safe Docker Refresh Guide

This guide shows you how to refresh your Docker containers without losing environment variables.

## Understanding Docker Environment Variables

Your `docker-compose.yml` loads environment variables in two ways:

1. **From `api/.env` file** (line 28): `env_file: - ./api/.env`
2. **From shell environment** (lines 38-44): `${PM_CLOUD_AGENT_API_KEY:-}`

The `${VAR:-}` syntax means: "Use the value from the shell environment, or empty string if not set"

## Safe Refresh Methods

### Method 1: Restart Services (Fastest)

Restarts containers without rebuilding. **Preserves all data and env vars.**

```bash
# Restart all services
docker-compose restart

# Or restart specific service
docker-compose restart api
```

**When to use:** After changing code or `.env` files

### Method 2: Down and Up (Clean Restart)

Stops and removes containers, but **preserves volumes and `.env` files.**

```bash
# Stop and remove containers
docker-compose down

# Start fresh
docker-compose up -d
```

**When to use:** After changing `docker-compose.yml` or for a clean slate

### Method 3: Rebuild (After Dependency Changes)

Rebuilds images from scratch. **Preserves `.env` files and volumes.**

```bash
# Rebuild and restart
docker-compose up -d --build

# Or rebuild specific service
docker-compose up -d --build api
```

**When to use:** After changing `package.json`, `Dockerfile`, or system dependencies

### Method 4: Complete Reset (Nuclear Option)

⚠️ **WARNING**: This removes **everything** including volumes (database data)

```bash
# Stop and remove everything including volumes
docker-compose down -v

# Start fresh
docker-compose up -d
```

**When to use:** Only when you want to completely reset the database

## Your Environment Variables Are Safe Because:

1. **Stored in `api/.env` file** on your host machine (not in container)
2. **Mounted as volume** (line 50): `- ./api:/app`
3. **Loaded via `env_file`** (line 28): Docker reads from host file
4. **Not stored in container** - they're injected at runtime

## Recommended Workflow

### After Changing `.env` File:

```bash
# Just restart the API service
docker-compose restart api
```

### After Changing Code:

```bash
# Restart to pick up changes (with hot reload)
docker-compose restart api

# Or if hot reload isn't working, rebuild
docker-compose up -d --build api
```

### After Changing `docker-compose.yml`:

```bash
# Down and up to apply changes
docker-compose down
docker-compose up -d
```

## Verifying Environment Variables

### Check if env vars are loaded in container:

```bash
# Check API container environment
docker-compose exec api env | grep CLOUD_AGENT_API_KEY

# Should show:
# PM_CLOUD_AGENT_API_KEY=cur_xxx
# DEV_CLOUD_AGENT_API_KEY=cur_xxx
# QA_CLOUD_AGENT_API_KEY=cur_xxx
```

### Check if `.env` file exists:

```bash
# List files in API container
docker-compose exec api ls -la /app/.env

# View .env file (be careful with secrets!)
docker-compose exec api cat /app/.env
```

## Common Issues

### Issue: Environment variables not updating

**Cause**: Container needs restart after `.env` changes

**Solution**:
```bash
docker-compose restart api
```

### Issue: "Cannot find module" errors

**Cause**: Dependencies changed but not rebuilt

**Solution**:
```bash
docker-compose up -d --build api
```

### Issue: Database connection errors

**Cause**: MongoDB container not ready

**Solution**:
```bash
# Check MongoDB health
docker-compose ps

# View MongoDB logs
docker-compose logs mongodb

# Restart if needed
docker-compose restart mongodb
```

## Quick Reference

| Command | What it does | Data Loss? | Env Loss? |
|---------|--------------|------------|-----------|
| `restart` | Restart containers | No | No |
| `down` + `up` | Remove and recreate containers | No* | No |
| `up --build` | Rebuild images and restart | No* | No |
| `down -v` | Remove everything including volumes | **YES** | No |

\* Volumes (database data) are preserved unless you use `-v` flag

## Your Current Setup

Based on your `docker-compose.yml`:

- **API env file**: `./api/.env` (line 28)
- **API volume**: `./api:/app` (line 50) - Your code and `.env` are mounted
- **Database volume**: `mongodb_data` (line 77) - Persisted separately

**This means:**
- Your `.env` file is on your host machine
- Changes to `.env` require container restart
- Database data survives `docker-compose down`
- Only `docker-compose down -v` will delete database

## Best Practice

1. **Keep `.env` files in version control** (with example values)
2. **Use `.env.example`** for templates
3. **Never commit real API keys** (add `.env` to `.gitignore`)
4. **Use `restart`** for most changes
5. **Use `down` + `up`** when in doubt
6. **Avoid `down -v`** unless you want to reset database

## Testing Your Setup

```bash
# 1. Check current env vars
docker-compose exec api env | grep CLOUD_AGENT_API_KEY

# 2. Update api/.env file (add/change keys)
echo "PM_CLOUD_AGENT_API_KEY=cur_test123" >> api/.env

# 3. Restart to pick up changes
docker-compose restart api

# 4. Verify changes
docker-compose exec api env | grep PM_CLOUD_AGENT_API_KEY
# Should show: PM_CLOUD_AGENT_API_KEY=cur_test123
```

## Summary

✅ **Safe to run anytime:**
- `docker-compose restart`
- `docker-compose down` + `docker-compose up -d`
- `docker-compose up -d --build`

⚠️ **Use with caution:**
- `docker-compose down -v` (deletes database!)

Your environment variables in `api/.env` are **always safe** - they're stored on your host machine, not in the container!

