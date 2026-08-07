import client from './client';

export interface BingWallpaper {
  url: string;
  copyright: string;
  title: string;
}

/** 获取必应每日壁纸，失败返回 null（由页面用品牌渐变兜底） */
export async function fetchWallpaper(): Promise<BingWallpaper | null> {
  try {
    const { data } = await client.get<BingWallpaper>('/bing-wallpaper');
    return data?.url ? data : null;
  } catch {
    return null;
  }
}
