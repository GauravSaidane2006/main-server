FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Create data and updates directories
RUN mkdir -p data updates

EXPOSE 5100

CMD ["node", "src/app.js"]
