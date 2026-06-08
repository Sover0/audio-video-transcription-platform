import express from 'express';
import multer from 'multer';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// 讯飞API配置（仅从环境变量读取，不提供硬编码fallback）
const API_CONFIG = {
  appId: process.env.IFLYTEK_APP_ID || '',
  apiKey: process.env.IFLYTEK_API_KEY || '',
  apiSecret: process.env.IFLYTEK_API_SECRET || '',
  uploadUrl: process.env.IFLYTEK_UPLOAD_URL || 'https://office-api-ist-dx.iflyaisol.com/v2/upload',
  resultUrl: process.env.IFLYTEK_RESULT_URL || 'https://office-api-ist-dx.iflyaisol.com/v2/getResult'
};

// 配置文件存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subDir = 'user_uploads'; // 默认存储到user_uploads文件夹
    
    // 检查是否为内部录制的文件（通过文件名判断）
    if (file.originalname.startsWith('recording.') || file.originalname.startsWith('converted_recording.')) {
      // 内部录制的文件根据类型存储到不同目录
      if (file.mimetype.startsWith('audio/')) {
        subDir = 'audio'; // 音频录制保存到audio文件夹
      } else if (file.mimetype.startsWith('video/')) {
        subDir = 'video'; // 视频录制保存到video文件夹
      }
    }
    
    const uploadDir = path.join(__dirname, 'uploads', subDir);
    console.log('创建上传目录:', uploadDir);
    console.log('文件信息:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      filename: file.filename,
      path: file.path
    });
    
    // 确保上传目录存在
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('目录创建成功');
      } else {
        console.log('目录已存在');
      }
    } catch (error) {
      console.error('目录创建失败:', error);
      // 如果目录创建失败，使用临时目录
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      console.log('使用临时目录:', tempDir);
      cb(null, tempDir);
      return;
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    console.log('保存文件:', filename);
    cb(null, filename);
  }
});

const upload = multer({ storage });

// 处理跨域
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 静态文件服务，用于提供音频和视频文件访问
app.use('/audio', express.static(path.join(__dirname, 'uploads', 'audio')));
app.use('/video', express.static(path.join(__dirname, 'uploads', 'video')));
app.use('/user_uploads', express.static(path.join(__dirname, 'uploads', 'user_uploads')));
// 添加临时目录的静态服务
app.use('/temp', express.static(path.join(__dirname, 'temp')));

// 获取格式化的时间戳（符合API要求的格式）
const getFormattedTimestamp = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  // 计算时区偏移（分钟），东八区为 +8
  const offset = -now.getTimezoneOffset(); // 分钟
  const sign = offset >= 0 ? '+' : '-';
  const offsetHours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const offsetMinutes = String(Math.abs(offset) % 60).padStart(2, '0');
  const dateTime = `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${offsetHours}${offsetMinutes}`;
  return dateTime;
};

// 获取音频文件时长（毫秒）
const getAudioDuration = async (filePath: string): Promise<string> => {
  return new Promise((resolve) => {
    try {
      const ffmpegCommand = `ffprobe -v quiet -print_format json -show_format "${filePath}"`;
      exec(ffmpegCommand, (error, stdout, stderr) => {
        if (error) {
          console.error('获取音频时长失败:', error);
          resolve('0');
        } else {
          try {
            const data = JSON.parse(stdout);
            const duration = Math.floor(parseFloat(data.format.duration) * 1000).toString();
            resolve(duration);
          } catch (e) {
            console.error('解析音频时长失败:', e);
            resolve('0');
          }
        }
      });
    } catch (error) {
      console.error('获取音频时长失败:', error);
      resolve('0');
    }
  });
};

