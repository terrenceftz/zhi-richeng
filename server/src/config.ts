import dotenv from 'dotenv';
dotenv.config();

const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || '';
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || '';

const DEFAULT_SECRETS = ['dev-access-secret', 'dev-refresh-secret', 'change-me', 'your-secret-key', ''];
const isTest = process.env.NODE_ENV === 'test';
const isProd = process.env.NODE_ENV === 'production';

// 生产环境：禁止默认/空密钥，否则拒绝启动
if (isProd) {
  if (!jwtAccessSecret || DEFAULT_SECRETS.includes(jwtAccessSecret)) {
    console.error('[FATAL] JWT_ACCESS_SECRET 未设置或使用了默认值，拒绝启动');
    process.exit(1);
  }
  if (!jwtRefreshSecret || DEFAULT_SECRETS.includes(jwtRefreshSecret)) {
    console.error('[FATAL] JWT_REFRESH_SECRET 未设置或使用了默认值，拒绝启动');
    process.exit(1);
  }
}

// 非生产、非测试环境（NODE_ENV 未显式声明）也拒绝默认空密钥
if (!isProd && !isTest && (!jwtAccessSecret || !jwtRefreshSecret)) {
  console.error('[FATAL] 未设置 JWT_ACCESS_SECRET / JWT_REFRESH_SECRET，且 NODE_ENV 非 production/test。请在 .env 中配置。');
  process.exit(1);
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwt: {
    accessSecret: jwtAccessSecret,
    refreshSecret: jwtRefreshSecret,
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  },
};
