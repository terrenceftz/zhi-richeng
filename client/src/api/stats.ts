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

export interface StatsData {
  overview: StatsOverview;
  studentDist: {
    byGrade: DistItem[];
    byType: DistItem[];
    byGender: DistItem[];
  };
  mentalDist: {
    byLevel: DistItem[];
    byCategory: DistItem[];
    povertyCount: number;
    followUpTrend: TrendItem[];
    includeTrend: TrendItem[];
  };
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
