#!/bin/bash

# Constitution Application - Main Script Wrapper
# Easy-to-use command interface for development, testing, and deployment

echo "🚀 Constitution Application - Main Script"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Function to kill process on port 3000
kill_port_3000() {
    echo -e "${YELLOW}🔍 Checking port 3000...${NC}"
    if lsof -i :3000 > /dev/null 2>&1; then
        echo -e "${YELLOW}⏳ Found process on port 3000, killing...${NC}"
        lsof -ti :3000 | xargs kill -9 2>/dev/null || true
        sleep 2
        echo -e "${GREEN}✅ Port 3000 freed${NC}"
    else
        echo -e "${GREEN}✅ Port 3000 is already free${NC}"
    fi
}

# Function to show usage
show_usage() {
    echo -e "${BLUE}📋 Available Commands:${NC}"
    echo ""
    echo -e "${GREEN}🚀 Development Commands:${NC}"
    echo "  start              - Start development server with hot reload"
    echo "  start-clean        - Kill port 3000 process then start fresh"
    echo "  start:prod         - Start production server (requires build first)"
    echo "  start:debug        - Start with debug mode and watch"
    echo "  build              - Build TypeScript to JavaScript"
    echo "  dev-setup          - Setup development environment (deps + migrations + seed)"
    echo ""
    echo -e "${GREEN}📦 Database Commands:${NC}"
    echo "  db:setup           - Setup database (start docker + run migrations)"
    echo "  db:reset           - Reset database (drop all + migrations + seed)"
    echo "  migration:show     - Show migration status"
    echo "  migration:generate - Generate new migration from entity changes"
    echo "  migration:run      - Run pending migrations"
    echo "  migration:revert   - Revert last migration"
    echo ""
    echo -e "${GREEN}🧪 Testing Commands:${NC}"
    echo "  test               - Run unit tests"
    echo "  test:watch        - Run unit tests in watch mode"
    echo "  test:cov          - Run tests with coverage report (80% threshold)"
    echo "  test:e2e          - Run end-to-end tests"
    echo "  test:debug        - Run tests with debugger"
    echo ""
    echo -e "${GREEN}⚡ Load Testing Commands:${NC}"
    echo "  loadtest:auth     - Load test authentication endpoints (k6)"
    echo "  loadtest:search   - Load test search endpoints (k6)"
    echo "  loadtest:payment  - Load test payment endpoints (k6)"
    echo "  loadtest:mixed    - Mixed workload stress test (k6)"
    echo ""
    echo -e "${GREEN}🔧 Code Quality Commands:${NC}"
    echo "  lint              - Lint and auto-fix TypeScript"
    echo "  format            - Format code with Prettier"
    echo "  lint:format       - Lint and format together"
    echo ""
    echo -e "${GREEN}🌱 Data Commands:${NC}"
    echo "  seed              - Seed initial data into database"
    echo "  validate          - Validate constitution data"
    echo ""
    echo -e "${GREEN}🔍 Health & Status Commands:${NC}"
    echo "  health            - Check application health endpoint"
    echo "  status            - Show service status (app, db, redis)"
    echo ""
    echo -e "${GREEN}📚 Documentation & Help:${NC}"
    echo "  help              - Show this help message"
    echo "  docs              - Show documentation guide"
    echo "  env-example       - Show environment variables example"
    echo ""
    echo -e "${BLUE}💡 Quick Examples:${NC}"
    echo "  ./main.sh dev-setup        # First time setup everything"
    echo "  ./main.sh start            # Start development"
    echo "  ./main.sh test:cov         # Run tests with coverage"
    echo "  ./main.sh db:reset         # Clean reset database"
    echo ""
}

