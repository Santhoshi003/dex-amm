FROM node:18-alpine

# Install build dependencies
RUN apk add --no-cache git python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy rest of project
COPY . .

# Compile contracts
RUN npx hardhat compile

CMD ["npx", "hardhat", "test"]
