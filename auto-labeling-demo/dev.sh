#!/bin/bash
# dev.sh - Development server manager for auto-labeling-demo

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

FRONTEND_DIR="frontend"
API_DIR="labeling-api"
ENGINE_DIR="vision-engine"
CONDA_ENV_NAME="auto-labeling"

# Initialize conda for this shell
init_conda() {
  if [ -f "$HOME/miniconda3/etc/profile.d/conda.sh" ]; then
    source "$HOME/miniconda3/etc/profile.d/conda.sh"
  elif [ -f "$HOME/anaconda3/etc/profile.d/conda.sh" ]; then
    source "$HOME/anaconda3/etc/profile.d/conda.sh"
  elif [ -f "/opt/miniconda3/etc/profile.d/conda.sh" ]; then
    source "/opt/miniconda3/etc/profile.d/conda.sh"
  else
    echo -e "${RED}Error: Could not find conda installation${NC}"
    exit 1
  fi
}

# Function to stop existing processes
stop_processes() {
  echo -e "${YELLOW}Stopping existing processes...${NC}"
  lsof -ti:5173 | xargs kill -9 2>/dev/null
  lsof -ti:8000 | xargs kill -9 2>/dev/null
  lsof -ti:8001 | xargs kill -9 2>/dev/null
  pkill -f "vite" 2>/dev/null
  pkill -f "uvicorn.*labeling" 2>/dev/null
  pkill -f "uvicorn.*vision" 2>/dev/null
  pkill -f "python.*main.py" 2>/dev/null
  sleep 1
  echo -e "${GREEN}Processes stopped${NC}"
}

# Start frontend
start_frontend() {
  echo -e "${GREEN}Starting Frontend (Vite)...${NC}"
  cd "$FRONTEND_DIR"
  npm run dev &
  cd ..
}

# Start Labeling API
start_api() {
  echo -e "${GREEN}Starting Labeling API (port 8000)...${NC}"
  init_conda
  conda activate ${CONDA_ENV_NAME}
  cd "$API_DIR"
  python main.py &
  cd ..
}

# Start Vision Engine
start_engine() {
  echo -e "${GREEN}Starting Vision Engine (port 8001)...${NC}"
  init_conda
  conda activate ${CONDA_ENV_NAME}
  cd "$ENGINE_DIR"
  python main.py &
  cd ..
}

# Restart individual services
restart_frontend() {
  echo -e "${YELLOW}Restarting Frontend...${NC}"
  lsof -ti:5173 | xargs kill -9 2>/dev/null
  pkill -f "vite" 2>/dev/null
  sleep 1
  start_frontend
  echo -e "${GREEN}Frontend restarted on http://localhost:5173${NC}"
}

restart_api() {
  echo -e "${YELLOW}Restarting Labeling API...${NC}"
  lsof -ti:8000 | xargs kill -9 2>/dev/null
  sleep 1
  start_api
  echo -e "${GREEN}Labeling API restarted on http://localhost:8000${NC}"
}

restart_engine() {
  echo -e "${YELLOW}Restarting Vision Engine...${NC}"
  lsof -ti:8001 | xargs kill -9 2>/dev/null
  sleep 1
  start_engine
  echo -e "${GREEN}Vision Engine restarted on http://localhost:8001${NC}"
}

# Show usage
show_help() {
  echo "Usage: ./dev.sh [command]"
  echo ""
  echo "Commands:"
  echo "  start     - Start all services (frontend + API + engine)"
  echo "  stop      - Stop all processes"
  echo "  restart   - Restart all services"
  echo "  fe        - Restart frontend only"
  echo "  api       - Restart Labeling API only"
  echo "  engine    - Restart Vision Engine only"
  echo "  status    - Show running processes"
}

case "${1:-start}" in
  start)
    stop_processes
    start_engine
    sleep 2
    start_api
    sleep 1
    start_frontend
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}  Frontend:       http://localhost:5173${NC}"
    echo -e "${GREEN}  Labeling API:   http://localhost:8000${NC}"
    echo -e "${GREEN}  Vision Engine:  http://localhost:8001${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all processes${NC}"
    wait
    ;;
  stop)
    stop_processes
    ;;
  restart)
    stop_processes
    start_engine
    sleep 2
    start_api
    sleep 1
    start_frontend
    echo -e "${GREEN}All services restarted${NC}"
    wait
    ;;
  fe|frontend)
    restart_frontend
    ;;
  api)
    restart_api
    ;;
  engine)
    restart_engine
    ;;
  be|backend)
    # Backward compat: restart both API + engine
    restart_engine
    sleep 1
    restart_api
    ;;
  status)
    echo -e "${YELLOW}Frontend (port 5173):${NC}"
    lsof -ti:5173 | xargs ps 2>/dev/null || echo "  Not running"
    echo -e "${YELLOW}Labeling API (port 8000):${NC}"
    lsof -ti:8000 | xargs ps 2>/dev/null || echo "  Not running"
    echo -e "${YELLOW}Vision Engine (port 8001):${NC}"
    lsof -ti:8001 | xargs ps 2>/dev/null || echo "  Not running"
    ;;
  help|-h|--help)
    show_help
    ;;
  *)
    echo -e "${RED}Unknown command: $1${NC}"
    show_help
    exit 1
    ;;
esac