# Function to open documentation
open_docs() {
    echo -e "${BLUE}📚 Documentation & Guides:${NC}"
    echo ""
    echo -e "${GREEN}📖 Main Documentation:${NC}"
    echo "  CLAUDE.md                  - Claude Code instructions"
    echo "  ERROR_SUMMARY.md           - Error tracking & fixes"
    echo "  README.md                  - Project overview"
    echo ""
    echo -e "${GREEN}🗂️ Code Structure:${NC}"
    echo "  src/auth/                  - Authentication & JWT"
    echo "  src/constitution/          - Constitutional principles"
    echo "  src/performance/           - Performance monitoring"
    echo "  src/governance/            - Governance & amendments"
    echo "  src/payment/               - Payment processing"
    echo "  src/common/                - Shared services & guards"
    echo ""
    echo -e "${GREEN}💾 Database Setup:${NC}"
    echo "  src/database/migrations/   - Schema migrations"
    echo "  src/config/typeorm.config.ts - TypeORM CLI config"
    echo "  docs/SEED_DATA_README.md   - Seed data documentation"
    echo ""
    echo -e "${GREEN}⚡ Load Testing:${NC}"
    echo "  tests/k6/auth-load-test.js        - Auth endpoints (p95 < 100ms)"
    echo "  tests/k6/search-load-test.js      - Search endpoints (p95 < 150ms)"
    echo "  tests/k6/payment-load-test.js     - Payment endpoints (p95 < 200ms)"
    echo "  tests/k6/mixed-workload-test.js   - Combined workload test"
    echo ""
    echo -e "${GREEN}📋 Configuration:${NC}"
    echo "  .env                       - Environment variables"
    echo "  .env.example               - Example environment template"
    echo "  docker-compose.yml         - Docker services (Postgres, Redis)"
    echo "  package.json               - Dependencies & scripts"
    echo ""
}

# Function to show environment variables
show_env_example() {
    echo -e "${BLUE}🔐 Environment Variables (.env):${NC}"
    echo ""
    cat .env.example 2>/dev/null || echo -e "${YELLOW}ℹ️  .env.example not found${NC}"
}

# Function to check health
check_health() {
    echo -e "${BLUE}🏥 Checking Application Health...${NC}"
    echo ""

    # Check if app is running
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Application is running${NC}"
        echo ""
        echo "Health Status:"
        curl -s http://localhost:3000/health | jq . 2>/dev/null || curl -s http://localhost:3000/health
    else
        echo -e "${YELLOW}⚠️  Application is not running on port 3000${NC}"
        echo "    Start it with: ./main.sh start"
    fi
    echo ""
}

# Function to check services status
check_status() {
    echo -e "${BLUE}📊 Service Status Check:${NC}"
    echo ""

    # Check Docker containers
    echo -e "${YELLOW}🐳 Docker Services:${NC}"
    docker ps --filter "label=com.docker.compose.project=nest-k6-testing" --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "    Docker not available"
    echo ""

    # Check Node app
    echo -e "${YELLOW}📱 Node Application:${NC}"
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "    ✅ Running on port 3000"
    else
        echo "    ❌ Not running"
    fi
    echo ""

    # Check Database
    echo -e "${YELLOW}💾 PostgreSQL:${NC}"
    if docker exec constitution-postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "    ✅ Running"
    else
        echo "    ⚠️  Check with: docker ps"
    fi
    echo ""

    # Check Redis
    echo -e "${YELLOW}⚡ Redis:${NC}"
    if docker exec constitution-redis redis-cli ping > /dev/null 2>&1; then
        echo "    ✅ Running"
    else
        echo "    ⚠️  Check with: docker ps"
    fi
    echo ""
}

