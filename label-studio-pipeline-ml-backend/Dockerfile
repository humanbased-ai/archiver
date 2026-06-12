FROM python:3.10-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download default YOLO model so container starts faster
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

COPY model.py .

EXPOSE 9090

CMD ["label-studio-ml", "start", ".", "--host", "0.0.0.0", "--port", "9090"]
