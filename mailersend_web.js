// 处理请求的主函数
async function handleRequest(request, env) {
    const url = new URL(request.url);
    
    // 验证 ACCESS_TOKEN（如果设置了的话）
    if (env.ACCESS_TOKEN) {
        const token = url.searchParams.get('token');
        if (!token || token !== env.ACCESS_TOKEN) {
            return new Response('未授权访问', { 
                status: 401,
                headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
            });
        }
    }
    
    // 如果是访问根路径，返回配置页面
    if (url.pathname === "/" && request.method === "GET") {
        return new Response(getConfigHTML(), {
            headers: { "Content-Type": "text/html;charset=UTF-8" },
        });
    }

    // 如果是提交配置
    if (url.pathname === "/send" && request.method === "POST") {
        try {
            const formData = await request.formData();
            // 更新环境变量
            env.FROM_EMAIL = formData.get("fromEmail");
            env.TO_EMAILS = formData.get("toEmails");
            env.SUBJECT = formData.get("subject");
            env.BODY = formData.get("body");
            
            // 继续执行原有的邮件发送逻辑
            return await handleEmailSending(env);
        } catch (error) {
            return new Response(`错误: ${error.message}`, { status: 400 });
        }
    }

    // 其他路径返回 404
    return new Response("Not Found", { status: 404 });
}