# Main script logic
case "$1" in
    # Development commands
    "start")
        echo -e "${BLUE}🚀 Starting development server with hot reload...${NC}"
        npm run start:dev
        ;;
    "start-clean")
        echo -e "${BLUE}🚀 Starting development server (clean)...${NC}"
        kill_port_3000
        echo -e "${BLUE}Starting application...${NC}"
        npm run start:dev
        ;;
    "start:prod")
        echo -e "${BLUE}🚀 Building and starting production server...${NC}"
        npm run build
        npm run start:prod
        ;;
    "start:debug")
        echo -e "${BLUE}🐛 Starting with debug mode...${NC}"
        npm run start:debug
        ;;
    "build")
        echo -e "${BLUE}📦 Building application...${NC}"
        npm run build
        echo -e "${GREEN}✅ Build complete${NC}"
        ;;
    "dev-setup")
        echo -e "${BLUE}⚙️  Setting up development environment...${NC}"
        echo -e "${YELLOW}📦 Installing dependencies...${NC}"
        npm install
        echo -e "${YELLOW}💾 Setting up database...${NC}"
        npm run db:setup
        echo -e "${YELLOW}🌱 Seeding data...${NC}"
        npm run migration:run
        echo -e "${GREEN}✅ Development setup complete!${NC}"
        echo -e "${YELLOW}🚀 Start with: ./main.sh start${NC}"
        ;;

    # Database commands
    "db:setup")
        echo -e "${BLUE}💾 Setting up database...${NC}"
        npm run db:setup
        ;;
    "db:reset")
        echo -e "${RED}⚠️  Resetting database (dropping all tables)...${NC}"
        read -p "Continue? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npm run db:reset
            echo -e "${GREEN}✅ Database reset complete${NC}"
        else
            echo -e "${YELLOW}Cancelled${NC}"
        fi
        ;;
    "migration:show")
        echo -e "${BLUE}📋 Showing migration status...${NC}"
        npm run migration:show
        ;;
    "migration:generate")
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Usage: ./main.sh migration:generate <MigrationName>${NC}"
            echo "Example: ./main.sh migration:generate AddUserPreferences"
        else
            echo -e "${BLUE}🔄 Generating migration: $2${NC}"
            npm run migration:generate -- src/database/migrations/$2
        fi
        ;;
    "migration:run")
        echo -e "${BLUE}▶️  Running pending migrations...${NC}"
        npm run migration:run
        ;;
    "migration:revert")
        echo -e "${YELLOW}⚠️  Reverting last migration...${NC}"
        read -p "Continue? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npm run migration:revert
            echo -e "${GREEN}✅ Migration reverted${NC}"
        else
            echo -e "${YELLOW}Cancelled${NC}"
        fi
        ;;

    # Testing commands
    "test")
        echo -e "${BLUE}🧪 Running unit tests...${NC}"
        npm run test
        ;;
    "test:watch")
        echo -e "${BLUE}👁️  Running tests in watch mode...${NC}"
        npm run test:watch
        ;;
    "test:cov")
        echo -e "${BLUE}📊 Running tests with coverage (80% threshold)...${NC}"
        npm run test:cov
        echo -e "${YELLOW}📁 Coverage report: ./coverage/index.html${NC}"
        ;;
    "test:e2e")
        echo -e "${BLUE}🧪 Running end-to-end tests...${NC}"
        npm run test:e2e
        ;;
    "test:debug")
        echo -e "${BLUE}🐛 Running tests with debugger...${NC}"
        npm run test:debug
        ;;

    # Load testing commands
    "loadtest:auth")
        echo -e "${BLUE}⚡ Running authentication load test...${NC}"
        echo -e "${YELLOW}Make sure app is running: ./main.sh start${NC}"
        npm run loadtest:auth
        ;;
    "loadtest:search")
        echo -e "${BLUE}⚡ Running search load test...${NC}"
        echo -e "${YELLOW}Make sure app is running: ./main.sh start${NC}"
        npm run loadtest:search
        ;;
    "loadtest:payment")
        echo -e "${BLUE}⚡ Running payment load test...${NC}"
        echo -e "${YELLOW}Make sure app is running: ./main.sh start${NC}"
        npm run loadtest:payment
        ;;
    "loadtest:mixed")
        echo -e "${BLUE}⚡ Running mixed workload test...${NC}"
        echo -e "${YELLOW}Make sure app is running: ./main.sh start${NC}"
        npm run loadtest:mixed
        ;;

    # Code quality commands
    "lint")
        echo -e "${BLUE}🔍 Linting code...${NC}"
        npm run lint
        echo -e "${GREEN}✅ Linting complete${NC}"
        ;;
    "format")
        echo -e "${BLUE}🎨 Formatting code...${NC}"
        npm run format
        echo -e "${GREEN}✅ Formatting complete${NC}"
        ;;
    "lint:format")
        echo -e "${BLUE}🔍 Linting and formatting...${NC}"
        npm run lint
        npm run format
        echo -e "${GREEN}✅ Complete${NC}"
        ;;

    # Data commands
    "seed")
        echo -e "${BLUE}🌱 Seeding initial data...${NC}"
        npm run seed:constitution
        ;;
    "validate")
        echo -e "${BLUE}✓ Validating constitution data...${NC}"
        npm run constitution:validate
        ;;

    # Health & Status commands
    "health")
        check_health
        ;;
    "status")
        check_status
        ;;

    # Help & Documentation
    "help"|"")
        show_usage
        ;;
    "docs")
        open_docs
        ;;
    "env-example")
        show_env_example
        ;;

    # Unknown command
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo ""
        show_usage
        exit 1
        ;;
esac
