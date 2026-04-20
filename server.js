import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const BAILIAN_APP_ID = process.env.BAILIAN_APP_ID || '6dee8dd910da46cca970195b5934da51';
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 中间件
app.use(cors());
app.use(express.json());

// 日志中间件
app.use((req, res, next) => {
  if (NODE_ENV === 'development') {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  }
  next();
});

// 静态文件服务 - 暴露根目录以确保所有相对路径都能正确解析
// 注意：在生产环境中应该只暴露必要的目录
console.log(`[DEBUG] Exposing root directory: ${__dirname}`);
app.use(express.static(__dirname));

// 为每个静态目录创建路由（作为备用）
const staticDirs = {
  'fig': path.join(__dirname, 'fig'),
  'ppt网页图': path.join(__dirname, 'ppt网页图')
};

// 为每个静态目录创建路由
Object.entries(staticDirs).forEach(([route, dirPath]) => {
  if (fs.existsSync(dirPath)) {
    console.log(`[DEBUG] Static directory ${route} mapped to ${dirPath}`);
    // 使用更简单的配置，确保中文路径能正确处理
    app.use(`/${route}`, express.static(dirPath));
  } else {
    console.log(`[DEBUG] Static directory ${route} not found at ${dirPath}`);
  }
});

// 专门处理 ppt网页图/ppt网页图 路径的请求（作为备用）
app.use('/ppt网页图/ppt网页图', (req, res) => {
  const filePath = path.join(__dirname, 'ppt网页图', 'ppt网页图', req.url);
  console.log(`[DEBUG] Requesting file: ${filePath}`);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

// 设置默认路由
app.get('/', (req, res) => {
  const htmlPath = path.join(__dirname, 'index-ai.html');

  if (fs.existsSync(htmlPath)) {
    res.set('Cache-Control', NODE_ENV === 'production' ? 'public, max-age=86400' : 'no-store, no-cache, must-revalidate');
    res.set('Pragma', NODE_ENV === 'production' ? 'cache' : 'no-cache');
    res.set('Expires', NODE_ENV === 'production' ? new Date(Date.now() + 86400000).toUTCString() : '0');
    res.sendFile(htmlPath);
  } else {
    res.status(404).send('File not found');
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    port: PORT
  });
});

// 调用百炼应用 API 的接口
app.post('/api/chat-app', async (req, res) => {
  try {
    const { question, sessionId } = req.body;

    if (!question) {
      return res.status(400).json({ error: '问题不能为空' });
    }

    if (!DASHSCOPE_API_KEY) {
      return res.status(500).json({ error: 'API Key 未配置' });
    }

    if (NODE_ENV === 'development') {
      console.log(`[DEBUG] Calling Bailian API for question: ${question.substring(0, 50)}...`);
    }

    // 调用阿里云百炼应用 API
    const response = await fetch(
      `https://dashscope.aliyuncs.com/api/v1/apps/${BAILIAN_APP_ID}/completion`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: {
            prompt: question,
            session_id: sessionId
          },
          parameters: {},
          debug: {}
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API 调用失败: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    if (NODE_ENV === 'development') {
      console.log(`[DEBUG] Bailian API response received`);
    }

    // 兼容百炼应用可能不同的返回字段写法
    let answer = '';
    let sessionIdFromResponse = sessionId;

    // 尝试不同的字段路径
    if (data.output && data.output.text) {
      answer = data.output.text;
    } else if (data.result && data.result.text) {
      answer = data.result.text;
    } else if (data.answer) {
      answer = data.answer;
    } else if (data.text) {
      answer = data.text;
    }

    // 获取会话 ID
    if (data.output && data.output.session_id) {
      sessionIdFromResponse = data.output.session_id;
    } else if (data.session_id) {
      sessionIdFromResponse = data.session_id;
    }

    // 返回统一格式
    res.json({
      answer,
      sessionId: sessionIdFromResponse,
      raw: NODE_ENV === 'development' ? data : undefined
    });
  } catch (error) {
    console.error('调用百炼 API 失败:', error);
    res.status(500).json({
      error: '调用百炼 API 失败',
      message: NODE_ENV === 'development' ? error.message : '服务器内部错误'
    });
  }
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('全局错误:', err);
  res.status(500).json({
    error: '服务器内部错误',
    message: NODE_ENV === 'development' ? err.message : '请稍后再试'
  });
});

// 启动服务器 - 监听所有网络接口适配 Render
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
  console.log(`环境: ${NODE_ENV}`);
  console.log(`健康检查: http://0.0.0.0:${PORT}/health`);
  console.log(`AI 问答接口: http://0.0.0.0:${PORT}/api/chat-app`);
  console.log('========================================');
  if (NODE_ENV === 'development') {
    console.log('DEBUG INFO:');
    console.log(`- Current dir: ${__dirname}`);
    console.log(`- index-ai.html exists: ${fs.existsSync(path.join(__dirname, 'index-ai.html'))}`);
  }
  console.log('========================================');
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});