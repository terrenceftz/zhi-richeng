const bcrypt = require('bcrypt');
const fs = require('fs');
const { execSync } = require('child_process');

// 数据库路径
const dbPath = './server/data/dev.db';

// 生成 bcrypt 哈希
async function generateHash(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
}

// 更新数据库中的密码
async function updatePassword() {
    try {
        // 生成新密码哈希
        const newPassword = '123456';
        const hashedPassword = await generateHash(newPassword);
        
        console.log('生成的新密码哈希:');
        console.log(hashedPassword);
        
        // 更新数据库
        const sql = `UPDATE User SET password = '${hashedPassword}' WHERE email = 'admin@mboker.cn'`;
        const cmd = `sqlite3 "${dbPath}" "${sql}"`;
        
        execSync(cmd, { stdio: 'inherit' });
        
        console.log('\n✅ 密码已重置为: 123456');
        console.log('请使用以下凭据登录:');
        console.log('- 邮箱: admin@mboker.cn');
        console.log('- 密码: 123456');
        
        // 验证更新
        const verifyCmd = `sqlite3 "${dbPath}" "SELECT email, substr(password,1,30) FROM User WHERE email = 'admin@mboker.cn';"`;
        console.log('\n验证更新:');
        execSync(verifyCmd, { stdio: 'inherit' });
        
    } catch (error) {
        console.error('❌ 密码重置失败:', error.message);
        process.exit(1);
    }
}

// 检查数据库是否存在
if (!fs.existsSync(dbPath)) {
    console.error(`❌ 数据库文件不存在: ${dbPath}`);
    console.log('可用的数据库文件:');
    const findCmd = 'find . -name "*.db" -type f 2>/dev/null';
    execSync(findCmd, { stdio: 'inherit' });
    process.exit(1);
}

// 运行密码重置
updatePassword();