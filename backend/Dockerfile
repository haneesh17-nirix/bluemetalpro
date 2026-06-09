FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
# rootDir is repo root (cross-package imports), so tsc outputs to dist/backend/src/
CMD ["node", "dist/backend/src/index.js"]
