import { Router, Request, Response, NextFunction } from 'express';
import * as XLSX from 'xlsx';
import { authMiddleware } from '../middleware/auth.middleware';
import * as statsService from '../services/stats.service';
import * as audit from '../services/audit.service';
import * as llm from '../services/llm.service';

const router = Router();
router.use(authMiddleware);

/** 从请求构建 scope 上下文 */
function ctxOf(req: Request) {
  return { userId: req.userId, role: req.userRole, college: req.college };
}

async function collectStats(ctx: ReturnType<typeof ctxOf>) {
  const [overview, studentDist, mentalDist, headcount] = await Promise.all([
    statsService.getOverview(ctx),
    statsService.getStudentDist(ctx),
    statsService.getMentalDist(ctx),
    statsService.getHeadcountTable(ctx),
  ]);
  return { overview, studentDist, mentalDist, headcount };
}

// 数据看板：一次返回全部统计
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await collectStats(ctxOf(req)));
  } catch (err) {
    next(err);
  }
});

// AI 看板解读：基于当前统计数据生成文字工作解读
router.post('/insight', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = JSON.stringify(await collectStats(ctxOf(req)));
    const insight = await llm.statsInsight(summary);
    res.json({ insight });
  } catch (err) {
    next(err);
  }
});

// 导出人数统计表（xlsx）：按「法学院在读人数统计」报送表结构生成（澳门班不计入）
router.get('/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { headcount } = await collectStats(ctxOf(req));

    // 表头两行 + 合并（对齐报送模板）：
    // 类型|年级|总计|境内生|境外生(境外总计|中国香港|中国澳门|中国台湾|华侨|留学生)|境外生占比|备注
    const aoa: (string | number)[][] = [
      ['类型', '年级', '总计', '境内生', '境外生', '', '', '', '', '', '境外生占比', '备注（留学生国家）'],
      ['', '', '', '', '境外总计', '中国香港', '中国澳门', '中国台湾', '华侨', '留学生', '', ''],
    ];
    for (const r of headcount) {
      aoa.push([
        r.type === '学院' ? '学院总计' : r.type, r.label, r.total, r.domestic, r.overseas,
        r.hk, r.macau, r.taiwan, r.huaqiao, r.liuxue,
        r.rate, r.countries.join('、'),
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch: 10 }, { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 8 },
      { wch: 10 }, { wch: 24 },
    ];
    // 表头合并：A1:A2 类型；B1:B2 年级；C1:C2 总计；D1:D2 境内生；E1:J1 境外生（跨六列）；K1:K2 占比；L1:L2 备注
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
      { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
      { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },
      { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } },
      { s: { r: 0, c: 4 }, e: { r: 0, c: 9 } },
      { s: { r: 0, c: 10 }, e: { r: 1, c: 10 } },
      { s: { r: 0, c: 11 }, e: { r: 1, c: 11 } },
    ];
    // 总计行（本科总计/研究生总计/学院总计）：类型+年级合并
    headcount.forEach((r, i) => {
      if (r.label === '本科总计' || r.label === '研究生总计' || r.label === '学院总计') {
        ws['!merges']!.push({ s: { r: 2 + i, c: 0 }, e: { r: 2 + i, c: 1 } });
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '在读人数');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    await audit.log(req.userId!, 'export_stats', { ip: req.ip });
    const ts = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`在读人数统计-${ts}.xlsx`)}`);
    res.send(buf);
  } catch (err) {
    next(err);
  }
});

export default router;
