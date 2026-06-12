# Use an official Node.js runtime as a parent image
FROM node:22-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Remix app
RUN npm run build

# Expose the port the app runs on
EXPOSE 80

# Define the command to run the app
CMD ["npm", "start"]