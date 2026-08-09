import client from './client';

export interface StatsOverview {
  studentCount: number;
  mentalTargetCount: number;
  counselingCount: number;
  mentalRecordCount: number;
  noticeCount: number;
  taskCount: number;
  overdueTaskCount: number;
  todayTasks: number;
  pendingNoticeCount: number;
  /** 澳门班人数（单独口径，不计入 studentCount/overseasCount/domesticCount） */
  aomenClassCount: number;
  /** 境外生（不含澳门班） */
  overseasCount: number;
  /** 境内生（不含澳门班） */
  domesticCount: number;
  /** 休学人数（状态维度，不计入在读统计） */
  suspendedCount: number;
}

export interface DistItem {
  label: string;
  count: number;
}

export interface TrendItem {
  key: string;
  label: string;
  count: number;
}

/** 人数统计表行（对齐「在读人数统计」报送表；澳门班不计入，单列口径） */
export interface HeadcountRow {
  type: string;      // 本科 / 研究生 / 学院
  label: string;     // 如 24级本科 / 24级学硕 / 本科总计
  total: number;
  domestic: number;
  overseas: number;
  hk: number;        // 中国香港
  macau: number;     // 中国澳门
  taiwan: number;    // 中国台湾
  huaqiao: number;   // 华侨
  liuxue: number;    // 留学生（其他国家）
  rate: number;      // 境外生占比（0-1）
  countries: string[]; // 备注：留学生国家
}

export interface StatsData {
  overview: StatsOverview;
  studentDist: {
    byGrade: DistItem[];
    byType: DistItem[];
    byGender: DistItem[];
    /** 境外生分生源地（不含澳门班，按「港澳台侨」字段分组） */
    byOverseasHometown: DistItem[];
    /** 学历类别（本科生/研究生，不含澳门班） */
    byXueli: DistItem[];
  };
  mentalDist: {
    byLevel: DistItem[];
    byCategory: DistItem[];
    povertyCount: number;
    followUpTrend: TrendItem[];
    includeTrend: TrendItem[];
  };
  headcount: HeadcountRow[];
}

export async function fetchStats(): Promise<StatsData> {
  const { data } = await client.get('/stats');
  return data;
}

/** AI 看板解读：基于当前统计数据生成文字工作解读 */
export async function fetchStatsInsight(): Promise<string> {
  const { data } = await client.post('/stats/insight');
  return data.insight;
}

/** 导出人数统计表（xlsx，与看板同口径） */
export async function exportStatsExcel(): Promise<void> {
  const { data } = await client.get('/stats/export', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([data]));
  const a = document.createElement('a');
  a.href = url;
  const today = new Date().toISOString().slice(0, 10);
  a.download = `人数统计表-${today}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}
