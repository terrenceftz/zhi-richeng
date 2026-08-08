import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Plus, Search, Trash2, MessageSquarePlus, Upload, Download, Pencil, Heart, AlertCircle, SlidersHorizontal, X } from 'lucide-react';
import * as studentsApi from '../api/students';
import * as counselingApi from '../api/counseling';
import * as mentalApi from '../api/mental';
import type { Student, Counseling, MentalRecord, MentalProfile, StudentField } from '../types';
import { COUNSELING_TYPES, STUDENT_TYPES, STUDENT_TYPE_LABELS, MENTAL_LEVELS, MENTAL_LEVEL_LABELS, MENTAL_STATUS_LABELS, MENTAL_CATEGORIES, CONCERN_LEVEL_LABELS } from '../types';
import Card from '../components/ui/Card';
import { KirbyTitleIcon } from '../components/theme/KirbyDecorations';
import Button from '../components/ui/Button';
import Input, { Select, Textarea } from '../components/ui/Input';
import Drawer from '../components/ui/Drawer';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Switch from '../components/ui/Switch';
import { LoadingState, EmptyState } from '../components/ui/Feedback';
import { useToastStore } from '../stores/toastStore';
import { useAuthStore } from '../stores/authStore';
import { parseExcelFile, downloadTemplate } from '../utils/studentImport';

