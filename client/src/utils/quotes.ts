/** 本地励志语库，按天选取，避免外部请求泄漏用户 IP */
const QUOTES = [
  '把每一件简单的事做好就是不简单。',
  '教育的本质意味着一棵树摇动另一棵树。',
  '日事日毕，日清日高。',
  '用心陪伴每一个学生的成长。',
  '今天比昨天进步一点点，就是成功。',
  '细节决定成败，态度决定高度。',
  '做正确的事，再把事做正确。',
  '与其临渊羡鱼，不如退而结网。',
  '行之而不倦，行之以忠。',
  '星光不问赶路人，时光不负有心人。',
];

export function getDailyQuote(): string {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}