// 生成签名
const generateSignature = (apiSecret: string, params: Record<string, string>) => {
  // 1. 排除待签名参数中的"signature"字段
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(([key]) => key !== 'signature')
  );
  
  // 2. 对剩余参数按参数名进行自然排序
  const sortedKeys = Object.keys(filteredParams).sort();
  
  // 3. 构建参数字符串（对值进行URL编码）
  const stringToSign = sortedKeys.map(key => {
    const value = filteredParams[key];
    // 空值或空字符串不参与签名
    if (value == null || value === '') {
      return '';
    }
    // 对值进行URL编码
    const encodedValue = encodeURIComponent(value);
    return `${key}=${encodedValue}`;
  }).filter(Boolean).join('&');
  
  // 4. 使用HMAC-SHA1算法，以apiSecret为密钥
  const hmac = CryptoJS.HmacSHA1(stringToSign, apiSecret);
  
  // 5. 对签名结果进行Base64编码
  const signature = hmac.toString(CryptoJS.enc.Base64);
  return signature;
};

// 音频格式转换接口
app.post('/api/convert', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const inputPath = req.file.path;
  const outputPath = inputPath.replace(path.extname(inputPath), '.wav');

  // 使用FFmpeg转换音频格式
  const ffmpegCommand = `ffmpeg -i "${inputPath}" -ar 16000 -ac 1 -sample_fmt s16 "${outputPath}"`;

  exec(ffmpegCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('FFmpeg error:', error);
      return res.status(500).json({ error: 'Failed to convert audio' });
    }

    // 读取转换后的文件
    fs.readFile(outputPath, (err, data) => {
      if (err) {
        console.error('Error reading converted file:', err);
        return res.status(500).json({ error: 'Failed to read converted file' });
      }

      // 删除临时文件
      fs.unlink(inputPath, () => {});
      fs.unlink(outputPath, () => {});

      // 返回转换后的文件
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(outputPath)}"`);
      res.send(data);
    });
  });
});

