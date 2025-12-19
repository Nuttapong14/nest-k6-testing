# Main Script Guide - Constitution Application

## Quick Start

```bash
# First time setup
./main.sh dev-setup

# Start development
./main.sh start

# Start clean (kill existing process on port 3000)
./main.sh start-clean

# Run tests
./main.sh test:cov

# Check health
./main.sh health
```

## All Commands

### 🚀 Development

| Command | Description |
|---------|-------------|
| `./main.sh start` | Start dev server with hot reload (port 3000) |
| `./main.sh start-clean` | Kill port 3000 process then start fresh |
| `./main.sh start:prod` | Build and start production server |
| `./main.sh start:debug` | Start with debug mode |
| `./main.sh build` | Build TypeScript to JavaScript |
| `./main.sh dev-setup` | Full setup: deps → migrations → seed data |

### 💾 Database

| Command | Description |
|---------|-------------|
| `./main.sh db:setup` | Start Docker + run migrations |
| `./main.sh db:reset` | Drop all + run migrations + seed |
| `./main.sh migration:show` | List all migrations and status |
| `./main.sh migration:run` | Run pending migrations |
| `./main.sh migration:revert` | Revert last migration |
| `./main.sh migration:generate <Name>` | Generate migration from entities |

### 🧪 Testing

| Command | Description |
|---------|-------------|
| `./main.sh test` | Run all unit tests |
| `./main.sh test:watch` | Run tests in watch mode |
| `./main.sh test:cov` | Run tests with coverage (80% threshold) |
| `./main.sh test:e2e` | Run end-to-end tests |
| `./main.sh test:debug` | Run tests with debugger |

### ⚡ Load Testing (k6)

| Command | Description |
|---------|-------------|
| `./main.sh loadtest:auth` | Load test authentication (p95 < 100ms) |
| `./main.sh loadtest:search` | Load test search (p95 < 150ms) |
| `./main.sh loadtest:payment` | Load test payment (p95 < 200ms) |
| `./main.sh loadtest:mixed` | Mixed workload stress test |

> **Note**: App must be running (`./main.sh start`) before load tests

### 🔧 Code Quality

| Command | Description |
|---------|-------------|
| `./main.sh lint` | Lint TypeScript and auto-fix |
| `./main.sh format` | Format code with Prettier |
| `./main.sh lint:format` | Lint and format together |

### 🌱 Data

| Command | Description |
|---------|-------------|
| `./main.sh seed` | Seed initial data |
| `./main.sh validate` | Validate constitution data |

### 🔍 Monitoring

| Command | Description |
|---------|-------------|
| `./main.sh health` | Check app health endpoint |
| `./main.sh status` | Show Docker + app + DB + Redis status |

### 📚 Help

| Command | Description |
|---------|-------------|
| `./main.sh help` | Show all commands |
| `./main.sh docs` | Show documentation guide |
| `./main.sh env-example` | Show .env template |

## Workflow Examples

### First Time Setup
```bash
./main.sh dev-setup
```
This will:
1. Install npm dependencies
2. Start Docker services (PostgreSQL, Redis)
3. Run database migrations
4. Seed initial test data

### Development Workflow
```bash
# Terminal 1: Start app with hot reload
./main.sh start

# Terminal 2: Run tests while developing
./main.sh test:watch

# Terminal 3: Format code before committing
./main.sh lint:format
```

### Testing Before Deployment
```bash
# Run unit tests with coverage
./main.sh test:cov

# Run E2E tests
./main.sh test:e2e

# Run load tests (app must be running)
./main.sh start &  # Start in background
./main.sh loadtest:mixed
```

### Fresh Database
```bash
# Completely reset database
./main.sh db:reset

# Or step by step
./main.sh migration:revert
./main.sh migration:run
```

### Production Deployment
```bash
# Build for production
./main.sh build

# Start production server
./main.sh start:prod
```

## Database Management

### Check Database Status
```bash
./main.sh status
```

### View All Migrations
```bash
./main.sh migration:show
```

### Generate New Migration
```bash
./main.sh migration:generate AddUserPreferences
```
This creates: `src/database/migrations/[timestamp]-AddUserPreferences.ts`

### Manually Run Migrations
```bash
./main.sh migration:run
```

### Revert Last Migration
```bash
./main.sh migration:revert
```

## Seed Data

The project includes 28 test records across these entities:
- **4 Roles**: admin, editor, viewer, qa
- **5 Users**: Alice, Bob, Charlie, Diana, Evan (password: `Test1234!`)
- **5 Principles**: Constitutional principles
- **3 Performance Standards**: Auth, Search, Payment targets
- **3 Governance Rules**: Amendment, Compliance, Deployment
- **3 Amendments**: Different statuses

### Access Test Users
```bash
# All test users have password: Test1234!
admin@constitution.app
editor@constitution.app
viewer@constitution.app
qa@constitution.app
dev@constitution.app
```

## Troubleshooting

### Port 3000 Already in Use
Use the clean start command to automatically kill the existing process:
```bash
./main.sh start-clean
```

Or manually:
```bash
lsof -i :3000
kill -9 <PID>
```

### Database Connection Failed
```bash
# Check if Docker is running
./main.sh status

# Start Docker services
./main.sh db:setup
```

### Tests Fail with Coverage Threshold
The project requires 80% coverage. View detailed report:
```bash
./main.sh test:cov
open coverage/index.html  # or your favorite browser
```

### Load Tests Won't Connect
Make sure app is running first:
```bash
# Terminal 1
./main.sh start

# Terminal 2 (after app starts)
./main.sh loadtest:auth
```

## Environment Variables

Copy `.env.example` to `.env` and customize:
```bash
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=constitution_app

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-key

PORT=3000
NODE_ENV=development
```

## Performance Targets

The application has strict performance requirements:
- **Authentication**: p95 < 100ms @ 500 users
- **Search**: p95 < 150ms @ 1000 users
- **Payment**: p95 < 200ms @ 200 users

Test with: `./main.sh loadtest:mixed`

## API Documentation

Swagger API docs available at: `http://localhost:3000/api-docs`

## Project Structure

```
src/
├── auth/               # JWT authentication & refresh tokens
├── constitution/       # Constitutional principles & versioning
├── performance/        # Performance monitoring & metrics
├── governance/         # Governance rules & amendments
├── payment/           # Payment processing
├── common/            # Shared services & middleware
└── database/
    ├── migrations/    # TypeORM migrations
    └── seeds/        # Seed data
```

## More Information

For detailed documentation:
```bash
./main.sh docs
```

## Support

This script is a wrapper around npm commands. All underlying commands work:
```bash
npm run start:dev    # Same as: ./main.sh start
npm run test        # Same as: ./main.sh test
npm run build       # Same as: ./main.sh build
```

View all available npm scripts in `package.json`.
