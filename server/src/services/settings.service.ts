import prisma from '../db';


export async function getSetting(key: string): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const settings = await prisma.setting.findMany();
  const result: Record<string, string> = {};
  for (const s of settings) {
    result[s.key] = s.value;
  }
  return result;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getDeepSeekApiKey(): Promise<string> {
  const dbKey = await getSetting('deepseek_api_key');
  if (dbKey) return dbKey;
  return process.env.DEEPSEEK_API_KEY || '';
}
