#!/bin/bash
# 智日程数据备份脚本
# 定期备份SQLite数据库和配置文件

set -e

# 配置
PROJECT_DIR="/root/.openclaw/workspace/agent-e7b30f31/zhi-richeng"
BACKUP_DIR="${PROJECT_DIR}/backups"
DB_FILE="${PROJECT_DIR}/server/prisma/data/dev.db"
ENV_FILE="${PROJECT_DIR}/server/.env"
PRISMA_SCHEMA="${PROJECT_DIR}/server/prisma/schema.prisma"
LOG_FILE="${BACKUP_DIR}/backup.log"

# 创建备份目录
mkdir -p "${BACKUP_DIR}"

# 备份函数
backup_database() {
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_name="schedule_backup_${timestamp}"
    local backup_path="${BACKUP_DIR}/${backup_name}"
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始备份智日程数据..." >> "${LOG_FILE}"
    
    # 1. 备份数据库文件
    if [ -f "${DB_FILE}" ]; then
        cp "${DB_FILE}" "${backup_path}.db"
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] 数据库备份完成: ${backup_path}.db" >> "${LOG_FILE}"
        
        # 同时创建SQL导出
        sqlite3 "${DB_FILE}" .dump > "${backup_path}.sql" 2>/dev/null || true
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] SQL导出完成: ${backup_path}.sql" >> "${LOG_FILE}"
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] 警告: 数据库文件不存在: ${DB_FILE}" >> "${LOG_FILE}"
    fi
    
    # 2. 备份配置文件
    if [ -f "${ENV_FILE}" ]; then
        cp "${ENV_FILE}" "${backup_path}.env"
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] 环境配置备份完成: ${backup_path}.env" >> "${LOG_FILE}"
    fi
    
    # 3. 备份Prisma schema
    if [ -f "${PRISMA_SCHEMA}" ]; then
        cp "${PRISMA_SCHEMA}" "${backup_path}.prisma"
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Prisma schema备份完成: ${backup_path}.prisma" >> "${LOG_FILE}"
    fi
    
    # 4. 创建压缩包
    cd "${BACKUP_DIR}"
    tar -czf "${backup_name}.tar.gz" \
        "${backup_name}.db" \
        "${backup_name}.sql" \
        "${backup_name}.env" \
        "${backup_name}.prisma" 2>/dev/null || true
    
    # 5. 清理临时文件
    rm -f "${backup_path}.db" "${backup_path}.sql" "${backup_path}.env" "${backup_path}.prisma"
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 压缩包创建完成: ${backup_name}.tar.gz" >> "${LOG_FILE}"
    
    # 6. 清理旧备份（保留最近7天）
    find "${BACKUP_DIR}" -name "schedule_backup_*.tar.gz" -mtime +7 -delete 2>/dev/null || true
    find "${BACKUP_DIR}" -name "schedule_backup_*.sql" -mtime +3 -delete 2>/dev/null || true
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份完成，文件大小: $(du -h "${BACKUP_DIR}/${backup_name}.tar.gz" | cut -f1)" >> "${LOG_FILE}"
    echo "=========================================" >> "${LOG_FILE}"
}

# 恢复函数（用于手动恢复）
restore_database() {
    local backup_file="$1"
    
    if [ ! -f "${backup_file}" ]; then
        echo "错误: 备份文件不存在: ${backup_file}"
        return 1
    fi
    
    echo "开始恢复数据..."
    echo "当前数据库将备份为: ${BACKUP_DIR}/restore_backup_$(date +%Y%m%d_%H%M%S).db"
    
    # 备份当前数据库
    if [ -f "${DB_FILE}" ]; then
        cp "${DB_FILE}" "${BACKUP_DIR}/restore_backup_$(date +%Y%m%d_%H%M%S).db"
    fi
    
    # 解压备份文件
    local temp_dir=$(mktemp -d)
    tar -xzf "${backup_file}" -C "${temp_dir}"
    
    # 恢复数据库文件
    local db_backup=$(find "${temp_dir}" -name "*.db" | head -1)
    if [ -f "${db_backup}" ]; then
        cp "${db_backup}" "${DB_FILE}"
        echo "数据库恢复完成"
    fi
    
    # 恢复环境配置
    local env_backup=$(find "${temp_dir}" -name "*.env" | head -1)
    if [ -f "${env_backup}" ] && [ -f "${ENV_FILE}" ]; then
        cp "${env_backup}" "${ENV_FILE}"
        echo "环境配置恢复完成"
    fi
    
    # 清理临时文件
    rm -rf "${temp_dir}"
    
    echo "恢复完成！请重启智日程服务。"
}

# 列出备份文件
list_backups() {
    echo "可用的备份文件:"
    find "${BACKUP_DIR}" -name "schedule_backup_*.tar.gz" -type f | sort -r | while read file; do
        local size=$(du -h "$file" | cut -f1)
        local date=$(stat -c %y "$file" | cut -d' ' -f1)
        local time=$(stat -c %y "$file" | cut -d' ' -f2 | cut -d. -f1)
        echo "  ${date} ${time} | ${size} | $(basename "$file")"
    done
}

# 主函数
main() {
    case "$1" in
        "backup")
            backup_database
            ;;
        "restore")
            if [ -z "$2" ]; then
                echo "用法: $0 restore <备份文件>"
                echo "可用备份:"
                list_backups
                exit 1
            fi
            restore_database "$2"
            ;;
        "list")
            list_backups
            ;;
        "auto")
            # 自动备份模式（供cron使用）
            backup_database
            ;;
        *)
            echo "智日程数据备份工具"
            echo "用法: $0 {backup|restore|list|auto}"
            echo ""
            echo "命令:"
            echo "  backup     创建新备份"
            echo "  restore    从备份恢复数据"
            echo "  list       列出所有备份"
            echo "  auto       自动备份（供cron使用）"
            echo ""
            echo "示例:"
            echo "  $0 backup           # 创建备份"
            echo "  $0 list             # 列出备份"
            echo "  $0 restore backups/schedule_backup_20240602_153000.tar.gz"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"