// 转录接口
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const inputPath = req.file.path;
    let outputPath = inputPath;
    const isRecording = req.body.isRecording === 'true';
    console.log('文件来源:', isRecording ? '内部录制' : '用户上传');
    
    // 检查文件是否需要转换
    if (!inputPath.endsWith('.wav')) {
      outputPath = inputPath.replace(path.extname(inputPath), '.wav');
      // 使用FFmpeg转换音频格式
      const ffmpegCommand = `ffmpeg -i "${inputPath}" -ar 16000 -ac 1 -sample_fmt s16 "${outputPath}"`;
      await new Promise((resolve, reject) => {
        exec(ffmpegCommand, (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else {
            resolve(null);
          }
        });
      });
    }

    // 读取转换后的文件
    const fileBuffer = fs.readFileSync(outputPath);
    const fileSize = fileBuffer.length.toString();
    // 使用转换后的WAV文件名，确保讯飞API能正确处理
    const fileName = path.basename(outputPath);
    const duration = await getAudioDuration(outputPath);
    console.log('使用的文件名:', fileName);
    
    // 生成认证参数
    const appId = API_CONFIG.appId;
    const apiKey = API_CONFIG.apiKey;
    const apiSecret = API_CONFIG.apiSecret;
    const dateTime = getFormattedTimestamp();
    const signatureRandom = Math.random().toString(36).substring(2, 18); // 16位随机字符串
    const language = 'autodialect'; // 支持中英+202种方言
    // 添加说话人分离参数
    const vspp_on = '1'; // 开启角色分离
    const speaker_number = '0'; // 自动检测说话人数量
    const role_type = '1'; // 通用场景

    // 构建查询参数
    const queryParams = new URLSearchParams({
      appId,
      accessKeyId: apiKey,
      dateTime,
      signatureRandom,
      fileSize,
      fileName,
      duration,
      language,
      vspp_on,
      speaker_number,
      role_type
    });

    // 构建签名参数
    const signParams = {
      appId,
      accessKeyId: apiKey,
      dateTime,
      signatureRandom,
      fileSize,
      fileName,
      duration,
      language,
      vspp_on,
      speaker_number,
      role_type
    };

    // 生成签名
    const signature = generateSignature(apiSecret, signParams);
    
    // 输出调试信息
    console.log('API调用信息:');
    console.log('URL:', `${API_CONFIG.uploadUrl}?${queryParams.toString()}`);
    console.log('签名:', signature);
    console.log('文件大小:', fileSize);
    console.log('文件名:', fileName);
    console.log('音频时长:', duration);
    console.log('说话人分离参数:');
    console.log('vspp_on:', vspp_on);
    console.log('speaker_number:', speaker_number);
    console.log('role_type:', role_type);

    // 调用讯飞API上传文件
    const uploadResponse = await fetch(`${API_CONFIG.uploadUrl}?${queryParams.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'signature': signature
      },
      body: fileBuffer
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`上传失败: ${errorText}`);
    }

    const uploadResult: any = await uploadResponse.json();
    console.log('上传响应:', uploadResult);
    if (uploadResult.code !== '000000') {
      throw new Error(`上传失败: ${uploadResult.descInfo || '未知错误'}`);
    }

    const taskId = uploadResult.content.orderId;

    // 轮询获取结果
    let resultData: any;
    let retryCount = 0;
    const maxRetries = 60; // 最多重试60次
    const baseDelay = 1000; // 基础延迟1秒
    const maxDelay = 30000; // 最大延迟30秒

    while (retryCount < maxRetries) {
      // 指数退避策略：延迟时间 = 基础延迟 * (2 ^ 重试次数)，但不超过最大延迟
      const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
      console.log(`等待 ${delay}ms 后重试，当前重试次数: ${retryCount + 1}`);
      await new Promise(resolve => setTimeout(resolve, delay));

      // 生成新的时间戳
      const queryDateTime = getFormattedTimestamp();

      // 构建查询参数
      const queryParams = new URLSearchParams({
        accessKeyId: apiKey,
        dateTime: queryDateTime,
        signatureRandom: signatureRandom,
        orderId: taskId,
        resultType: 'transfer'
      });

      // 构建签名参数
      const querySignParams = {
        accessKeyId: apiKey,
        dateTime: queryDateTime,
        signatureRandom: signatureRandom,
        orderId: taskId,
        resultType: 'transfer'
      };

      // 生成新的签名
      const querySignature = generateSignature(apiSecret, querySignParams);

      // 调用讯飞API获取结果
      const queryResponse = await fetch(`${API_CONFIG.resultUrl}?${queryParams.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'signature': querySignature
        },
        body: '{}'
      });

      if (!queryResponse.ok) {
        const errorText = await queryResponse.text();
        throw new Error(`查询失败: ${errorText}`);
      }

      resultData = await queryResponse.json();
      console.log('查询响应:', resultData);
      if (resultData.code !== '000000') {
        throw new Error(`查询失败: ${resultData.descInfo || '未知错误'}`);
      }

      const status = resultData.content.orderInfo.status;
      if (status === 4) { // 转写完成
        break;
      } else if (status === -1) { // 转写失败
        throw new Error(`转写失败，状态: ${status}`);
      }

      retryCount++;
    }

    if (retryCount >= maxRetries) {
      throw new Error('获取结果超时，请稍后再试');
    }

    // 格式化时间函数
    const formatTime = (ms: number): string => {
      const totalSeconds = Math.floor(ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // 解析转写结果函数
    const parseTranscription = (resultData: any): Array<{ start: number; end: number; speaker: number; text: string }> => {
      const sentences: Array<{ start: number; end: number; speaker: number; text: string }> = [];
      
      if (resultData.content.orderResult) {
        try {
          const orderResult = JSON.parse(resultData.content.orderResult);
          if (orderResult.lattice) {
            orderResult.lattice.forEach((item: any) => {
              try {
                const json1best = JSON.parse(item.json_1best);
                console.log('单个lattice解析结果：', json1best);
                if (json1best.st) {
                  const start = parseInt(json1best.st.bg) || 0;
                  const end = parseInt(json1best.st.ed) || 0;
                  const speaker = parseInt(json1best.st.rl) || 0;
                  console.log('使用的字段：start=' + start + ', end=' + end + ', speaker=' + speaker);
                  
                  let text = '';
                  if (json1best.st.rt) {
                    text = json1best.st.rt.map((segment: any) => {
                      if (segment.ws) {
                        return segment.ws.map((word: any) => {
                          if (word.cw && word.cw[0] && word.cw[0].w) {
                            return word.cw[0].w;
                          }
                          return '';
                        }).join('');
                      }
                      return '';
                    }).join('');
                  }
                  
                  if (text.trim()) {
                    sentences.push({
                      start,
                      end,
                      speaker,
                      text: text.trim()
                    });
                  }
                }
              } catch (e) {
                console.error('解析转写结果失败:', e);
              }
            });
          }
        } catch (e) {
          console.error('解析orderResult失败:', e);
        }
      }
      
      return sentences;
    };

    // 解析转写结果
    const sentences = parseTranscription(resultData);
    const transcript = sentences.map(s => s.text).join('');


    // 调用讯飞星火认知大模型4.0 Ultra版本API进行总结
    // 注释掉默认summary对象，使用API返回的实际内容
    /*
    let summary = {
      core观点: 'AI转录完成，请查看转录结果',
      outline: [
        {
          title: '转录内容',
          time: '00:00-00:05',
          keyPoints: ['完整转录内容已生成'],
        },
      ],
      goldenSentences: [transcript.substring(0, 50) + '...'],
      tags: ['AI转录', '语音识别'],
    };
    */
    interface Summary {
      core观点: string;
      outline: any[];
      goldenSentences: string[];
      tags: string[];
      titles: string[];
      extensionTopics: string[];
    }
    
    let summary: Summary = {
      core观点: '',
      outline: [],
      goldenSentences: [],
      tags: [],
      titles: [],
      extensionTopics: [],
    };

    try {
      const sparkApiKey = process.env.SPARK_API_KEY || '';
      if (!sparkApiKey) {
        throw new Error('SPARK_API_KEY 未配置，请在 .env 文件中设置');
      }
      const sparkApiUrl = process.env.SPARK_API_URL || 'https://spark-api-open.xf-yun.com/v1/chat/completions';
      
      // 构建总结请求
      const summaryRequest = {
        model: process.env.SPARK_MODEL || '4.0Ultra',
        messages: [
          {
            role: 'system',
            content: '你是【瞬刻TransAI】，资深内容编辑，专为播客主、视频UP主、自媒体作者等创作者服务。核心任务：智能分析音视频转录文本，输出可直接使用的创作框架，让创作者跳过整理，直接开始创作。\n\n请对用户提供的播客转录稿进行分析，并严格按照以下格式输出，不要添加任何额外内容：\n- 请使用简体中文输出，避免使用繁体字。\n\n🧠AI智能总结\n\n💎精选标题\n[生成1-3个吸引人的标题，概括整个内容的核心亮点，可直接用作视频标题或文章标题]\n\n⭐核心观点\n[用2-3句话概括转录内容的中心思想]\n\n📖内容大纲\n将内容划分为3段，每段格式如下：\n一、[段落标题]（[起始时间]-[结束时间]）\n   关键观点：[该段落的核心论点]\n   金句：[一句精炼的嘉宾原话，要有"转发欲"]\n   （可选内容：可根据需要添加案例、实践方法、反面案例等，用简短文字描述）\n（第二段、第三段以此类推，使用二、三、...）\n\n♾️延伸话题\n基于转录内容，提出1-2个适合深入探讨的关联话题，并简要说明其价值或可引用的研究/数据。\n\n📝金句摘录\n精选3-5条适合社交媒体分享的金句，每条不超过50字。自动识别"观点鲜明+表达凝练+情绪共鸣"的句子，直接引用嘉宾原话，格式为每条独立一行，用短横线开头：\n- [金句1]\n- [金句2]\n- [金句3]\n（最多5条）\n\n🏷️关键词标签\n生成3-5个内容标签，格式为 #标签1 #标签2 #标签3，用空格分隔。\n\n要求：\n- 大纲层次清晰，适合快速扩写为公众号文章。\n- 金句要有"转发欲"，避免平淡陈述，每条可直接复制用于抖音/微博/小红书。\n- 保持嘉宾原话的表达风格即可，可以不与原文一模一样。\n- 时间戳需与原文对应（如果转录文本中有时间信息）。\n- 所有内容必须基于用户提供的实际转录稿，确保原创性和准确性。'
          },
          {
            role: 'user',
            content: `请对以下转录内容进行总结：\n${transcript}`
          }
        ],
        temperature: parseFloat(process.env.SPARK_TEMPERATURE || '0.5'),
        top_k: parseInt(process.env.SPARK_TOP_K || '4'),
        max_tokens: parseInt(process.env.SPARK_MAX_TOKENS || '4096'),
        stream: true
      };

      console.log('调用星火大模型API进行总结...');
      console.log('请求参数:', JSON.stringify(summaryRequest, null, 2));
      
      const summaryResponse = await fetch(sparkApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sparkApiKey}`
        },
        body: JSON.stringify(summaryRequest)
      });

      if (!summaryResponse.ok) {
        throw new Error(`调用星火大模型API失败: ${summaryResponse.status} ${await summaryResponse.text()}`);
      }

      // 流式响应处理
      console.log('开始处理流式响应...');
      const reader = summaryResponse.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      let summaryContent = '';
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = new TextDecoder('utf-8').decode(value);
          console.log('收到流式响应 chunk:', chunk);
          
          // 解析SSE格式的响应
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              if (data === '[DONE]') {
                continue;
              }
              try {
                const json = JSON.parse(data);
                if (json.choices && json.choices[0] && json.choices[0].delta) {
                  const content = json.choices[0].delta.content;
                  if (content) {
                    summaryContent += content;
                  }
                }
              } catch (error) {
                console.error('解析JSON失败:', error);
              }
            }
          }
        }
      }

      console.log('星火大模型总结结果:', summaryContent);
      
      // 打印原始AI总结内容
      console.log('原始AI总结内容:', summaryContent);
      
      // 解析总结结果（适配带特殊符号的格式）
      try {
        console.log('开始解析总结结果...');
        
        // 1. 提取精选标题
        const titleMatch = summaryContent.match(/💎精选标题[\s:]*\n([\s\S]*?)(?=\n⭐核心观点|$)/);
        if (titleMatch) {
          const titles = titleMatch[1].trim().split('\n')
            .filter((title: string) => title.trim() !== '')
            .map((title: string) => title.replace(/^[\d\.-]+\s*/, '').trim());
          summary.titles = titles;
          console.log('提取到精选标题:', summary.titles);
        }

        // 2. 提取核心观点
        const coreMatch = summaryContent.match(/⭐核心观点\n([\s\S]*?)(?=\n📖内容大纲|$)/);
        if (coreMatch) {
          summary.core观点 = coreMatch[1].trim();
          console.log('提取到核心观点:', summary.core观点);
        }

        // 3. 提取内容大纲
        const outlineMatch = summaryContent.match(/📖内容大纲\n([\s\S]*?)(?=\n♾️延伸话题|$)/);
        if (outlineMatch) {
          const outlineText = outlineMatch[1].trim();
          console.log('提取到大纲文本:', outlineText);
          
          // 按中文数字编号分割大纲条目（一、二、三...）
          const outlineItems = outlineText.split(/\n(?=[一二三四五六七八九十]+、)/).filter((item: string) => item.trim() !== '');
          console.log('大纲项目数量:', outlineItems.length);
          
          const newOutline = outlineItems.map((item: string, index: number) => {
            const lines = item.split('\n').filter((l: string) => l.trim() !== '');
            // 第一行是标题和时间戳，格式如：一、远程工作的创造力悖论（08:32-18:45）
            const titleLine = lines[0].trim();
            const titleMatch = titleLine.match(/^[一二三四五六七八九十]+、(.+?)（(\d{2}:\d{2}-\d{2}:\d{2})）$/);
            const title = titleMatch ? titleMatch[1].trim() : `大纲 ${index + 1}`;
            const time = titleMatch ? titleMatch[2] : '';
            
            let keyPoints: string[] = [];
            let goldenSentence: string | undefined;
            
            // 解析后续行
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i];
              if (line.includes('关键观点：')) {
                keyPoints.push(line.replace('关键观点：', '').trim());
              } else if (line.includes('金句：')) {
                goldenSentence = line.replace('金句：', '').trim();
              }
            }
            
            return {
              title: title,
              time: time,
              keyPoints: keyPoints.length > 0 ? keyPoints : undefined,
              goldenSentence: goldenSentence
            };
          });
          
          summary.outline = newOutline;
          console.log('解析后的大纲:', summary.outline);
        }

        // 4. 提取延伸话题
        const extensionMatch = summaryContent.match(/♾️延伸话题[\s:]*\n([\s\S]*?)(?=\n📝金句摘录|$)/);
        if (extensionMatch) {
          const extensionText = extensionMatch[1].trim();
          const extensionTopics = extensionText.split('\n')
            .filter((topic: string) => topic.trim() !== '')
            .map((topic: string) => topic.replace(/^[\d\.-]+\s*/, '').trim());
          summary.extensionTopics = extensionTopics;
          console.log('提取到延伸话题:', summary.extensionTopics);
        }

        // 5. 提取金句摘录
        const goldenMatch = summaryContent.match(/📝金句摘录\n([\s\S]*?)(?=\n🏷️关键词标签|$)/);
        if (goldenMatch) {
          const goldenText = goldenMatch[1].trim();
          console.log('提取到金句文本:', goldenText);
          
          summary.goldenSentences = goldenText.split('\n')
            .filter((line: string) => line.trim() !== '')
            .map((line: string) => line.replace(/^-\s*/, '').trim());
          console.log('解析后的金句:', summary.goldenSentences);
        }

        // 6. 提取关键词标签
        const tagsMatch = summaryContent.match(/🏷️关键词标签\n([\s\S]*)$/);
        if (tagsMatch) {
          const tagsText = tagsMatch[1].trim();
          console.log('提取到标签文本:', tagsText);
          
          // 提取所有 # 开头的标签
          summary.tags = tagsText.match(/#[^\s#]+/g) || [];
          console.log('解析后的标签:', summary.tags);
        }
        
        console.log('解析完成后的summary:', summary);
      } catch (error) {
        console.error('解析失败', error);
        // 解析失败时保留默认空值，或使用 fallback
      }
    } catch (error) {
      console.error('调用星火大模型API失败:', error);
      // 失败时使用默认总结
    }

    // 清理临时文件（保留转换后的音频文件，以便前端访问）
    // 不删除任何文件，因为前端需要访问这个音频文件
    // if (inputPath !== outputPath) {
    //   // 只有当inputPath和outputPath不同时才删除inputPath
    //   fs.unlink(inputPath, () => {});
    // }
    // 不删除outputPath，因为前端需要访问这个音频文件

    // 提取所有唯一的说话人ID
    const speakerIds = [...new Set(sentences.map(sentence => sentence.speaker))];
    
    // 生成说话人信息数组
    const speakers = speakerIds.map((speakerId, index) => {
      // 为每个说话人分配不同的颜色
      const colors = ['#7EB699', '#FFB74D', '#9575CD', '#4FC3F7', '#FF8A65', '#4DB6AC'];
      const color = colors[index % colors.length];
      return {
        id: `speaker-${speakerId}`,
        name: `说话人${speakerId}`,
        color: color
      };
    });

    // 生成音频文件URL
    // 根据文件来源和存储位置生成正确的URL
    const audioFileName = path.basename(outputPath);
    let audioUrl = '';
    
    if (outputPath.includes('temp')) {
      // 文件存储在临时目录中
      audioUrl = `/temp/${audioFileName}`;
    } else if (isRecording) {
      // 内部录制的文件
      if (outputPath.includes('video')) {
        // 视频录制
        audioUrl = `/video/${audioFileName}`;
      } else {
        // 音频录制
        audioUrl = `/audio/${audioFileName}`;
      }
    } else {
      // 用户上传的文件
      audioUrl = `/user_uploads/${audioFileName}`;
    }
    console.log('音频文件URL:', audioUrl);
    console.log('音频文件路径:', outputPath);

    // 返回转录结果
    res.json({
      transcript: transcript.trim(),
      sentences: sentences,
      speakers: speakers,
      summary: summary,
      duration: Math.floor(parseInt(duration) / 1000),
      audioUrl: audioUrl
    });

  } catch (error: any) {
    console.error('转录过程中发生错误:', error);
    res.status(500).json({ error: error.message || '未知错误' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
