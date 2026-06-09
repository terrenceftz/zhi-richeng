import dotenv from 'dotenv';
dotenv.config();

const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || '';
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || '';

// 生产环境安全检查：禁止使用默认密钥
if (process.env.NODE_ENV === 'production') {
  const defaultSecrets = ['dev-access-secret', 'dev-refresh-secret', 'change-me', 'your-secret-key'];
  if (!jwtAccessSecret || defaultSecrets.includes(jwtAccessSecret)) {
    console.error('[FATAL] JWT_ACCESS_SECRET 未设置或使用了默认值，拒绝启动');
    process.exit(1);
  }
  if (!jwtRefreshSecret || defaultSecrets.includes(jwtRefreshSecret)) {
    console.error('[FATAL] JWT_REFRESH_SECRET 未设置或使用了默认值，拒绝启动');
    process.exit(1);
  }
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwt: {
    accessSecret: jwtAccessSecret || 'dev-access-secret',
    refreshSecret: jwtRefreshSecret || 'dev-refresh-secret',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  },
};
