# BFF Layer: PostgreSQL & Redis Infrastructure Guide

**Document Status**: Infrastructure Setup Guide  
**Target**: Enterprise Platform BFF Layer  
**Focus**: PostgreSQL + Redis Configuration, Docker Setup, Connection Management  
**Created**: 2026-05-18

---

## Table of Contents

1. [Overview](#overview)
2. [PostgreSQL Setup](#postgresql-setup)
3. [Redis Setup](#redis-setup)
4. [NestJS Integration](#nestjs-integration)
5. [Docker Infrastructure](#docker-infrastructure)
6. [Connection Pooling](#connection-pooling)
7. [Data Persistence](#data-persistence)
8. [Backup & Recovery](#backup--recovery)
9. [Performance Tuning](#performance-tuning)
10. [Monitoring](#monitoring)
11. [Security](#security)
12. [Multi-Environment Setup](#multi-environment-setup)

---

## Overview

### Architecture

```
┌──────────────────────────────────────┐
│         NestJS BFF Application       │
│  (Connection Pool Manager)           │
└────────────┬──────────────┬──────────┘
             │              │
      ┌──────▼──┐    ┌──────▼──┐
      │PostgreSQL   │ Redis    │
      │ Database    │ Cache    │
      └────────────┘    └──────────┘
             ↓              ↓
      ┌──────────────┬───────────┐
      │   Data Layer │ Cache     │
      │  (TypeORM)   │ Layer     │
      └──────────────┴───────────┘
```

### Why PostgreSQL?

```
✅ ACID compliance - Data integrity
✅ JSON support - Flexible schema
✅ Connection pooling - Scalability
✅ Full-text search - Advanced queries
✅ Array types - Complex data
✅ PostGIS - Geospatial data
✅ LISTEN/NOTIFY - Real-time events
✅ Replication - High availability
```

### Why Redis?

```
✅ In-memory speed - Sub-millisecond latency
✅ Cache layer - Reduce DB queries
✅ Session storage - PKCE flow management
✅ Rate limiting - API protection
✅ Pub/Sub - Real-time messaging
✅ Sorted sets - Leaderboards/rankings
✅ TTL support - Auto-expiration
✅ Persistence - Optional data safety
```

---

## PostgreSQL Setup

### Step 1: PostgreSQL Installation & Configuration

#### 1.1 DockerFile for PostgreSQL

**File**: `infra/postgresql/Dockerfile`

```dockerfile
# PostgreSQL 15 Alpine - Production optimized
FROM postgres:15-alpine

# Install required tools
RUN apk add --no-cache \
    postgresql-contrib \
    postgresql-plpython3 \
    tini

# Install pg_stat_statements extension
RUN apk add --no-cache build-base postgresql-dev && \
    echo "shared_preload_libraries = 'pg_stat_statements'" >> /var/lib/postgresql/data/postgresql.conf

# Create non-root user
RUN useradd -m -d /var/lib/postgresql -s /bin/bash postgres

# Copy custom configuration
COPY postgresql.conf /etc/postgresql/postgresql.conf
COPY pg_hba.conf /etc/postgresql/pg_hba.conf

# Create data directory
RUN mkdir -p /var/lib/postgresql/data && \
    chown -R postgres:postgres /var/lib/postgresql/data

# Copy initialization scripts
COPY init-scripts/ /docker-entrypoint-initdb.d/

# Set permissions
RUN chmod -R 755 /docker-entrypoint-initdb.d/

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
    CMD pg_isready -U postgres -h localhost

# Use tini to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["postgres", "-c", "config_file=/etc/postgresql/postgresql.conf"]

EXPOSE 5432

USER postgres
```

#### 1.2 PostgreSQL Configuration

**File**: `infra/postgresql/postgresql.conf`

```conf
# PostgreSQL Configuration - Production Ready
# Generated: 2026-05-18

# ============ Connection Settings ============
max_connections = 100
superuser_reserved_connections = 3
tcp_keepalives_idle = 60
tcp_keepalives_interval = 30
tcp_keepalives_count = 5

# ============ Memory Settings ============
shared_buffers = 256MB           # 25% of system memory (for 1GB total)
effective_cache_size = 1GB       # 50% of system memory
maintenance_work_mem = 64MB
work_mem = 4MB                   # total_memory / (max_connections * 2)

# ============ Checkpoint Settings ============
checkpoint_timeout = 15min
checkpoint_completion_target = 0.9
wal_buffers = 16MB
max_wal_size = 4GB
min_wal_size = 1GB

# ============ Query Planning ============
random_page_cost = 1.1           # For SSD storage
effective_io_concurrency = 200

# ============ Logging ============
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d.log'
log_file_mode = 0644
log_rotation_age = 1d
log_rotation_size = 100MB
log_truncate_on_rotation = on
log_checkpoints = on
log_connections = on
log_disconnections = on
log_duration = off
log_lock_waits = on
log_statement = 'all'
log_temp_files = 0
log_line_prefix = '%t [%p] %u@%d '
log_error_verbosity = default
log_min_duration_statement = -1  # Disable by default, set to 1000 for 1s

# ============ Performance Tuning ============
jit = on
jit_above_cost = 100000
jit_inline_above_cost = 500000
jit_optimize_above_cost = 500000

# ============ Extensions ============
shared_preload_libraries = 'pg_stat_statements'

# ============ Replication ============
wal_level = replica
max_wal_senders = 3
wal_keep_segments = 64

# ============ Connection Timeout ============
statement_timeout = 0            # No timeout (set in application)
idle_in_transaction_session_timeout = 10min

# ============ Miscellaneous ============
default_transaction_isolation = 'read committed'
synchronous_commit = on
fsync = on
full_page_writes = on
```

#### 1.3 PostgreSQL Authentication

**File**: `infra/postgresql/pg_hba.conf`

```conf
# PostgreSQL Client Authentication Configuration
# Generated: 2026-05-18

# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             postgres                                peer
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5

# Docker network communication
host    all             bff_user        172.16.0.0/12           md5
host    replication     replication_user 172.16.0.0/12          md5

# Allow connections from BFF service
host    bff_db          bff_user        0.0.0.0/0               md5
```

#### 1.4 PostgreSQL Initialization Script

**File**: `infra/postgresql/init-scripts/01-init-database.sql`

```sql
-- Initialize Database and Users
-- Created: 2026-05-18

-- Create application user
CREATE USER bff_user WITH PASSWORD 'bff_secure_password_change_this';

-- Create database
CREATE DATABASE bff_db
    WITH OWNER bff_user
    ENCODING 'UTF8'
    LOCALE 'en_US.UTF-8'
    TEMPLATE template0;

-- Create replication user
CREATE USER replication_user WITH REPLICATION PASSWORD 'replication_secure_password';

-- Grant privileges to BFF user
GRANT CONNECT ON DATABASE bff_db TO bff_user;
GRANT CREATE ON DATABASE bff_db TO bff_user;

-- Switch to BFF database
\c bff_db;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS public AUTHORIZATION bff_user;
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION bff_user;
CREATE SCHEMA IF NOT EXISTS analytics AUTHORIZATION bff_user;
CREATE SCHEMA IF NOT EXISTS audit AUTHORIZATION bff_user;

-- Grant schema privileges
GRANT USAGE ON SCHEMA public TO bff_user;
GRANT USAGE ON SCHEMA auth TO bff_user;
GRANT USAGE ON SCHEMA analytics TO bff_user;
GRANT USAGE ON SCHEMA audit TO bff_user;

GRANT CREATE ON SCHEMA public TO bff_user;
GRANT CREATE ON SCHEMA auth TO bff_user;
GRANT CREATE ON SCHEMA analytics TO bff_user;
GRANT CREATE ON SCHEMA audit TO bff_user;

-- Create audit log table
CREATE TABLE audit.audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(255) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    user_id UUID,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    old_values JSONB,
    new_values JSONB
);

CREATE INDEX idx_audit_log_table ON audit.audit_log(table_name);
CREATE INDEX idx_audit_log_operation ON audit.audit_log(operation);
CREATE INDEX idx_audit_log_user ON audit.audit_log(user_id);

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
```

#### 1.5 PostgreSQL Backup Script

**File**: `infra/postgresql/backup.sh`

```bash
#!/bin/bash

# PostgreSQL Backup Script
# Usage: ./backup.sh <database_name> <output_directory>

set -e

DB_NAME="${1:-bff_db}"
BACKUP_DIR="${2:-/var/backups/postgresql}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Perform backup
echo "Starting backup of database: $DB_NAME"
pg_dump -U bff_user -h localhost "$DB_NAME" | gzip > "$BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup completed: $BACKUP_FILE (Size: $SIZE)"

    # Keep only last 7 backups
    cd "$BACKUP_DIR"
    ls -t ${DB_NAME}_*.sql.gz | tail -n +8 | xargs -r rm
    echo "✅ Cleanup completed: Kept last 7 backups"
else
    echo "❌ Backup failed!"
    exit 1
fi
```

#### 1.6 PostgreSQL Restore Script

**File**: `infra/postgresql/restore.sh`

```bash
#!/bin/bash

# PostgreSQL Restore Script
# Usage: ./restore.sh <backup_file> <database_name>

set -e

BACKUP_FILE="$1"
DB_NAME="${2:-bff_db}"

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
    echo "Usage: ./restore.sh <backup_file> [database_name]"
    exit 1
fi

echo "Restoring database: $DB_NAME from: $BACKUP_FILE"

# Restore backup
gunzip -c "$BACKUP_FILE" | psql -U bff_user -h localhost "$DB_NAME"

echo "✅ Restore completed!"
```

---

## Redis Setup

### Step 1: Redis Installation & Configuration

#### 2.1 DockerFile for Redis

**File**: `infra/redis/Dockerfile`

```dockerfile
# Redis 7 Alpine - Production optimized
FROM redis:7-alpine

# Install additional tools
RUN apk add --no-cache \
    tini \
    ca-certificates

# Create redis user
RUN addgroup -S redis && adduser -S -G redis redis

# Copy custom configuration
COPY redis.conf /etc/redis/redis.conf
COPY redis-shutdown.sh /usr/local/bin/

# Set permissions
RUN chmod +x /usr/local/bin/redis-shutdown.sh && \
    chown -R redis:redis /etc/redis /data

# Create data directory
RUN mkdir -p /data && chown -R redis:redis /data

# Health check
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
    CMD redis-cli --raw incr HEALTHCHECK | grep -q "[0-9]*" && \
    redis-cli --raw decr HEALTHCHECK > /dev/null

# Use tini to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["redis-server", "/etc/redis/redis.conf"]

EXPOSE 6379

USER redis
```

#### 2.2 Redis Configuration

**File**: `infra/redis/redis.conf`

```conf
# Redis Configuration - Production Ready
# Generated: 2026-05-18

# ============ Network & TCP ============
port 6379
bind 0.0.0.0
protected-mode yes
tcp-backlog 511
timeout 0
tcp-keepalive 300

# ============ General ============
daemonize no
pidfile /var/run/redis.pid
loglevel notice
logfile ""
databases 16

# ============ Persistence - RDB (Snapshots) ============
# Default: Save database on disk
save 900 1        # Save after 900 sec if at least 1 key changed
save 300 10       # Save after 300 sec if at least 10 keys changed
save 60 10000     # Save after 60 sec if at least 10000 keys changed

# Disable snapshots if needed (for cache-only use)
# save ""

stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /data

# ============ Persistence - AOF (Append-Only File) ============
# Optional: More durable but slower persistence
appendonly no
# appendonly yes
# appendfilename "appendonly.aof"
# appendfsync everysec
# no-appendfsync-on-rewrite no
# auto-aof-rewrite-percentage 100
# auto-aof-rewrite-min-size 64mb

# ============ Memory Management ============
maxmemory 256mb
maxmemory-policy allkeys-lru  # Evict keys using LRU when max memory reached

# Eviction policies:
# - noeviction: Don't evict, error when max memory reached
# - allkeys-lru: Evict any key using LRU
# - volatile-lru: Evict keys with TTL using LRU
# - allkeys-lfu: Evict any key using LFU
# - volatile-lfu: Evict keys with TTL using LFU
# - allkeys-random: Evict random keys
# - volatile-random: Evict random keys with TTL
# - volatile-ttl: Evict keys with earliest TTL

# ============ Lazy Freeing ============
lazyfree-lazy-eviction no
lazyfree-lazy-expire no
lazyfree-lazy-server-del no
replica-lazy-flush no

# ============ Keyspace Notifications ============
notify-keyspace-events ""
# Enable events:
# K - Keyspace events
# E - Keyevent events
# g - Generic commands
# $ - String commands
# l - List commands
# s - Set commands
# z - Sorted set commands
# h - Hash commands
# x - Stream commands
# e - Expired events
# t - Evicted events
# m - Keymap events

# ============ Client Management ============
maxclients 10000

# ============ Replication ============
# Replication is disabled by default
# To enable, uncomment below:
# replicaof <masterip> <masterport>
# masterauth <master-password>

# ============ Security ============
# requirepass foobared          # Uncomment to set password
# Apply to all users
# user default on >password ~* &* +@all

# ============ Slow Log ============
slowlog-log-slower-than 10000  # 10ms
slowlog-max-len 128

# ============ Performance ============
latency-monitor-threshold 0
hz 10
min-replicas-to-write 0
min-replicas-max-lag 10

# ============ Modules ============
# loadmodule /usr/lib/redis/modules/mymodule.so

# ============ Append Only File - Advanced ============
# aof-load-truncated yes
# aof-use-rdb-preamble yes
```

#### 2.3 Redis Shutdown Script

**File**: `infra/redis/redis-shutdown.sh`

```bash
#!/bin/bash

# Redis Shutdown Script
# Graceful shutdown for Redis

set -e

PIDFILE="/var/run/redis.pid"
TIMEOUT=30

echo "Shutting down Redis gracefully..."

# Send shutdown command
redis-cli SHUTDOWN SAVE

echo "✅ Redis shutdown completed"
```

---

## NestJS Integration

### Step 1: TypeORM Configuration

**File**: `src/config/database.config.ts`

```typescript
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',

  // Connection
  host: configService.get('database.host'),
  port: configService.get('database.port'),
  username: configService.get('database.username'),
  password: configService.get('database.password'),
  database: configService.get('database.name'),

  // Entities
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  synchronize: configService.get('database.synchronize'),
  logging: configService.get('database.logging'),

  // Connection Pool
  poolSize: configService.get('database.poolSize'),
  maxQueryExecutionTime: configService.get('database.maxQueryExecutionTime'),

  // SSL
  ssl: configService.get('database.ssl')
    ? {
        rejectUnauthorized: false,
      }
    : false,

  // Migrations
  migrations: [join(__dirname, '../migrations/*{.ts,.js}')],
  migrationsRun: true,
  migrationsTableName: 'migrations',

  // Subscribers
  subscribers: [join(__dirname, '../subscribers/*{.ts,.js}')],

  // Timeout
  acquireConnectionTimeout: 30000,
  connectionTimeoutMS: 30000,
  statementTimeout: 30000,

  // Extra options
  extra: {
    // Connection pooling with pg
    max: configService.get('database.poolSize'),
    min: configService.get('database.minPoolSize'),
    idleTimeoutMillis: configService.get('database.idleTimeoutMillis'),
    connectionTimeoutMillis: configService.get('database.connectionTimeoutMillis'),
    statement_timeout: 30000,
    idle_in_transaction_session_timeout: 30000,
  },

  // Replication (optional)
  replication: configService.get('database.replication')
    ? {
        master: {
          host: configService.get('database.replication.master.host'),
          port: configService.get('database.replication.master.port'),
          username: configService.get('database.username'),
          password: configService.get('database.password'),
          database: configService.get('database.name'),
        },
        slaves: [
          {
            host: configService.get('database.replication.slave.host'),
            port: configService.get('database.replication.slave.port'),
            username: configService.get('database.username'),
            password: configService.get('database.password'),
            database: configService.get('database.name'),
          },
        ],
      }
    : undefined,
});
```

### Step 2: Redis Configuration

**File**: `src/config/redis.config.ts`

```typescript
import { CacheModuleOptions } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import type { RedisClientOptions } from 'redis';

export const getRedisConfig = (configService: ConfigService): CacheModuleOptions => ({
  isGlobal: true,
  store: redisStore,
  host: configService.get('redis.host'),
  port: configService.get('redis.port'),
  password: configService.get('redis.password'),
  db: configService.get('redis.db'),
  ttl: configService.get('redis.ttl'),
  max: configService.get('redis.maxItems'),
});

export const getRedisClientOptions = (configService: ConfigService): RedisClientOptions => ({
  host: configService.get('redis.host'),
  port: configService.get('redis.port'),
  password: configService.get('redis.password'),
  db: configService.get('redis.db'),
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 5000),
    keepAlive: 30000,
  },
});
```

### Step 3: Environment Configuration

**File**: `.env.development`

```bash
# ========== DATABASE ==========
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=bff_user
DATABASE_PASSWORD=bff_secure_password_change_this
DATABASE_NAME=bff_db
DATABASE_SYNCHRONIZE=true
DATABASE_LOGGING=true
DATABASE_POOL_SIZE=10
DATABASE_MIN_POOL_SIZE=2
DATABASE_IDLE_TIMEOUT_MILLIS=30000
DATABASE_CONNECTION_TIMEOUT_MILLIS=5000
DATABASE_MAX_QUERY_EXECUTION_TIME=60000
DATABASE_SSL=false

# ========== REDIS ==========
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TTL=3600
REDIS_MAX_ITEMS=1000
```

**File**: `.env.production`

```bash
# ========== DATABASE ==========
DATABASE_HOST=${DB_HOST}
DATABASE_PORT=${DB_PORT}
DATABASE_USER=${DB_USER}
DATABASE_PASSWORD=${DB_PASSWORD}
DATABASE_NAME=${DB_NAME}
DATABASE_SYNCHRONIZE=false
DATABASE_LOGGING=false
DATABASE_POOL_SIZE=20
DATABASE_MIN_POOL_SIZE=5
DATABASE_IDLE_TIMEOUT_MILLIS=60000
DATABASE_CONNECTION_TIMEOUT_MILLIS=10000
DATABASE_MAX_QUERY_EXECUTION_TIME=30000
DATABASE_SSL=true

# ========== REDIS ==========
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_DB=0
REDIS_TTL=7200
REDIS_MAX_ITEMS=10000
```

---

## Docker Infrastructure

### Step 1: Docker Compose - All Services

**File**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    build:
      context: ./infra/postgresql
      dockerfile: Dockerfile
    container_name: bff_postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres_root_password_change_this
      POSTGRES_DB: postgres
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infra/postgresql/postgresql.conf:/etc/postgresql/postgresql.conf
      - ./infra/postgresql/pg_hba.conf:/etc/postgresql/pg_hba.conf
      - ./infra/postgresql/init-scripts:/docker-entrypoint-initdb.d
    networks:
      - bff_network
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  # Redis Cache
  redis:
    build:
      context: ./infra/redis
      dockerfile: Dockerfile
    container_name: bff_redis
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
      - ./infra/redis/redis.conf:/etc/redis/redis.conf
    networks:
      - bff_network
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 10s
    command: redis-server /etc/redis/redis.conf

  # NestJS BFF Application
  bff:
    build:
      context: ./
      dockerfile: Dockerfile
    container_name: bff_app
    ports:
      - '3000:3000'
    environment:
      NODE_ENV: development
      PORT: 3000
      DATABASE_HOST: postgres
      DATABASE_PORT: 5432
      DATABASE_USER: bff_user
      DATABASE_PASSWORD: bff_secure_password_change_this
      DATABASE_NAME: bff_db
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: ${JWT_SECRET:-your-secret-key}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./src:/app/src
      - ./node_modules:/app/node_modules
    networks:
      - bff_network
    command: npm run start:dev

  # PgAdmin - Database Management (optional, development only)
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: bff_pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@example.com
      PGADMIN_DEFAULT_PASSWORD: admin_password_change_this
    ports:
      - '5050:80'
    depends_on:
      - postgres
    networks:
      - bff_network
    profiles:
      - dev # Only run when dev profile is active

  # Redis Commander - Redis Management (optional, development only)
  redis-commander:
    image: rediscommander/redis-commander:latest
    container_name: bff_redis_commander
    environment:
      REDIS_HOSTS: local:redis:6379
    ports:
      - '8081:8081'
    depends_on:
      - redis
    networks:
      - bff_network
    profiles:
      - dev # Only run when dev profile is active

volumes:
  postgres_data:
  redis_data:

networks:
  bff_network:
    driver: bridge
```

### Step 2: Docker Compose - Production

**File**: `docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  # PostgreSQL Database (Production)
  postgres:
    build:
      context: ./infra/postgresql
      dockerfile: Dockerfile
    container_name: bff_postgres_prod
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_ROOT_PASSWORD}
      POSTGRES_DB: postgres
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - postgres_backups:/var/backups/postgresql
      - ./infra/postgresql/postgresql.conf:/etc/postgresql/postgresql.conf
      - ./infra/postgresql/pg_hba.conf:/etc/postgresql/pg_hba.conf
      - ./infra/postgresql/init-scripts:/docker-entrypoint-initdb.d
    networks:
      - bff_network
    restart: unless-stopped
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 40s
    sysctls:
      - 'net.ipv4.tcp_keepalives_idle=60'
      - 'net.ipv4.tcp_keepalives_interval=30'
      - 'net.ipv4.tcp_keepalives_count=5'

  # Redis Cache (Production)
  redis:
    build:
      context: ./infra/redis
      dockerfile: Dockerfile
    container_name: bff_redis_prod
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
      - ./infra/redis/redis.conf:/etc/redis/redis.conf
    networks:
      - bff_network
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 10s
    command: redis-server /etc/redis/redis.conf

  # NestJS BFF Application (Production)
  bff:
    build:
      context: ./
      dockerfile: Dockerfile
      target: production
    container_name: bff_app_prod
    ports:
      - '3000:3000'
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_HOST: postgres
      DATABASE_PORT: 5432
      DATABASE_USER: ${DB_USER}
      DATABASE_PASSWORD: ${DB_PASSWORD}
      DATABASE_NAME: ${DB_NAME}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: ${CORS_ORIGIN}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - bff_network
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  postgres_data:
  postgres_backups:
  redis_data:

networks:
  bff_network:
    driver: bridge
```

---

## Connection Pooling

### Step 1: Connection Pool Configuration

**File**: `src/services/database-pool.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabasePoolService {
  private readonly logger = new Logger(DatabasePoolService.name);

  constructor(private dataSource: DataSource) {
    this.monitorPoolHealth();
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats() {
    const queryRunner = this.dataSource.createQueryRunner();

    return {
      poolSize: this.dataSource.driver.database.pool.totalConnectionCount,
      availableConnections: this.dataSource.driver.database.pool.availableObjectsCount,
      waitingRequests: this.dataSource.driver.database.pool.waitingRequestCount,
      idleConnections: this.dataSource.driver.database.pool.idleObjectsCount,
    };
  }

  /**
   * Monitor pool health and log warnings
   */
  private monitorPoolHealth(): void {
    setInterval(() => {
      try {
        const stats = this.getPoolStats();

        if (stats.waitingRequests > 5) {
          this.logger.warn(
            `High number of waiting requests: ${stats.waitingRequests}`,
            'DatabasePoolService',
          );
        }

        if (stats.availableConnections === 0) {
          this.logger.error('No available database connections', 'DatabasePoolService');
        }

        this.logger.debug(`Pool Stats: ${JSON.stringify(stats)}`, 'DatabasePoolService');
      } catch (error) {
        this.logger.error('Failed to get pool stats', error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Execute query with automatic retry
   */
  async executeWithRetry<T>(
    query: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await query();
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error;
        }

        this.logger.warn(`Query failed (attempt ${attempt + 1}), retrying in ${delayMs}ms`);

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
}
```

---

## Data Persistence

### Step 1: Database Migrations

**File**: `src/migrations/1000000000000-InitSchema.ts`

```typescript
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class InitSchema1000000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
            length: '255',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'picture',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'roles',
            type: 'text',
            default: "'user'",
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        columnNames: ['email'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        columnNames: ['isActive'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users', true);
  }
}
```

---

## Backup & Recovery

### Step 1: Backup Service

**File**: `src/services/backup.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir = '/var/backups/postgresql';

  constructor() {
    this.ensureBackupDirectory();
  }

  /**
   * Run backup daily at 2 AM
   */
  @Cron('0 2 * * *')
  async dailyBackup(): Promise<void> {
    try {
      this.logger.log('Starting daily backup...');
      await this.backupDatabase();
      await this.cleanOldBackups(7); // Keep 7 days of backups
      this.logger.log('Daily backup completed successfully');
    } catch (error) {
      this.logger.error('Daily backup failed', error);
    }
  }

  /**
   * Backup database
   */
  async backupDatabase(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.backupDir, `bff_db_${timestamp}.sql.gz`);

    const command = `pg_dump -U bff_user -h localhost bff_db | gzip > ${backupFile}`;

    try {
      await execAsync(command, {
        env: {
          PGPASSWORD: process.env.DATABASE_PASSWORD,
        },
      });

      const stats = fs.statSync(backupFile);
      this.logger.log(`Backup created: ${backupFile} (${stats.size} bytes)`);

      return backupFile;
    } catch (error) {
      this.logger.error('Backup failed', error);
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restoreDatabase(backupFile: string): Promise<void> {
    const command = `gunzip -c ${backupFile} | psql -U bff_user -h localhost bff_db`;

    try {
      await execAsync(command, {
        env: {
          PGPASSWORD: process.env.DATABASE_PASSWORD,
        },
      });

      this.logger.log(`Database restored from: ${backupFile}`);
    } catch (error) {
      this.logger.error('Restore failed', error);
      throw error;
    }
  }

  /**
   * Clean old backups
   */
  async cleanOldBackups(daysToKeep: number): Promise<void> {
    const files = fs.readdirSync(this.backupDir);
    const now = Date.now();
    const cutoffTime = now - daysToKeep * 24 * 60 * 60 * 1000;

    files.forEach((file) => {
      const filePath = path.join(this.backupDir, file);
      const stats = fs.statSync(filePath);

      if (stats.mtimeMs < cutoffTime) {
        fs.unlinkSync(filePath);
        this.logger.log(`Deleted old backup: ${file}`);
      }
    });
  }

  /**
   * Ensure backup directory exists
   */
  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * List available backups
   */
  listBackups(): string[] {
    return fs.readdirSync(this.backupDir);
  }
}
```

---

## Performance Tuning

### Step 1: Query Optimization

**File**: `src/interceptors/query-performance.interceptor.ts`

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class QueryPerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(QueryPerformanceInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;

        if (duration > 1000) {
          this.logger.warn(`Slow request detected: ${request.url} took ${duration}ms`);
        }
      }),
    );
  }
}
```

---

## Monitoring

### Step 1: Database & Cache Monitoring Controller

**File**: `src/health/infrastructure.health.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { DataSource } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class InfrastructureHealthIndicator extends HealthIndicator {
  constructor(
    private dataSource: DataSource,
    @InjectRedis() private redis: Redis,
  ) {
    super();
  }

  async checkDatabase(): Promise<HealthIndicatorResult> {
    try {
      await this.dataSource.query('SELECT 1');

      return this.getStatus('database', true, {
        poolSize: this.dataSource.driver.database.pool.totalConnectionCount,
      });
    } catch (error) {
      throw new HealthCheckError('Database health check failed', error);
    }
  }

  async checkRedis(): Promise<HealthIndicatorResult> {
    try {
      await this.redis.ping();

      const info = await this.redis.info('memory');

      return this.getStatus('redis', true, {
        memoryUsage: info,
      });
    } catch (error) {
      throw new HealthCheckError('Redis health check failed', error);
    }
  }
}
```

---

## Security

### Step 1: Database User Roles

**File**: `infra/postgresql/init-scripts/02-secure-roles.sql`

```sql
-- PostgreSQL Security Configuration
-- Created: 2026-05-18

-- Connect to target database
\c bff_db;

-- Create read-only role
CREATE ROLE reader WITH NOSUPERUSER NOCREATEDB NOCREATEROLE;
GRANT CONNECT ON DATABASE bff_db TO reader;
GRANT USAGE ON SCHEMA public TO reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO reader;

-- Create read-write role
CREATE ROLE writer WITH NOSUPERUSER NOCREATEDB NOCREATEROLE;
GRANT CONNECT ON DATABASE bff_db TO writer;
GRANT USAGE ON SCHEMA public TO writer;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO writer;

-- Create admin role
CREATE ROLE admin WITH NOSUPERUSER NOCREATEDB NOCREATEROLE;
GRANT CONNECT ON DATABASE bff_db TO admin;
GRANT ALL ON SCHEMA public TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;

-- Assign roles
GRANT writer TO bff_user;

-- Disable public schema access for security
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
```

---

## Multi-Environment Setup

### Step 1: Environment Scripts

**File**: `scripts/setup-dev.sh`

```bash
#!/bin/bash

# Development Environment Setup
# Usage: ./scripts/setup-dev.sh

set -e

echo "🚀 Setting up development environment..."

# Create .env file from template
if [ ! -f .env.development ]; then
    cp .env.development.example .env.development
    echo "✅ Created .env.development"
else
    echo "⚠️  .env.development already exists"
fi

# Build Docker images
echo "🐳 Building Docker images..."
docker-compose build

# Start services
echo "🔧 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Run migrations
echo "📦 Running database migrations..."
docker-compose exec -T bff npm run typeorm:migrate

# Seed database (optional)
echo "🌱 Seeding database..."
docker-compose exec -T bff npm run seed

echo "✅ Development environment setup completed!"
echo ""
echo "Services running:"
echo "  - BFF API: http://localhost:3000"
echo "  - GraphQL: http://localhost:3000/graphql"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo "  - PgAdmin: http://localhost:5050"
echo "  - Redis Commander: http://localhost:8081"
```

**File**: `scripts/setup-prod.sh`

```bash
#!/bin/bash

# Production Environment Setup
# Usage: ./scripts/setup-prod.sh

set -e

echo "🚀 Setting up production environment..."

# Check required environment variables
required_vars=(
    "DB_HOST"
    "DB_USER"
    "DB_PASSWORD"
    "DB_NAME"
    "REDIS_HOST"
    "REDIS_PASSWORD"
    "JWT_SECRET"
    "CORS_ORIGIN"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required environment variable: $var"
        exit 1
    fi
done

echo "✅ All required environment variables set"

# Pull latest images
echo "📦 Pulling latest Docker images..."
docker-compose -f docker-compose.prod.yml pull

# Build and start services
echo "🐳 Building and starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
echo "📦 Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T bff npm run typeorm:migrate

echo "✅ Production environment setup completed!"
```

---

## Summary

### What You Get

✅ **PostgreSQL Production Setup**

- Optimized configuration
- Connection pooling
- Backup & restore scripts
- Security roles
- Migration system

✅ **Redis Caching**

- Production configuration
- Eviction policies
- Persistence options
- Health checks

✅ **Docker Infrastructure**

- Development Docker Compose
- Production Docker Compose
- Custom Dockerfiles
- Health checks

✅ **NestJS Integration**

- TypeORM configuration
- Redis cache management
- Connection pooling
- Database pool monitoring

✅ **Security**

- User roles & permissions
- Password management
- SSL support
- Secure communication

✅ **Operations**

- Backup automation
- Restore procedures
- Health monitoring
- Performance tuning

---

## Quick Commands

```bash
# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f bff

# Database backup
docker-compose exec postgres pg_dump -U bff_user bff_db | gzip > backup.sql.gz

# Database restore
gunzip -c backup.sql.gz | docker-compose exec -T postgres psql -U bff_user -d bff_db

# Redis CLI
docker-compose exec redis redis-cli

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

---

**Document Created**: 2026-05-18  
**Status**: Production-Ready  
**Database**: PostgreSQL 15  
**Cache**: Redis 7  
**Framework**: NestJS + TypeORM