// 获取配置页面的 HTML
function getConfigHTML() {
    return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>邮件发送配置</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
            }
            .container {
                background-color: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h1 {
                color: #333;
                text-align: center;
                margin-bottom: 30px;
            }
            .form-group {
                margin-bottom: 20px;
            }
            label {
                display: block;
                margin-bottom: 8px;
                font-weight: bold;
                color: #555;
            }
            input[type="text"],
            input[type="email"],
            textarea {
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                box-sizing: border-box;
                font-size: 14px;
            }
            textarea {
                height: 120px;
                resize: vertical;
            }
            button {
                background-color: #4CAF50;
                color: white;
                padding: 12px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                width: 100%;
                font-size: 16px;
                transition: background-color 0.3s;
            }
            button:hover {
                background-color: #45a049;
            }
            button:disabled {
                background-color: #cccccc;
                cursor: not-allowed;
            }
            .result {
                margin-top: 20px;
                padding: 15px;
                border-radius: 4px;
                display: none;
                white-space: pre-wrap;
            }
            .success {
                background-color: #dff0d8;
                color: #3c763d;
                border: 1px solid #d6e9c6;
            }
            .error {
                background-color: #f2dede;
                color: #a94442;
                border: 1px solid #ebccd1;
            }
            .loading {
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-right: 10px;
                vertical-align: middle;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>邮件发送配置</h1>
            <form id="emailForm">
                <div class="form-group">
                    <label for="fromEmail">发件人邮箱:</label>
                    <input type="email" id="fromEmail" name="fromEmail" required 
                           placeholder="例如: sender@yourdomain.com">
                </div>
                <div class="form-group">
                    <label for="toEmails">收件人邮箱列表 (每行一个):</label>
                    <textarea id="toEmails" name="toEmails" required
                              placeholder="例如:&#10;recipient1@domain.com&#10;recipient2@domain.com"></textarea>
                </div>
                <div class="form-group">
                    <label for="subject">邮件主题:</label>
                    <input type="text" id="subject" name="subject" required
                           placeholder="输入邮件主题">
                </div>
                <div class="form-group">
                    <label for="body">邮件内容:</label>
                    <textarea id="body" name="body" required
                              placeholder="输入邮件正文内容"></textarea>
                </div>
                <button type="submit">发送邮件</button>
            </form>
            <div id="result" class="result"></div>
        </div>

        <script>
            document.getElementById('emailForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const resultDiv = document.getElementById('result');
                const submitButton = document.querySelector('button[type="submit"]');
                const originalButtonText = submitButton.textContent;
                
                try {
                    submitButton.disabled = true;
                    submitButton.innerHTML = '<span class="loading"></span>发送中...';
                    resultDiv.style.display = 'none';
                    
                    const formData = new FormData(e.target);
                    const response = await fetch('/send', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.text();
                    resultDiv.textContent = result;
                    resultDiv.className = 'result ' + (response.ok ? 'success' : 'error');
                    resultDiv.style.display = 'block';
                    
                    if (response.ok) {
                        // 成功后清空表单
                        e.target.reset();
                    }
                } catch (error) {
                    resultDiv.textContent = '发送失败: ' + error.message;
                    resultDiv.className = 'result error';
                    resultDiv.style.display = 'block';
                } finally {
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                }
            });
        </script>
    </body>
    </html>
    `;
}

// 处理邮件发送的函数
async function handleEmailSending(env) {
    const stats = {
        total: 0,
        success: 0,
        failed: 0,
        successEmails: [],
        failedResults: [],
        startTime: new Date(),
        endTime: null
    };

    try {
        // 验证必要的环境变量
        const requiredVars = ['MAILERSEND_API_KEY', 'FROM_EMAIL', 'TO_EMAILS'];
        for (const varName of requiredVars) {
            if (!env[varName]) {
                throw new Error(`环境变量 ${varName} 未设置`);
            }
        }
        
        const mailersendApiKey = env.MAILERSEND_API_KEY;
        const fromEmail = env.FROM_EMAIL;
        const subject = env.SUBJECT || "邮件测试";
        const body = env.BODY || "这是一封来自自动化脚本的邮件";
        
        // 验证邮件内容
        validateEmailContent(subject, body);

        // 解析并验证收件人邮箱
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const toEmails = env.TO_EMAILS.split('\n')
            .map(email => email.trim())
            .filter(email => email && emailRegex.test(email));

        if (toEmails.length === 0) {
            throw new Error("没有有效的收件人邮箱地址");
        }

        stats.total = toEmails.length;

        // 批量发送邮件
        const BATCH_SIZE = 50;
        const DELAY_MS = 1000;

        for (let i = 0; i < toEmails.length; i += BATCH_SIZE) {
            const batch = toEmails.slice(i, i + BATCH_SIZE);
            const results = await Promise.all(
                batch.map(async (email) => {
                    try {
                        const success = await sendEmail(email, mailersendApiKey, fromEmail, subject, body);
                        if (success) {
                            stats.success++;
                            stats.successEmails.push(email);
                        } else {
                            stats.failed++;
                            stats.failedResults.push({ email, error: '发送失败' });
                        }
                        return { email, success };
                    } catch (error) {
                        stats.failed++;
                        stats.failedResults.push({ email, error: error.message });
                        return { email, success: false };
                    }
                })
            );

            if (i + BATCH_SIZE < toEmails.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
        }

        // 生成最终报告
        stats.endTime = new Date();
        const duration = (stats.endTime - stats.startTime) / 1000;
        
        const resultMessage = `📊 邮件发送统计：
总数: ${stats.total}
成功: ${stats.success}
失败: ${stats.failed}
用时: ${duration}秒

✅ 成功的邮件地址：
${stats.successEmails.join('\n')}

❌失败的邮件地址:
${stats.failedResults.map(res => `${res.email}\n错误信息：${res.error}`).join('\n')}`;

        // 如果配置了 Telegram，发送通知
        if (env.TG_TOKEN && env.TG_ID) {
            await sendTelegramNotification(resultMessage, env.TG_TOKEN, env.TG_ID);
        }

        return new Response(resultMessage, { 
            status: 200,
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
        });

    } catch (error) {
        const errorMessage = `❌ 执行过程中发生错误: ${error.message || '未知错误'}`;
        if (env.TG_TOKEN && env.TG_ID) {
            await sendTelegramNotification(errorMessage, env.TG_TOKEN, env.TG_ID);
        }
        return new Response(errorMessage, { 
            status: 500,
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
        });
    }
}

// 发送邮件的函数
async function sendEmail(toEmail, mailersendApiKey, fromEmail, subject, body) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            const response = await fetch('https://api.mailersend.com/v1/email', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${mailersendApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: {
                        email: fromEmail
                    },
                    to: [{
                        email: toEmail
                    }],
                    subject: subject,
                    text: body
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const responseData = await response.json().catch(() => ({}));
            
            if (response.ok) {
                console.log(`邮件已成功发送到 ${toEmail}`);
                return true;
            } else {
                throw new Error(`API 返回错误: ${responseData.message || '未知错误'}`);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('请求超时');
            }
            if (attempt === MAX_RETRIES) {
                console.error(`发送邮件到 ${toEmail} 失败:`, error);
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            console.log(`重试第 ${attempt} 次发送到 ${toEmail}`);
        }
    }
}

// 发送 Telegram 通知的函数
async function sendTelegramNotification(message, tgToken, tgId) {
    if (!tgToken || !tgId) {
        console.log('Telegram 配置未完成，跳过通知');
        return;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: tgId,
                text: message,
                parse_mode: 'Markdown'
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Telegram API 错误: ${error}`);
        }
    } catch (error) {
        const errorMessage = error.name === 'AbortError' 
            ? 'Telegram 通知发送超时' 
            : error.message;
        console.error('发送 Telegram 通知失败:', errorMessage);
    }
}

// 验证邮件内容的函数
function validateEmailContent(subject, body) {
    if (!subject || subject.trim().length === 0) {
        throw new Error('邮件主题不能为空');
    }
    if (!body || body.trim().length === 0) {
        throw new Error('邮件内容不能为空');
    }
    if (body.length > 100000) {
        throw new Error('邮件内容过长');
    }
}

// 事件监听器
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request, event.env));
});

// 定时触发器
addEventListener('scheduled', event => {
    event.waitUntil(
        handleRequest(
            new Request('https://dummy-url.com/scheduled', {
                method: 'POST',
                headers: new Headers({
                    'Content-Type': 'application/json',
                })
            }), 
            event.env
        )
    );
});
