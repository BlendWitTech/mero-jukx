---
description: Complete Docker cleanup and fresh setup
---

# Clean Docker Setup Workflow

This workflow ensures a completely fresh Docker setup by removing all containers, volumes, and cached data.

## Steps

// turbo-all

1. **Stop all running containers and remove volumes**
```bash
docker-compose down -v
```

2. **Verify volumes are removed**
```bash
docker volume ls | findstr mero
```

3. **Remove any orphaned volumes (optional)**
```bash
docker volume prune -f
```

4. **Build containers from scratch (no cache)**
```bash
docker-compose build --no-cache
```

5. **Start the containers**
```bash
docker-compose up -d
```

6. **Wait for services to be healthy**
```bash
docker-compose ps
```

7. **Initialize the database**
```bash
npm run db:init
```

8. **Seed the database**
```bash
npm run seed
```

## Troubleshooting

If you still see old data after following these steps:

1. Check for any running containers:
   ```bash
   docker ps -a
   ```

2. Check for volumes:
   ```bash
   docker volume ls
   ```

3. If volumes still exist, remove them manually:
   ```bash
   docker volume rm mero_jugx_postgres_data
   docker volume rm mero_jugx_redis_data
   ```

## Quick Clean Script

For convenience, you can run:
```bash
npm run docker:clean
```

This will execute all cleanup steps automatically.
