import { useThemeStore } from '../../stores/themeStore';
import { cn } from '../../utils/cn';
import type { LucideIcon } from 'lucide-react';

export const KIRBY_STICKERS = {
  starCute: '/themes/kirby/stickers/star-cute.png',
  cakeSmall: '/themes/kirby/stickers/cake-small.png',
  kirbyHi: '/themes/kirby/stickers/kirby-hi.png',
  starHug: '/themes/kirby/stickers/star-hug.png',
  kirbyStrawberry: '/themes/kirby/stickers/kirby-strawberry.png',
  kirbyWink: '/themes/kirby/stickers/kirby-wink.png',
  kirbyRun: '/themes/kirby/stickers/kirby-run.png',
  cakeLarge: '/themes/kirby/stickers/cake-large.png',
  candy: '/themes/kirby/stickers/candy.png',
  kirbySit: '/themes/kirby/stickers/kirby-sit.png',
  bow: '/themes/kirby/stickers/bow.png',
  kirbyBed: '/themes/kirby/stickers/kirby-bed.png',
  kirbyLollipop: '/themes/kirby/stickers/kirby-lollipop.png',
  kirbyWaveBig: '/themes/kirby/stickers/kirby-wave-big.png',
  pinkStar: '/themes/kirby/stickers/pink-star.png',
  kirbyJump: '/themes/kirby/stickers/kirby-jump.png',
  kirbyHappyBig: '/themes/kirby/stickers/kirby-happy-big.png',
  kirbySurprise: '/themes/kirby/stickers/kirby-surprise.png',
  kirbyWalk: '/themes/kirby/stickers/kirby-walk.png',
  kirbySad: '/themes/kirby/stickers/kirby-sad.png',
} as const;

type KirbyStickerKey = keyof typeof KIRBY_STICKERS;

interface StickerProps {
  sticker: KirbyStickerKey;
  className?: string;
  alt?: string;
}

function KirbySticker({ sticker, className, alt = '' }: StickerProps) {
  return (
    <img
      src={KIRBY_STICKERS[sticker]}
      alt={alt}
      aria-hidden={!alt}
      loading="lazy"
      className={cn('pointer-events-none select-none object-contain', className)}
    />
  );
}

export function KirbyPageDecorations() {
  const isKirby = useThemeStore((s) => s.palette === 'kirby');
  if (!isKirby) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(244,114,182,0.12),transparent_22%),radial-gradient(circle_at_88%_18%,rgba(251,207,232,0.15),transparent_18%),radial-gradient(circle_at_70%_82%,rgba(244,114,182,0.08),transparent_22%)]" />
      <KirbySticker sticker="kirbyHappyBig" className="absolute -left-12 bottom-14 hidden w-36 rotate-[-12deg] opacity-10 blur-[0.2px] lg:block" />
      <KirbySticker sticker="starHug" className="absolute -right-12 top-20 hidden w-28 rotate-12 opacity-10 lg:block" />
      <KirbySticker sticker="pinkStar" className="absolute left-[48%] top-10 hidden w-16 rotate-[-8deg] opacity-10 md:block" />
      <KirbySticker sticker="cakeSmall" className="absolute bottom-24 right-[18%] hidden w-18 rotate-6 opacity-10 xl:block" />
      <KirbySticker sticker="bow" className="absolute left-[28%] top-[42%] hidden w-14 rotate-12 opacity-10 xl:block" />
      <KirbySticker sticker="kirbyStrawberry" className="absolute bottom-[46%] right-[3%] hidden w-20 rotate-[-10deg] opacity-10 2xl:block" />
    </div>
  );
}

export function KirbyHeroDecorations() {
  const isKirby = useThemeStore((s) => s.palette === 'kirby');
  if (!isKirby) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <KirbySticker sticker="kirbyHi" className="absolute -left-4 -top-5 w-20 rotate-[-10deg] opacity-60 drop-shadow-xl" />
      <KirbySticker sticker="cakeLarge" className="absolute -right-4 bottom-1 hidden w-20 rotate-6 opacity-50 drop-shadow-xl sm:block" />
      <KirbySticker sticker="starCute" className="absolute right-[26%] -top-7 hidden w-16 rotate-12 opacity-40 drop-shadow-lg md:block" />
      <KirbySticker sticker="candy" className="absolute bottom-3 left-[46%] hidden w-14 rotate-[-15deg] opacity-30 drop-shadow-lg lg:block" />
    </div>
  );
}

export function KirbyCornerSticker({ sticker = 'kirbySit', className }: { sticker?: KirbyStickerKey; className?: string }) {
  const isKirby = useThemeStore((s) => s.palette === 'kirby');
  if (!isKirby) return null;

  // 注意：定位（absolute/right/top/translate）由调用方通过 className 完全指定，
  // 这里不内置任何位置类，避免与调用方传入的同属性类产生 Tailwind 覆盖冲突。
  return (
    <KirbySticker
      sticker={sticker}
      className={cn('pointer-events-none drop-shadow-md transition-transform group-hover:scale-110', className)}
    />
  );
}

export function KirbyMiniCalendarDecorations() {
  const isKirby = useThemeStore((s) => s.palette === 'kirby');
  if (!isKirby) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <KirbySticker sticker="kirbyBed" className="absolute -bottom-1 right-3 w-24 opacity-40" />
      <KirbySticker sticker="cakeSmall" className="absolute -right-4 top-20 w-16 rotate-12 opacity-30" />
      <KirbySticker sticker="bow" className="absolute bottom-6 left-4 w-12 rotate-[-14deg] opacity-30" />
    </div>
  );
}

export function KirbyCalendarPanelDecorations() {
  const isKirby = useThemeStore((s) => s.palette === 'kirby');
  if (!isKirby) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <KirbySticker sticker="kirbyLollipop" className="absolute -right-6 -top-8 w-24 rotate-12 opacity-25" />
      <KirbySticker sticker="kirbyWalk" className="absolute -bottom-7 left-8 w-24 rotate-[-8deg] opacity-20" />
      <KirbySticker sticker="pinkStar" className="absolute bottom-10 right-16 w-16 rotate-12 opacity-20" />
    </div>
  );
}

/** 页面标题右侧的小贴纸：inline 流内显示，仅 Kirby 主题出现 */
export function KirbyHeaderSticker({ sticker = 'starCute', className }: { sticker?: KirbyStickerKey; className?: string }) {
  const isKirby = useThemeStore((s) => s.palette === 'kirby');
  if (!isKirby) return null;

  return <KirbySticker sticker={sticker} className={cn('h-6 w-6 shrink-0', className)} />;
}

/**
 * 页面标题图标：Kirby 主题下用卡比贴纸替换 lucide 图标（避免图标+贴纸重复），
 * 其它主题保持原图标完全不变。
 */
export function KirbyTitleIcon({
  icon: Icon,
  sticker = 'starCute',
  className,
}: {
  icon: LucideIcon;
  sticker?: KirbyStickerKey;
  className?: string;
}) {
  const isKirby = useThemeStore((s) => s.palette === 'kirby');
  if (isKirby) return <KirbySticker sticker={sticker} className={cn('h-6 w-6 shrink-0', className)} />;

  return <Icon className={cn('h-6 w-6 shrink-0', className)} />;
}
