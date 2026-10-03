# @file Dockerfile
# @input Feishu service sources; credentials supplied at runtime only.
# @output A single dependency-free Node service with persistent encrypted SQLite.
FROM node:22-bookworm-slim
ENV NODE_ENV=production FEISHU_HOST=0.0.0.0 FEISHU_PORT=3003 FEISHU_DATABASE_PATH=/data/oauth.sqlite
WORKDIR /app
COPY package.json ./
COPY scripts/run-feishu-server.mjs scripts/feishu-server-env.mjs ./scripts/
COPY server/feishu/ ./server/feishu/
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:3003/api/feishu/status').then(async r=>{const s=await r.json();process.exit(r.ok&&s.configured?0:1)}).catch(()=>process.exit(1))"
CMD ["node", "--experimental-sqlite", "--experimental-strip-types", "scripts/run-feishu-server.mjs", "--production"]
