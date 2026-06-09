# 智日程数据备份与恢复指南

本文档提供智日程项目日程数据的备份、恢复和迁移指南。

## 📁 备份文件位置

所有备份文件存储在: `/root/.openclaw/workspace/agent-e7b30f31/zhi-richeng/backups/`

备份文件命名格式: `schedule_backup_YYYYMMDD_HHMMSS.tar.gz`

## 🔧 备份内容

每次备份包含:
1. **数据库文件** (`*.db`) - SQLite数据库文件
2. **SQL导出文件** (`*.sql`) - 纯文本SQL导出，便于查看和恢复
3. **环境配置文件** (`*.env`) - 包含数据库连接和密钥配置
4. **Prisma Schema** (`*.prisma`) - 数据库结构定义

## ⏰ 自动备份

系统配置了自动备份，每天凌晨2点执行（随机延迟最多30分钟）。

### 查看自动备份状态
```bash
# 查看定时器状态
systemctl status zhi-richeng-backup.timer

# 查看备份服务日志
journalctl -u zhi-richeng-backup.service -n 20
```

### 启用/禁用自动备份
```bash
# 启用自动备份
systemctl enable zhi-richeng-backup.timer
systemctl start zhi-richeng-backup.timer

# 禁用自动备份
systemctl stop zhi-richeng-backup.timer
systemctl disable zhi-richeng-backup.timer
```

## 🛠️ 手动备份操作

### 1. 创建手动备份
```bash
cd /root/.openclaw/workspace/agent-e7b30f31/zhi-richeng
./backup-schedule.sh backup
```

### 2. 列出所有备份
```bash
cd /root/.openclaw/workspace/agent-e7b30f31/zhi-richeng
./backup-schedule.sh list
```

### 3. 从备份恢复数据
```bash
cd /root/.openclaw/workspace/agent-e7b30f31/zhi-richeng
# 首先列出可用的备份
./backup-schedule.sh list

# 然后恢复指定的备份
./backup-schedule.sh restore backups/schedule_backup_20240602_153000.tar.gz
```

**注意**: 恢复操作会自动备份当前数据库，然后替换为新数据。

## 📊 备份策略

### 保留策略
- **压缩包**: 保留最近7天的备份
- **SQL文件**: 保留最近3天的SQL导出
- **日志文件**: 永久保留备份日志

### 备份频率
- **自动备份**: 每天1次（凌晨2点）
- **手动备份**: 在以下情况建议执行：
  - 部署新版本前
  - 进行数据库迁移前
  - 系统更新前

## 🚀 项目更新时的数据迁移

### 场景1: 同服务器更新项目
```bash
# 1. 创建更新前备份
cd /root/.openclaw/workspace/agent-e7b30f31/zhi-richeng
./backup-schedule.sh backup

# 2. 停止当前服务
systemctl stop zhi-richeng.service

# 3. 更新项目代码
git pull origin main

# 4. 安装依赖
cd server && npm install

# 5. 运行数据库迁移（如果有）
npx prisma migrate deploy

# 6. 启动服务
systemctl start zhi-richeng.service
```

### 场景2: 迁移到新服务器
```bash
# 在旧服务器上：
cd /root/.openclaw/workspace/agent-e7b30f31/zhi-richeng
./backup-schedule.sh backup

# 将备份文件复制到新服务器
scp backups/schedule_backup_*.tar.gz user@new-server:/path/to/backups/

# 在新服务器上：
# 1. 部署项目代码
git clone https://github.com/your-repo/zhi-richeng.git

# 2. 恢复数据
cd zhi-richeng
./backup-schedule.sh restore backups/schedule_backup_20240602_153000.tar.gz

# 3. 启动服务
systemctl start zhi-richeng.service
```

## 🔒 安全注意事项

1. **敏感数据**: 备份文件包含环境变量和密钥，请妥善保管
2. **访问权限**: 备份目录应限制访问权限
3. **异地备份**: 建议定期将备份文件复制到其他位置或云存储
4. **加密备份**: 对于生产环境，建议使用加密备份

## 📈 监控与告警

### 检查备份是否成功
```bash
# 查看最新备份日志
tail -n 20 /root/.openclaw/workspace/agent-e7b30f31/zhi-richeng/backups/backup.log

# 检查备份文件大小
ls -lh /root/.openclaw/workspace/agent-e7b30f31/zhi-richeng/backups/
```

### 设置备份失败告警
可以配置cron job检查备份状态：
```bash
# 每天检查备份是否成功（添加到crontab）
0 3 * * * if [ $(find /root/.openclaw/workspace/agent-e7b30f31/zhi-richeng/backups -name "schedule_backup_*.tar.gz" -mtime -1 | wc -l) -eq 0 ]; then echo "警告：智日程备份可能失败" | mail -s "备份告警" admin@example.com; fi
```

## 🆘 故障排除

### 常见问题
1. **备份失败**
   ```bash
   # 检查磁盘空间
   df -h /root/
   
   # 检查文件权限
   ls -la /root/.openclaw/workspace/agent-e7b30f31/zhi-richeng/server/data/
   
   # 查看详细错误
   ./backup-schedule.sh backup 2>&1
   ```

2. **恢复失败**
   ```bash
   # 检查备份文件完整性
   tar -tzf backups/schedule_backup_*.tar.gz
   
   # 检查数据库文件
   sqlite3 server/data/dev.db "SELECT COUNT(*) FROM User;"
   ```

3. **定时器不工作**
   ```bash
   # 检查systemd定时器
   systemctl list-timers --all
   
   # 手动触发测试
   systemctl start zhi-richeng-backup.service
   ```

## 📞 支持

如有问题，请参考：
- 备份脚本: `backup-schedule.sh --help`
- 系统日志: `journalctl -u zhi-richeng-backup`
- 备份日志: `backups/backup.log`

---

**最后更新**: 2026-06-02  
**维护者**: OpenClaw AI Assistant