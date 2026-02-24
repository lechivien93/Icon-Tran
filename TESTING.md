# Testing Guide - IconTran

## Quick Start

### 1. Start All Services

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Start dependencies (Redis)
./scripts/start-all.sh

# Terminal 1: Start app server
npm run dev

# Terminal 2: Start queue workers
npm run worker

# Terminal 3 (optional): Database UI
npm run prisma studio
```

### 2. Health Check

```bash
./scripts/health-check.sh
```

Output:
```
🔍 IconTran Health Check
========================

🔴 Redis Connection: ✅ OK
🌐 App Server (http://localhost:3000): ✅ OK
🗄️  Database Connection: ✅ OK

📊 Queue Status:
  Sync Queue:
    - Waiting: 0 jobs
    - Active: 0 jobs
  Translation Queue:
    - Waiting: 0 jobs
    - Active: 0 jobs
  Webhook Queue:
    - Waiting: 0 jobs
    - Active: 0 jobs

✨ Health check complete!
```

### 3. Test API Endpoints

```bash
./scripts/test-api.sh
```

## Manual Testing

### Using curl

```bash
# Get sync history
curl http://localhost:3000/api/sync

# Start product sync
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"resourceType":"PRODUCT","operation":"FULL_SYNC"}'

# Send chat message
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is my token balance?"}'

# Get billing info
curl http://localhost:3000/api/billing

# Get resources (paginated)
curl "http://localhost:3000/api/resources?page=1&limit=10"

# Get filtered resources
curl "http://localhost:3000/api/resources?type=PRODUCT&status=ACTIVE"
```

### Using httpie (Recommended)

```bash
# Install httpie
brew install httpie

# Get sync history
http GET localhost:3000/api/sync

# Start sync
http POST localhost:3000/api/sync resourceType=PRODUCT operation=FULL_SYNC

# Send chat message
http POST localhost:3000/api/chat message="Sync all products"

# Get resources
http GET localhost:3000/api/resources page==1 limit==10
```

## Database Testing

### Prisma Studio (GUI)

```bash
npm run prisma studio
# Opens http://localhost:5555
```

### Seed Database

```bash
npm run prisma db seed
```

Creates:
- 15 languages (en, vi, ja, fr, es, de, it, pt, zh, ko, ar, th, nl, pl, ru)
- 4 billing plans (Free, Basic $9.99, Professional $29.99, Enterprise $99.99)

### Run Migrations

```bash
npm run prisma migrate dev
```

## Queue Testing

### Monitor Redis in Real-time

```bash
# Terminal 1: Monitor all Redis commands
redis-cli MONITOR

# Terminal 2: Trigger jobs
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"resourceType":"PRODUCT"}'
```

### Check Queue Status

```bash
redis-cli

# List all Bull queues
KEYS bull:*

# Check waiting jobs
LLEN bull:sync:waiting
LLEN bull:translation:waiting
LLEN bull:webhook:waiting

# Check active jobs
LLEN bull:sync:active
LLEN bull:translation:active
LLEN bull:webhook:active

# View job details
LRANGE bull:sync:waiting 0 -1
```

### Clear All Queues

```bash
redis-cli FLUSHDB
```

## Worker Logs

### Start Workers with Verbose Logging

```bash
npm run worker 2>&1 | tee worker.log
```

### Watch Logs in Real-time

```bash
tail -f worker.log
```

## Common Test Scenarios

### Test Full Sync Workflow

```bash
# 1. Start sync
SYNC_ID=$(curl -s -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"resourceType":"PRODUCT"}' | jq -r '.syncId')

echo "Sync ID: $SYNC_ID"

# 2. Check sync progress
curl http://localhost:3000/api/sync/$SYNC_ID | jq '.'

# 3. Monitor in Redis
redis-cli LLEN bull:sync:waiting
redis-cli LLEN bull:sync:active
```

### Test Translation Workflow

```bash
# 1. Get resources
RESOURCE_ID=$(curl -s "http://localhost:3000/api/resources?limit=1" \
  | jq -r '.resources[0].id')

# 2. Send chat to translate
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Translate resource $RESOURCE_ID to French\"}"

# 3. Check translation queue
redis-cli LLEN bull:translation:waiting
```

### Test Billing Flow

```bash
# 1. Get available plans
curl http://localhost:3000/api/billing | jq '.plans'

# 2. Get current subscription
curl http://localhost:3000/api/billing | jq '.subscription'

# 3. Get token balance
curl http://localhost:3000/api/billing | jq '.tokenBalance'
```

## Debugging Tips

### Check App Logs

```bash
# Vite dev server logs (Terminal 1)
npm run dev

# Worker logs (Terminal 2)
npm run worker
```

### Database Queries

```bash
# Connect to database
npx prisma studio

# Or use SQL directly
sqlite3 prisma/dev.db

# Example queries
SELECT COUNT(*) FROM Resource;
SELECT * FROM Shop LIMIT 1;
SELECT * FROM SyncHistory ORDER BY createdAt DESC LIMIT 5;
```

### Redis Debugging

```bash
redis-cli

# See all keys
KEYS *

# Get value
GET key_name

# Delete all data
FLUSHDB

# Monitor commands
MONITOR
```

## Performance Testing

### Load Test with Artillery

```bash
npm install -g artillery

# Create artillery config
cat > artillery-config.yml <<EOF
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - flow:
      - get:
          url: "/api/resources"
      - post:
          url: "/api/chat"
          json:
            message: "What is my balance?"
EOF

# Run load test
artillery run artillery-config.yml
```

## CI/CD Testing

### GitHub Actions Workflow

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run prisma migrate deploy
      - run: npm run prisma db seed
      - run: ./scripts/health-check.sh
```

## Troubleshooting

### Port Already in Use

```bash
# Find process on port 3000
lsof -ti:3000 | xargs kill -9

# Find Redis process
ps aux | grep redis
```

### Redis Connection Failed

```bash
# Start Redis
redis-server

# Or with Docker
docker run -d -p 6379:6379 redis:alpine
```

### Database Locked

```bash
# Reset database
rm prisma/dev.db
npm run prisma migrate dev
npm run prisma db seed
```

### Worker Not Processing Jobs

```bash
# Check if workers are running
ps aux | grep "tsx app/workers"

# Restart workers
pkill -9 -f "tsx app/workers"
npm run worker
```

## Next Steps

1. **Integration Tests**: Add Jest/Vitest tests
2. **E2E Tests**: Add Playwright for UI testing
3. **Load Testing**: Test with realistic traffic
4. **Monitoring**: Add APM (DataDog, New Relic)
5. **Logging**: Centralized logging with Winston/Pino
