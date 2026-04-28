# Use Node 18 LTS
FROM node:18-slim

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port (default 3000)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
