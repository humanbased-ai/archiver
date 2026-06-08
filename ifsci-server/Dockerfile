# Use Python 3.9 Alpine as base image
FROM python:3.9-alpine

# Set working directory
WORKDIR /opt/

# Expose port 8080
EXPOSE 8080

# Copy requirements file
COPY ["requirements.txt", "/opt/"]

# Install dependencies
RUN pip3 install flask -r requirements.txt

# Copy application files
COPY [".", "/opt/"]

# Run command
CMD python3 -u server.py
