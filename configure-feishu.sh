#!/bin/bash

# 飞书配置助手
echo "🚀 飞书机器人配置助手"
echo "======================"

# 检查是否已登录
check_login() {
    if [ ! -f /tmp/feishu_token.txt ] || [ ! -s /tmp/feishu_token.txt ]; then
        echo "❌ 未检测到登录token，请先登录"
        echo "正在获取token..."
        
        token=$(curl -s -X POST https://rc.mboker.cn/api/auth/login \
          -H "Content-Type: application/json" \
          -d '{"email":"admin@mboker.cn","password":"463136891"}' | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('accessToken', ''))
except:
    print('')
" 2>/dev/null)
        
        if [ -z "$token" ]; then
            echo "❌ 登录失败，请检查密码"
            exit 1
        fi
        
        echo "$token" > /tmp/feishu_token.txt
        echo "✅ 登录成功，token已保存"
    fi
    
    TOKEN=$(cat /tmp/feishu_token.txt)
    echo "🔑 Token长度: ${#TOKEN} 字符"
}

# 显示当前配置
show_current_config() {
    echo ""
    echo "📊 当前飞书配置状态:"
    echo "----------------------"
    
    curl -s https://rc.mboker.cn/api/settings \
      -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('飞书配置状态:')
    print(f'  🏷️  已配置: {data.get(\"feishuConfigured\", False)}')
    print(f'  🔗 已连接: {data.get(\"feishuConnected\", False)}')
    print(f'  📱 App ID: {data.get(\"feishuAppId\", \"未配置\")}')
    print(f'  🔐 App Secret: {data.get(\"feishuAppSecret\", \"未配置\")}')
    print(f'  👤 OpenID: {data.get(\"feishuOpenId\", \"未绑定\")}')
except Exception as e:
    print(f'❌ 获取配置失败: {e}')
" 2>/dev/null
}

# 配置飞书 App ID 和 App Secret
configure_feishu_app() {
    echo ""
    echo "🔧 配置飞书 App ID 和 App Secret"
    echo "-------------------------------"
    
    read -p "请输入飞书 App ID: " APP_ID
    read -sp "请输入飞书 App Secret: " APP_SECRET
    echo ""
    
    if [ -z "$APP_ID" ] || [ -z "$APP_SECRET" ]; then
        echo "❌ App ID 和 App Secret 不能为空"
        return 1
    fi
    
    echo "正在配置飞书信息..."
    
    response=$(curl -s -X POST https://rc.mboker.cn/api/settings \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{
        \"feishu_app_id\": \"$APP_ID\",
        \"feishu_app_secret\": \"$APP_SECRET\"
      }")
    
    echo "响应: $response"
    
    # 同时更新环境变量
    echo "正在更新环境变量..."
    sed -i '/FEISHU_APP_ID/d' server/.env
    sed -i '/FEISHU_APP_SECRET/d' server/.env
    echo "FEISHU_APP_ID=$APP_ID" >> server/.env
    echo "FEISHU_APP_SECRET=$APP_SECRET" >> server/.env
    
    echo "✅ 飞书 App 信息已配置"
}

# 绑定用户 OpenID
bind_openid() {
    echo ""
    echo "👤 绑定飞书用户 OpenID"
    echo "----------------------"
    
    read -p "请输入您的飞书 OpenID: " OPEN_ID
    
    if [ -z "$OPEN_ID" ]; then
        echo "❌ OpenID 不能为空"
        return 1
    fi
    
    echo "正在绑定 OpenID..."
    
    response=$(curl -s -X POST https://rc.mboker.cn/api/settings \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{
        \"feishu_openid_5f54a9c8-5a90-41bc-adda-9cf5c06031b7\": \"$OPEN_ID\"
      }")
    
    echo "响应: $response"
    echo "✅ OpenID 已绑定"
}

# 重启服务
restart_service() {
    echo ""
    echo "🔄 重启后端服务"
    echo "---------------"
    
    echo "正在停止当前服务..."
    pkill -f "node dist/index.js" 2>/dev/null && sleep 2
    
    echo "正在启动新服务..."
    cd ~/.openclaw/workspace/agent-e7b30f31/zhi-richeng/server
    PORT=3002 nohup node dist/index.js > server.log 2>&1 &
    
    echo "等待服务启动..."
    sleep 5
    
    echo "检查服务状态..."
    if ps aux | grep "node dist/index.js" | grep -v grep > /dev/null; then
        echo "✅ 服务已启动"
        
        # 检查飞书连接状态
        echo "检查飞书连接..."
        sleep 3
        if grep -q "飞书.*连接" server.log 2>/dev/null; then
            echo "✅ 飞书连接正常"
        else
            echo "⚠️  未检测到飞书连接，请检查配置"
        fi
    else
        echo "❌ 服务启动失败"
    fi
}

# 测试飞书功能
test_feishu() {
    echo ""
    echo "🧪 测试飞书功能"
    echo "---------------"
    
    echo "1. 创建测试任务..."
    
    response=$(curl -s -X POST https://rc.mboker.cn/api/tasks \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{
        "title": "飞书机器人测试任务",
        "dueDate": "'$(date -d "+1 hour" +%Y-%m-%d)'",
        "dueTime": "'$(date -d "+1 hour" +%H:%M)'",
        "priority": "high",
        "reminder": true,
        "description": "这是一个测试飞书提醒功能的任务"
      }')
    
    echo "任务创建响应: $response"
    
    echo ""
    echo "2. 查看飞书日志..."
    tail -5 server/server.log 2>/dev/null | grep -i feishu || echo "未找到飞书相关日志"
    
    echo ""
    echo "✅ 测试完成"
    echo "请在飞书中查看是否收到提醒"
}

# 主菜单
main_menu() {
    while true; do
        echo ""
        echo "📱 飞书配置主菜单"
        echo "================="
        echo "1. 📊 显示当前配置"
        echo "2. 🔧 配置飞书 App"
        echo "3. 👤 绑定用户 OpenID"
        echo "4. 🔄 重启服务"
        echo "5. 🧪 测试飞书功能"
        echo "6. 📋 查看配置指南"
        echo "7. 🚪 退出"
        echo ""
        
        read -p "请选择操作 (1-7): " choice
        
        case $choice in
            1) show_current_config ;;
            2) configure_feishu_app ;;
            3) bind_openid ;;
            4) restart_service ;;
            5) test_feishu ;;
            6) echo "配置指南已保存到: 飞书机器人配置指南.md" ;;
            7) echo "再见！"; exit 0 ;;
            *) echo "❌ 无效选择" ;;
        esac
    done
}

# 脚本开始
echo "飞书机器人配置助手 v1.0"
echo ""

# 检查并获取token
check_login

# 显示主菜单
main_menu