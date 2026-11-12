FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY services/gateway-worker/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund
COPY services/gateway-worker/src ./src
USER node
EXPOSE 9101
CMD ["node", "src/server.mjs"]