export default function StudentsPage() {
  const toast = useToastStore();
  const { user } = useAuthStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [classes, setClasses] = useState<string[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [className, setClassName] = useState('');
  const [grade, setGrade] = useState('');
  const [mentalOnly, setMentalOnly] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // 扩展字段配置
  const [extraFields, setExtraFields] = useState<StudentField[]>([]);
  const [presetFields, setPresetFields] = useState<StudentField[]>([]);
  const [builtinFields, setBuiltinFields] = useState<StudentField[]>([]);
  const [fieldOpen, setFieldOpen] = useState(false);
  const canManageFields = user?.role === 'admin' || user?.role === 'dept_admin';
  const pageSize = 30;

  // 加载学生字段配置
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    studentsApi.fetchStudentFields().then((d) => {
      setExtraFields(d.fields || []);
      setPresetFields(d.presets || []);
      setBuiltinFields(d.builtins || []);
    }).catch(() => {});
  }, []);

  const load = async (targetPage = page) => {
    setLoading(true);
    try {
      const result = await studentsApi.fetchStudents({
        q: q || undefined,
        className: className || undefined,
        grade: grade || undefined,
        mentalTarget: mentalOnly ? 'true' : undefined,
        page: targetPage,
        pageSize,
      });
      setStudents(result.students);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setPage(result.page);
    } catch {
      toast.error('加载学生列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 班级/年级筛选项只在首次挂载或导入/删除后刷新（避免每次翻页重复请求）
  const loadFilters = async () => {
    try {
      const [cls, gr] = await Promise.all([studentsApi.fetchClasses(), studentsApi.fetchGrades()]);
      setClasses(cls);
      setGrades(gr);
    } catch {
      /* 忽略 */
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 搜索/筛选变化时回到第 1 页
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, className, grade, mentalOnly]);

  // 翻页
  const goToPage = (p: number) => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(p);
  };

  const openCreate = () => { setEditing(null); setDrawerOpen(true); };
  const openEdit = (s: Student) => { setEditing(s); setDrawerOpen(true); };

  const openDetail = (s: Student) => {
    setDetailStudent(s);
    setDetailOpen(true);
  };

  const handleSave = async (data: Partial<Student>) => {
    try {
      if (editing) {
        await studentsApi.updateStudent(editing.id, data);
        toast.success('已更新');
      } else {
        await studentsApi.createStudent(data);
        toast.success('已添加');
      }
      setDrawerOpen(false);
      load(page);
      loadFilters();
    } catch {
      toast.error('保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该学生及其谈心/台账记录？')) return;
    try {
      await studentsApi.deleteStudent(id);
      toast.success('已删除');
      load(page);
      loadFilters();
    } catch {
      toast.error('删除失败');
    }
  };

  const handleToggleMental = async (s: Student) => {
    try {
      const updated = await mentalApi.toggleMentalTarget(s.id, !s.isMentalTarget);
      setStudents((prev) => prev.map((x) => (x.id === s.id ? { ...x, isMentalTarget: updated.isMentalTarget } : x)));
      toast.success(updated.isMentalTarget ? '已标记为心理台账学生' : '已取消心理台账标记');
    } catch {
      toast.error('操作失败');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const list = await parseExcelFile(file, extraFields);
      if (list.length === 0) {
        toast.error('未解析到有效数据，请检查表头是否包含「姓名」');
      } else {
        const res = await studentsApi.importStudents(list);
        toast.success(res.message || `已导入 ${res.created} 名新增、更新 ${res.updated} 名`);
        load(1);
        loadFilters();
      }
    } catch {
      toast.error('导入失败，请确认是 .xlsx/.xls 文件');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          <KirbyTitleIcon icon={GraduationCap} sticker="kirbySit" className="text-brand-500" />
          学生管理
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {canManageFields && (
            <Button variant="secondary" onClick={() => setFieldOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" /> 字段管理
            </Button>
          )}
          <Button variant="secondary" onClick={() => downloadTemplate(extraFields)}>
            <Download className="h-4 w-4" /> 下载模板
          </Button>
          <label
            title="导入学生花名册：按学号/证件号匹配已有学生则覆盖更新，否则新建"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Upload className="h-4 w-4" /> 导入花名册
            <input type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
          </label>
          <Button onClick={openCreate}><Plus className="h-4 w-4" /> 添加学生</Button>
        </div>
      </div>

      {/* 过滤栏 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索姓名 / 学号 / 手机 / 证件号"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <Select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-32">
          <option value="">全部年级</option>
          {grades.map((g) => <option key={g} value={g}>{g}</option>)}
        </Select>
        <Select value={className} onChange={(e) => setClassName(e.target.value)} className="w-40">
          <option value="">全部班级</option>
          {classes.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${mentalOnly ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>
          <Heart className="h-4 w-4" />
          <input type="checkbox" checked={mentalOnly} onChange={(e) => setMentalOnly(e.target.checked)} className="hidden" />
          心理台账
        </label>
      </div>

      <Card noPadding>
        {loading ? (
          <LoadingState />
        ) : students.length === 0 ? (
          <EmptyState title="还没有学生" hint="点击「添加学生」手动录入，或用「导入 Excel」批量导入" icon={<GraduationCap className="h-6 w-6" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-[13px] md:min-w-0 md:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="whitespace-nowrap px-3 py-3 font-medium md:px-4">姓名</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium md:px-4">学号</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium md:px-4">班级 / 年级</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium md:px-4">学生类型</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium md:px-4">手机</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium md:px-4">台账</th>
                  {extraFields.map((f) => (
                    <th key={f.key} className="whitespace-nowrap px-3 py-3 font-medium md:px-4">{f.label}</th>
                  ))}
                  <th className="whitespace-nowrap px-3 py-3 font-medium md:px-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40 ${s.isMentalTarget ? 'bg-red-50/30 dark:bg-red-500/5' : ''}`}>
                    <td className="px-3 py-3 md:px-4">
                      <button onClick={() => openDetail(s)} className="flex min-w-0 max-w-[12rem] items-center gap-2 font-medium text-brand-600 hover:underline dark:text-brand-400">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                          {s.name.charAt(0)}
                        </span>
                        <span className="truncate">{s.name}</span>
                        {s.isMentalTarget && <Heart className="h-3.5 w-3.5 shrink-0 fill-red-500 text-red-500" />}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-slate-300 md:px-4">{s.studentNo || '-'}</td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300 md:px-4">
                      <span className="block max-w-[12rem] truncate">
                        {s.className || '-'}{s.grade ? <span className="text-slate-400"> / {s.grade}</span> : null}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 md:px-4">
                      {s.studentType
                        ? <Badge tone={s.studentType === 'overseas' ? 'blue' : 'gray'}>{STUDENT_TYPE_LABELS[s.studentType] || s.studentType}</Badge>
                        : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-slate-300 md:px-4">{s.phone || '-'}</td>
                    <td className="px-3 py-3 md:px-4">
                      <button onClick={() => handleToggleMental(s)} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${s.isMentalTarget ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/15 dark:text-red-300' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}>
                        <Heart className={`h-3 w-3 ${s.isMentalTarget ? 'fill-current' : ''}`} />
                        {s.isMentalTarget ? `${s._count?.mentalRecords || 0} 条` : '标记'}
                      </button>
                    </td>
                    {extraFields.map((f) => (
                      <td key={f.key} className="max-w-[10rem] truncate px-3 py-3 text-slate-600 dark:text-slate-300 md:px-4">
                        {s.extras?.[f.key] != null && s.extras[f.key] !== '' ? String(s.extras[f.key]) : '-'}
                      </td>
                    ))}
                    <td className="px-3 py-3 md:px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800" aria-label="编辑">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" aria-label="删除">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 分页 */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              共 {total} 名学生 · 第 {page}/{totalPages} 页
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                aria-label="上一页"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                上一页
              </button>
              {/* 页码（最多显示 5 个） */}
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                return (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      p === page
                        ? 'bg-brand-600 text-white'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                aria-label="下一页"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* 添加/编辑抽屉 */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? '编辑学生' : '添加学生'} width="max-w-lg">
        <StudentForm key={editing?.id || 'create'} initial={editing || undefined} fields={extraFields} onSubmit={handleSave} onCancel={() => setDrawerOpen(false)} />
      </Drawer>

      {/* 详情 + 谈心/台账 */}
      <Drawer open={detailOpen} onClose={() => setDetailOpen(false)} title={detailStudent?.name} width="max-w-lg">
        {detailStudent && (
          <StudentDetail
            key={detailStudent.id}
            student={detailStudent}
            fields={extraFields}
            onToggleMental={() => handleToggleMental(detailStudent)}
            onMentalChanged={() => load()}
            onProfileSaved={async () => {
              // 档案保存后刷新详情中的学生数据（含 mentalProfile）
              const fresh = await studentsApi.fetchStudent(detailStudent.id);
              setDetailStudent(fresh);
              load();
            }}
          />
        )}
      </Drawer>

      {/* 字段管理弹窗（系统管理员/院系管理员） */}
      {fieldOpen && (
        <FieldManager
          fields={extraFields}
          presets={presetFields}
          builtins={builtinFields}
          onClose={() => setFieldOpen(false)}
          onSaved={(fields) => {
            setExtraFields(fields);
            load();
          }}
        />
      )}
    </div>
  );
}

function StudentForm({ initial, fields, onSubmit, onCancel }: { initial?: Student; fields: StudentField[]; onSubmit: (d: Partial<Student>) => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name || '');
  const [studentNo, setStudentNo] = useState(initial?.studentNo || '');
  const [gender, setGender] = useState(initial?.gender || '');
  const [birthDate, setBirthDate] = useState(initial?.birthDate?.slice(0, 10) || '');
  const [studentType, setStudentType] = useState(initial?.studentType || '');
  const [idNumber, setIdNumber] = useState(initial?.idNumber || '');
  const [grade, setGrade] = useState(initial?.grade || '');
  const [className, setClassName] = useState(initial?.className || '');
  const [hometown, setHometown] = useState(initial?.hometown || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [dormitory, setDormitory] = useState(initial?.dormitory || '');
  const [address, setAddress] = useState(initial?.address || '');
  const [remark, setRemark] = useState(initial?.remark || '');
  const [extras, setExtras] = useState<Record<string, any>>(initial?.extras || {});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanExtras: Record<string, any> = {};
    Object.entries(extras).forEach(([k, v]) => {
      if (v != null && v !== '') cleanExtras[k] = v;
    });
    await onSubmit({
      name, studentNo, gender, birthDate: birthDate || undefined, studentType: studentType || undefined,
      idNumber, grade, className, hometown, phone, dormitory, address, remark,
      extras: Object.keys(cleanExtras).length > 0 ? cleanExtras : undefined,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="姓名" id="sName" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="学号" id="sNo" value={studentNo} onChange={(e) => setStudentNo(e.target.value)} />
        <Select label="性别" id="sGender" value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="">未填写</option>
          <option value="男">男</option>
          <option value="女">女</option>
        </Select>
        <Input label="出生日期" id="sBirth" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        <Select label="学生类型" id="sType" value={studentType} onChange={(e) => setStudentType(e.target.value)}>
          <option value="">未填写</option>
          {STUDENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
        <Input label="证件号码" id="sId" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} hint={studentType === 'domestic' ? '境内生为身份证号' : undefined} />
        <Input label="年级" id="sGrade" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="如 2024级" />
        <Input label="班级" id="sClass" value={className} onChange={(e) => setClassName(e.target.value)} />
        <Input label="籍贯" id="sHometown" value={hometown} onChange={(e) => setHometown(e.target.value)} />
        <Input label="手机" id="sPhone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="宿舍" id="sDorm" value={dormitory} onChange={(e) => setDormitory(e.target.value)} />
        <Input label="家庭住址" id="sAddr" value={address} onChange={(e) => setAddress(e.target.value)} />
        {fields.map((f) => (
          f.type === 'select'
            ? (
              <Select key={f.key} label={f.label} id={`sX-${f.key}`} value={extras[f.key] || ''} onChange={(e) => setExtras({ ...extras, [f.key]: e.target.value })}>
                <option value="">未填写</option>
                {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
            )
            : (
              <Input key={f.key} label={f.label} id={`sX-${f.key}`} value={extras[f.key] || ''} onChange={(e) => setExtras({ ...extras, [f.key]: e.target.value })} />
            )
        ))}
      </div>
      <Textarea label="备注" id="sRemark" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="关注事项、家庭情况等" />
      <div className="flex gap-3 pt-1">
        <Button type="submit" className="flex-1">保存</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>取消</Button>
      </div>
    </form>
  );
}

function StudentDetail({ student, fields, onToggleMental, onMentalChanged, onProfileSaved }: {
  student: Student;
  fields: StudentField[];
  onToggleMental: () => void;
  onMentalChanged: () => void;
  onProfileSaved: () => Promise<void>;
}) {
  const [tab, setTab] = useState<'info' | 'counseling' | 'mental'>('info');
  const [counselings, setCounselings] = useState<Counseling[]>([]);
  const [mentalRecords, setMentalRecords] = useState<MentalRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    (async () => {
      setLoadingRecords(true);
      try {
        const [c, m] = await Promise.all([
          counselingApi.fetchCounselings({ studentId: student.id }),
          mentalApi.fetchMentalRecords({ studentId: student.id }),
        ]);
        setCounselings(c);
        setMentalRecords(m);
      } catch {
        /* ignore */
      } finally {
        setLoadingRecords(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id]);

  return (
    <div className="space-y-4">
      {/* 台账标记横幅 */}
      <div className={`flex items-center justify-between rounded-lg border p-3 ${student.isMentalTarget ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50'}`}>
        <div className="flex items-center gap-2">
          <Heart className={`h-4 w-4 ${student.isMentalTarget ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {student.isMentalTarget ? '心理台账重点关注学生' : '普通学生'}
          </span>
        </div>
        <Switch checked={!!student.isMentalTarget} onChange={onToggleMental} label="心理台账" />
      </div>

      {/* 标签页 */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {([
          { key: 'info', label: '基本信息' },
          { key: 'counseling', label: `谈心记录${counselings.length > 0 ? ` (${counselings.length})` : ''}` },
          { key: 'mental', label: `心理台账${mentalRecords.length > 0 ? ` (${mentalRecords.length})` : ''}` },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative px-3 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            {t.label}
            {tab === t.key && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-brand-600" />}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="学号" value={student.studentNo} />
            <Info label="性别" value={student.gender} />
            <Info label="出生日期" value={student.birthDate?.slice(0, 10)} />
            <Info label="学生类型" value={student.studentType ? STUDENT_TYPE_LABELS[student.studentType] || student.studentType : undefined} />
            <Info label="证件号码" value={student.idNumber} />
            <Info label="年级" value={student.grade} />
            <Info label="班级" value={student.className} />
            <Info label="籍贯" value={student.hometown} />
            <Info label="手机" value={student.phone} />
            <Info label="宿舍" value={student.dormitory} />
            <Info label="家庭住址" value={student.address} />
            {fields.map((f) => (
              <Info key={f.key} label={f.label} value={student.extras?.[f.key] != null ? String(student.extras[f.key]) : undefined} />
            ))}
          </div>
          {student.remark && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
              {student.remark}
            </div>
          )}
        </div>
      )}

      {tab === 'counseling' && (
        <CounselingTab studentId={student.id} counselings={counselings} loading={loadingRecords} onChanged={async () => {
          const c = await counselingApi.fetchCounselings({ studentId: student.id });
          setCounselings(c);
        }} />
      )}

      {tab === 'mental' && (
        <MentalTab
          studentId={student.id}
          profile={student.mentalProfile}
          records={mentalRecords}
          loading={loadingRecords}
          onChanged={async () => {
            const m = await mentalApi.fetchMentalRecords({ studentId: student.id });
            setMentalRecords(m);
            onMentalChanged();
          }}
          onProfileSaved={async () => {
            onMentalChanged();
            await onProfileSaved();
          }}
        />
      )}
    </div>
  );
}

function CounselingTab({ studentId, counselings, loading, onChanged }: {
  studentId: string;
  counselings: Counseling[];
  loading: boolean;
  onChanged: () => Promise<void>;
}) {
  const toast = useToastStore();
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState('日常');
  const [content, setContent] = useState('');
  const [followUp, setFollowUp] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      await counselingApi.createCounseling({ studentId, date, type, content: content.trim(), followUp: followUp.trim() || undefined });
      toast.success('已记录');
      setContent(''); setFollowUp(''); setShowForm(false);
      await onChanged();
    } catch { toast.error('保存失败'); }
  };

  if (loading) return <p className="py-6 text-center text-sm text-slate-400">加载中...</p>;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">谈心谈话记录</h4>
        <Button size="sm" variant="secondary" onClick={() => setShowForm(!showForm)}>
          <MessageSquarePlus className="h-4 w-4" /> 新增
        </Button>
      </div>
      {showForm && (
        <form onSubmit={submit} className="mb-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="grid grid-cols-2 gap-3">
            <Input label="日期" id="cDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Select label="类型" id="cType" value={type} onChange={(e) => setType(e.target.value)}>
              {COUNSELING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <Textarea label="内容" id="cContent" value={content} onChange={(e) => setContent(e.target.value)} required />
          <Input label="后续跟进（选填）" id="cFollow" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
          <Button type="submit" size="sm">保存记录</Button>
        </form>
      )}
      {counselings.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">暂无谈心记录</p>
      ) : (
        <div className="space-y-3">
          {counselings.map((c) => (
            <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-1 flex items-center justify-between">
                <Badge tone="brand">{c.type}</Badge>
                <span className="text-xs text-slate-400">{new Date(c.date).toLocaleDateString('zh-CN')}</span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200">{c.content}</p>
              {c.followUp && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">跟进：{c.followUp}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MentalTab({ studentId, profile, records, loading, onChanged, onProfileSaved }: {
  studentId: string;
  profile?: MentalProfile;
  records: MentalRecord[];
  loading: boolean;
  onChanged: () => Promise<void>;
  onProfileSaved: () => Promise<void>;
}) {
  const toast = useToastStore();
  const [showForm, setShowForm] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [level, setLevel] = useState('normal');
  const [status, setStatus] = useState('active');
  const [situation, setSituation] = useState('');
  const [action, setAction] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  // 档案编辑字段
  const [isPoverty, setIsPoverty] = useState(profile?.isPoverty || false);
  const [concernLevel, setConcernLevel] = useState(profile?.concernLevel || 1);
  const [categories, setCategories] = useState<string[]>(profile?.categories || []);
  const [includedAt, setIncludedAt] = useState(profile?.includedAt?.slice(0, 10) || '');
  const [includeReason, setIncludeReason] = useState(profile?.includeReason || '');
  const [followUpPerson, setFollowUpPerson] = useState(profile?.followUpPerson || '');
  const [parentInformed, setParentInformed] = useState(profile?.parentInformed || false);
  const [parentPhone, setParentPhone] = useState(profile?.parentPhone || '');
  const [remark, setRemark] = useState(profile?.remark || '');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!situation.trim()) return;
    try {
      await mentalApi.createMentalRecord({
        studentId, date, level, status,
        situation: situation.trim(),
        action: action.trim() || undefined,
        followUp: followUp.trim() || undefined,
        followUpDate: followUpDate || undefined,
      });
      toast.success('已添加台账记录');
      setSituation(''); setAction(''); setFollowUp(''); setFollowUpDate(''); setShowForm(false);
      await onChanged();
    } catch {
      toast.error('保存失败');
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mentalApi.upsertMentalProfile(studentId, {
        isPoverty, concernLevel,
        categories: categories.length > 0 ? categories : ['心理健康'],
        includedAt: includedAt || undefined,
        includeReason: includeReason || undefined,
        followUpPerson: followUpPerson || undefined,
        parentInformed, parentPhone: parentPhone || undefined, remark: remark || undefined,
      });
      toast.success('档案已保存');
      setEditProfile(false);
      await onProfileSaved();
    } catch {
      toast.error('保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该台账记录？')) return;
    try {
      await mentalApi.deleteMentalRecord(id);
      toast.success('已删除');
      await onChanged();
    } catch { toast.error('删除失败'); }
  };

  const handleStatus = async (rec: MentalRecord) => {
    const next = rec.status === 'active' ? 'closed' : 'active';
    try {
      await mentalApi.updateMentalRecord(rec.id, { status: next });
      toast.success(next === 'closed' ? '已结案' : '已重新关注');
      await onChanged();
    } catch { toast.error('更新失败'); }
  };

  if (loading) return <p className="py-6 text-center text-sm text-slate-400">加载中...</p>;

  // 档案展示视图
  if (!editProfile) {
    return (
      <div className="space-y-4">
        {/* 档案摘要 */}
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-500/30 dark:bg-red-500/5">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Heart className="h-4 w-4 text-red-500" /> 台账档案
            </h4>
            <div className="flex items-center gap-2">
              <Link to="/mental" className="text-xs text-brand-600 hover:underline dark:text-brand-400">到台账模块</Link>
              <Button size="sm" variant="secondary" onClick={() => setEditProfile(true)}>
                <Pencil className="h-3.5 w-3.5" /> 编辑档案
              </Button>
            </div>
          </div>
          {profile ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <ProfileInfo label="关注级别" value={`${CONCERN_LEVEL_LABELS[profile.concernLevel] || profile.concernLevel}${profile.concernLevel === 3 ? '（最高）' : ''}`} />
              <ProfileInfo label="类别" value={profile.categories.join('、') || '未设置'} />
              <ProfileInfo label="经济困难" value={profile.isPoverty ? '是' : '否'} />
              <ProfileInfo label="纳入时间" value={profile.includedAt?.slice(0, 10)} />
              <ProfileInfo label="纳入原因" value={profile.includeReason} />
              <ProfileInfo label="跟进人" value={profile.followUpPerson} />
              <ProfileInfo label="家长知情" value={profile.parentInformed ? `是${profile.parentPhone ? `（${profile.parentPhone}）` : ''}` : '否'} />
              <ProfileInfo label="备注" value={profile.remark} />
            </div>
          ) : (
            <p className="text-xs text-slate-400">档案未完善，点击「编辑档案」填写完整信息</p>
          )}
        </div>

        {/* 跟进记录 */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Heart className="h-4 w-4 text-red-500" /> 跟进记录
            </h4>
            <Button size="sm" variant="secondary" onClick={() => setShowForm(!showForm)}>
              <MessageSquarePlus className="h-4 w-4" /> 新增
            </Button>
          </div>

          {showForm && (
            <form onSubmit={submit} className="mb-4 space-y-3 rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-500/30 dark:bg-red-500/5">
              <div className="grid grid-cols-2 gap-3">
                <Input label="日期" id="mDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                <Select label="关注等级" id="mLevel" value={level} onChange={(e) => setLevel(e.target.value)}>
                  {MENTAL_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </Select>
                <Select label="状态" id="mStatus" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="active">关注中</option>
                  <option value="closed">已结案</option>
                </Select>
              </div>
              <Textarea label="跟进情况" id="mSituation" value={situation} onChange={(e) => setSituation(e.target.value)} required placeholder="本次跟进了解到的情况..." />
              <Input label="跟进措施（选填）" id="mAction" value={action} onChange={(e) => setAction(e.target.value)} placeholder="已采取的措施" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="下一步计划（选填）" id="mFollow" value={followUp} onChange={(e) => setFollowUp(e.target.value)} placeholder="下次跟进安排" />
                <Input label="下次跟进日期（选填）" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} hint="每月 15 号报送" />
              </div>
              <Button type="submit" size="sm">保存记录</Button>
            </form>
          )}

          {records.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center dark:border-slate-800">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-400">暂无跟进记录</p>
              <p className="mt-1 text-xs text-slate-400">点击「新增」添加第一条记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((r) => (
                <div key={r.id} className={`rounded-lg border p-3 dark:bg-slate-900 ${r.status === 'closed' ? 'border-slate-200 bg-slate-50 opacity-75 dark:border-slate-800 dark:bg-slate-800/30' : 'border-red-200 bg-white dark:border-red-500/30'}`}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Badge tone={r.level === 'crisis' ? 'red' : r.level === 'key' ? 'red' : 'amber'}>
                        {MENTAL_LEVEL_LABELS[r.level] || r.level}
                      </Badge>
                      <Badge tone={r.status === 'closed' ? 'gray' : 'green'}>
                        {MENTAL_STATUS_LABELS[r.status] || r.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(r.date).toLocaleDateString('zh-CN')}</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200">{r.situation}</p>
                  {r.action && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">干预：{r.action}</p>}
                  {r.followUp && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">跟进：{r.followUp}</p>}
                  {r.followUpDate && (
                    <p className="mt-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                      下次跟进：{new Date(r.followUpDate).toLocaleDateString('zh-CN')}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => handleStatus(r)} className="text-xs text-brand-600 hover:underline dark:text-brand-400">
                      {r.status === 'active' ? '标记结案' : '重新关注'}
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:underline">删除</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 档案编辑视图
  return (
    <form onSubmit={saveProfile} className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <Pencil className="h-4 w-4 text-brand-500" /> 编辑台账档案
        </h4>
        <Button size="sm" variant="ghost" onClick={() => setEditProfile(false)}>取消</Button>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">关注级别（三级最高）</label>
        <div className="flex gap-2">
          {[1, 2, 3].map((lv) => (
            <button
              key={lv}
              type="button"
              onClick={() => setConcernLevel(lv)}
              className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                concernLevel === lv
                  ? lv === 3
                    ? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                    : lv === 2
                      ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                      : 'border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300'
                  : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'
              }`}
            >
              {CONCERN_LEVEL_LABELS[lv]}{lv === 3 ? '（最高）' : ''}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">类别（可多选）</label>
        <div className="flex flex-wrap gap-2">
          {MENTAL_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategories((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                categories.includes(c)
                  ? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="纳入台账时间" type="date" value={includedAt} onChange={(e) => setIncludedAt(e.target.value)} />
        <Input label="跟进人" value={followUpPerson} onChange={(e) => setFollowUpPerson(e.target.value)} placeholder="辅导员姓名" />
      </div>
      <Textarea label="纳入原因" value={includeReason} onChange={(e) => setIncludeReason(e.target.value)} placeholder="为什么纳入台账..." />
      <Input label="家长联系电话" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="家长手机号" />

      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">是否家庭经济困难生</p>
        <Switch checked={isPoverty} onChange={setIsPoverty} label="家庭经济困难生" />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">家长是否知情</p>
        <Switch checked={parentInformed} onChange={setParentInformed} label="家长知情" />
      </div>

      <Textarea label="备注" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="其他需要记录的信息..." />
      <Button type="submit" className="w-full">保存档案</Button>
    </form>
  );
}

function ProfileInfo({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0">
      <span className="text-slate-400">{label}：</span>
      <span className="break-all text-slate-700 dark:text-slate-200">{value || '-'}</span>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-slate-700 dark:text-slate-200">{value || '-'}</dd>
    </div>
  );
}

/** 字段管理弹窗：内置字段只读 + 扩展字段增删（预置模板/自定义） */
function FieldManager({ fields, presets, builtins, onClose, onSaved }: {
  fields: StudentField[];
  presets: StudentField[];
  builtins: StudentField[];
  onClose: () => void;
  onSaved: (fields: StudentField[]) => void;
}) {
  const toast = useToastStore();
  const [draft, setDraft] = useState<StudentField[]>(fields);
  const [presetKey, setPresetKey] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [customType, setCustomType] = useState<'text' | 'select'>('text');
  const [customOptions, setCustomOptions] = useState('');
  const [saving, setSaving] = useState(false);

  const addPreset = () => {
    const p = presets.find((x) => x.key === presetKey);
    if (!p) return;
    if (draft.some((f) => f.key === p.key)) {
      toast.error('该字段已添加');
      return;
    }
    setDraft([...draft, p]);
    setPresetKey('');
  };

  const addCustom = () => {
    const label = customLabel.trim();
    if (!label) { toast.error('请输入字段名称'); return; }
    const key = `f_${Date.now().toString(36)}`;
    setDraft([...draft, {
      key,
      label,
      type: customType,
      options: customType === 'select' ? customOptions.split(/[,，]/).map((s) => s.trim()).filter(Boolean) : undefined,
    }]);
    setCustomLabel('');
    setCustomOptions('');
  };

  const removeField = (key: string) => setDraft(draft.filter((f) => f.key !== key));

  const save = async () => {
    setSaving(true);
    try {
      const saved = await studentsApi.saveStudentFields(draft);
      toast.success('字段已保存，学生表单/表格/导入导出已同步');
      onSaved(saved);
      onClose();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '保存失败';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title="学生字段管理" onClose={onClose}>
      <div className="space-y-4">
        {/* 内置字段（只读） */}
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-600 dark:text-slate-400">内置字段（不可删除）</p>
          <div className="flex flex-wrap gap-1.5">
            {builtins.map((f) => (
              <span key={f.key} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{f.label}</span>
            ))}
          </div>
        </div>

        {/* 扩展字段 */}
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-600 dark:text-slate-400">扩展字段（{draft.length}）</p>
          {draft.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400 dark:border-slate-700">暂无扩展字段，可在下方添加（如学历类别、家长姓名、家长联系电话等）</p>
          ) : (
            <ul className="space-y-1.5">
              {draft.map((f) => (
                <li key={f.key} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{f.label}</p>
                    <p className="text-xs text-slate-400">{f.type === 'select' ? `下拉：${(f.options || []).join(' / ')}` : '文本'}</p>
                  </div>
                  <button onClick={() => removeField(f.key)} aria-label="删除字段" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 添加：预置模板 */}
        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <p className="mb-1.5 text-sm font-medium text-slate-600 dark:text-slate-400">从常用字段添加</p>
          <div className="flex gap-2">
            <select className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" value={presetKey} onChange={(e) => setPresetKey(e.target.value)}>
              <option value="">选择字段...</option>
              {presets.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <Button size="sm" variant="secondary" onClick={addPreset} disabled={!presetKey}>添加</Button>
          </div>
        </div>

        {/* 添加：自定义 */}
        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <p className="mb-1.5 text-sm font-medium text-slate-600 dark:text-slate-400">自定义字段</p>
          <div className="space-y-2">
            <input className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="字段名称，如：家长工作单位" />
            <div className="flex gap-2">
              <select className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" value={customType} onChange={(e) => setCustomType(e.target.value as 'text' | 'select')}>
                <option value="text">文本</option>
                <option value="select">下拉选项</option>
              </select>
              {customType === 'select' && (
                <input className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" value={customOptions} onChange={(e) => setCustomOptions(e.target.value)} placeholder="选项用逗号分隔，如：本科,硕士" />
              )}
              <Button size="sm" variant="secondary" onClick={addCustom}>添加</Button>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400">保存后，学生添加/编辑表单、列表、详情、导入模板与导出 Excel 都会同步包含这些字段。</p>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={save} disabled={saving}>{saving ? '保存中...' : '保存字段'}</Button>
        </div>
      </div>
    </Modal>
  );
}
