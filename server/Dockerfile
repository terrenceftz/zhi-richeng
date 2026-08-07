FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# 生成 Prisma Client 并编译 TypeScript（与本地 `npm run build` 一致）
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
EXPOSE 3001

# 启动前同步数据库表结构（幂等，不删数据），随后运行编译产物
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss=false && node dist/index.js"]
