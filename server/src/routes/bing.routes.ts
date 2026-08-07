import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';

/**
 * 必应每日壁纸代理
 * 浏览器直接请求 bing.com/HPImageArchive.aspx 会因 CORS 失败，
 * 由服务端代拉每日壁纸 JSON，缓存 1 小时后返回给前端。
 */
const router = Router();

const BING_BASE = 'https://www.bing.com';
const BING_API = `${BING_BASE}/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN`;
const CACHE_TTL = 60 * 60 * 1000; // 1 小时

interface BingWallpaper {
  url: string;
  copyright: string;
  title: string;
}

let cache: { data: BingWallpaper; ts: number } | null = null;

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return res.json(cache.data);
    }
    const resp = await fetch(BING_API, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) throw new Error(`bing api status ${resp.status}`);
    const json = (await resp.json()) as { images?: Array<{ urlbase?: string; url?: string; copyright?: string; title?: string }> };
    const img = json.images?.[0];
    if (!img?.urlbase) throw new Error('bing api: no image');
    const data: BingWallpaper = {
      url: `${BING_BASE}${img.urlbase}_1920x1080.jpg`,
      copyright: img.copyright || '',
      title: img.title || '',
    };
    cache = { data, ts: Date.now() };
    res.json(data);
  } catch (err) {
    // 壁纸拉取失败不影响登录，返回 502 由前端用品牌渐变兜底
    next(err);
  }
});

export default router;
