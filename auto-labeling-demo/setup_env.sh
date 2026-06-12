#!/bin/bash
# One-time environment setup script for auto-labeling-demo

set -e

CONDA_ENV_NAME="auto-labeling"
REQUIRED_PYTHON_VERSION="3.13"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}========================================"
echo "  Auto-Labeling Demo - Environment Setup"
echo "========================================${NC}"
echo ""

# Check if conda is installed
if ! command -v conda &> /dev/null; then
    echo -e "${RED}✗ conda is not installed${NC}"
    echo ""
    echo "Please install Miniconda or Anaconda first:"
    echo "  https://docs.conda.io/en/latest/miniconda.html"
    exit 1
fi
echo -e "${GREEN}✓ conda is installed${NC}"

# Initialize conda
if [ -f "$HOME/miniconda3/etc/profile.d/conda.sh" ]; then
    source "$HOME/miniconda3/etc/profile.d/conda.sh"
elif [ -f "$HOME/anaconda3/etc/profile.d/conda.sh" ]; then
    source "$HOME/anaconda3/etc/profile.d/conda.sh"
elif [ -f "/opt/miniconda3/etc/profile.d/conda.sh" ]; then
    source "/opt/miniconda3/etc/profile.d/conda.sh"
fi

# Check if environment already exists
if conda env list | grep -q "^${CONDA_ENV_NAME} "; then
    echo -e "${YELLOW}! conda environment '${CONDA_ENV_NAME}' already exists${NC}"
    read -p "Do you want to recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Removing existing environment..."
        conda env remove -n ${CONDA_ENV_NAME} -y
    else
        echo "Using existing environment"
        conda activate ${CONDA_ENV_NAME}
        echo -e "${GREEN}✓ Environment activated${NC}"
        
        # Check if packages are installed
        echo ""
        echo "Checking installed packages..."
        NEED_INSTALL=false
        
        PACKAGES=("fastapi" "uvicorn" "cv2" "numpy" "ultralytics" "torch" "torchvision" "httpx")
        PACKAGE_NAMES=("fastapi" "uvicorn" "opencv" "numpy" "ultralytics" "torch" "torchvision" "httpx")
        
        for i in "${!PACKAGES[@]}"; do
            package="${PACKAGES[$i]}"
            display_name="${PACKAGE_NAMES[$i]}"
            if ! python -c "import ${package}" 2>/dev/null; then
                echo -e "${YELLOW}! ${display_name} not found${NC}"
                NEED_INSTALL=true
            fi
        done
        
        if [ "$NEED_INSTALL" = true ]; then
            echo ""
            echo -e "${YELLOW}Installing missing packages...${NC}"
            conda install -y -c conda-forge fastapi uvicorn python-multipart opencv numpy ultralytics httpx
            conda install -y pytorch torchvision -c pytorch
        fi
        
        echo ""
        echo -e "${GREEN}✓ All packages are installed${NC}"
        
        # Verify YOLOv8
        if python -c "from ultralytics import YOLO; print('YOLOv8 available')" 2>/dev/null; then
            echo -e "${GREEN}✓ YOLOv8 is ready${NC}"
        else
            echo -e "${RED}✗ YOLOv8 verification failed${NC}"
            exit 1
        fi
        
        echo ""
        echo -e "${GREEN}========================================"
        echo "  Environment is ready!"
        echo "========================================${NC}"
        echo ""
        echo "Next steps:"
        echo "  1. Install frontend dependencies: cd frontend && npm install"
        echo "  2. Start services: npm run dev"
        exit 0
    fi
fi

# Create new environment
echo ""
echo -e "${BLUE}Creating conda environment '${CONDA_ENV_NAME}'...${NC}"
conda create -n ${CONDA_ENV_NAME} python=${REQUIRED_PYTHON_VERSION} -y

# Activate environment
conda activate ${CONDA_ENV_NAME}
echo -e "${GREEN}✓ Environment created and activated${NC}"
echo "  Python: $(which python)"
echo "  Version: $(python --version)"

# Install backend dependencies
echo ""
echo -e "${BLUE}Installing backend dependencies...${NC}"
echo "This may take a few minutes..."
echo ""

echo "Step 1/2: Installing base packages (fastapi, uvicorn, opencv, etc.)..."
conda install -y -c conda-forge fastapi uvicorn python-multipart opencv numpy ultralytics httpx

echo ""
echo "Step 2/2: Installing PyTorch..."
conda install -y pytorch torchvision -c pytorch

echo ""
echo -e "${GREEN}✓ All backend dependencies installed${NC}"

# Verify installation
echo ""
echo -e "${BLUE}Verifying installation...${NC}"

VERIFICATION_FAILED=false

PACKAGES=("fastapi" "uvicorn" "cv2" "numpy" "ultralytics" "torch" "torchvision" "httpx")
PACKAGE_NAMES=("fastapi" "uvicorn" "opencv" "numpy" "ultralytics" "torch" "torchvision" "httpx")

for i in "${!PACKAGES[@]}"; do
    package="${PACKAGES[$i]}"
    display_name="${PACKAGE_NAMES[$i]}"
    
    if python -c "import ${package}" 2>/dev/null; then
        echo -e "${GREEN}✓ ${display_name}${NC}"
    else
        echo -e "${RED}✗ ${display_name} failed${NC}"
        VERIFICATION_FAILED=true
    fi
done

if [ "$VERIFICATION_FAILED" = true ]; then
    echo ""
    echo -e "${RED}Some packages failed to install. Please check the errors above.${NC}"
    exit 1
fi

# Verify YOLOv8
echo ""
if python -c "from ultralytics import YOLO; print('YOLOv8 available')" 2>/dev/null; then
    echo -e "${GREEN}✓ YOLOv8 is ready${NC}"
else
    echo -e "${RED}✗ YOLOv8 verification failed${NC}"
    exit 1
fi

# Install frontend dependencies
echo ""
echo -e "${BLUE}Installing frontend dependencies...${NC}"
cd frontend
npm install
cd ..
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

# Final summary
echo ""
echo -e "${GREEN}========================================"
echo "  Setup Complete!"
echo "========================================${NC}"
echo ""
echo "Environment Details:"
echo "  • Conda environment: ${CONDA_ENV_NAME}"
echo "  • Python version: $(python --version)"
echo "  • Backend dependencies: ✓ Installed"
echo "  • Frontend dependencies: ✓ Installed"
echo "  • YOLOv8: ✓ Ready"
echo ""
echo "To start the application:"
echo "  1. Activate conda environment:"
echo "     ${YELLOW}conda activate ${CONDA_ENV_NAME}${NC}"
echo ""
echo "  2. Start both frontend and backend:"
echo "     ${YELLOW}npm run dev${NC}"
echo ""
echo "  Or start them separately:"
echo "     ${YELLOW}npm run dev:fe${NC}  # Frontend only"
echo "     ${YELLOW}npm run dev:be${NC}  # Backend only"
echo ""
echo "Service URLs:"
echo "  • Frontend:       http://localhost:5173"
echo "  • Labeling API:   http://localhost:8000"
echo "  • Vision Engine:  http://localhost:8001"
echo "  • Health:         http://localhost:8000/api/health"
echo ""
echo -e "${BLUE}Happy coding! 🚀${NC}"
