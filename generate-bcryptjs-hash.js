// 生成 bcryptjs 哈希
const bcryptjs = require('bcryptjs');

async function generateHash() {
    const password = '123456';
    const saltRounds = 12;
    
    const hash = await bcryptjs.hash(password, saltRounds);
    console.log('bcryptjs 哈希:');
    console.log(hash);
    
    // 验证
    const isValid = await bcryptjs.compare(password, hash);
    console.log('\n验证结果:');
    console.log(isValid ? '✅ 哈希验证通过' : '❌ 哈希验证失败');
    
    return hash;
}

generateHash().catch(console.error);