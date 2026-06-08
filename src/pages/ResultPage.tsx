import React, { useState, useEffect, useRef } from 'react';
import { Edit, Copy, Clock, ArrowLeft, CheckCircle, Play, Pause, Download } from 'lucide-react';
import { formatTime } from '../utils/formatTime';
import jsPDF from 'jspdf';

interface Speaker {
  id: string;
  name: string;
  color: string;
}

interface OutlineItem {
  title: string;
  time: string;
  keyPoints?: string[];
  goldenSentence?: string;
  case?: string;
  methods?: string[];
  suggestions?: string[];
}

interface Summary {
  core观点: string;
  outline: OutlineItem[];
  goldenSentences: string[];
  tags: string[];
  titles: string[];
  extensionTopics: string[];
}

interface Sentence {
  start: number; // 开始时间（毫秒）
  end: number; // 结束时间（毫秒）
  speaker: number; // 说话人ID
  text: string; // 文本内容
}

interface TranscriptionData {
  transcript: string;
  sentences: Sentence[];
  speakers: Speaker[];
  summary: Summary;
  duration: number; // in seconds
  audioUrl?: string; // 音频文件URL
}

interface ResultPageProps {
  data: TranscriptionData;
  onBackToUpload: () => void;
}

const ResultPage: React.FC<ResultPageProps> = ({ data, onBackToUpload }) => {
  // 打印接收到的 transcriptionData
  console.log('ResultPage 接收到的 transcriptionData:', data);
  console.log('transcriptionData 中的 summary:', data?.summary);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState(data.transcript);
  const [editedSpeakers, setEditedSpeakers] = useState([...data.speakers]);
  const [editingSpeakerId, setEditingSpeakerId] = useState<number | null>(null);
  const [editingSpeakerName, setEditingSpeakerName] = useState('');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [transcriptExportFormat, setTranscriptExportFormat] = useState('txt');
  const [summaryExportFormat, setSummaryExportFormat] = useState('txt');
  const [transcriptExportFilename, setTranscriptExportFilename] = useState('');
  const [summaryExportFilename, setSummaryExportFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ success: boolean; message: string } | null>(null);
  
  // 音频元素引用
  const audioRef = useRef<HTMLAudioElement | null>(null);



  useEffect(() => {
    // 初始化音频元素
    if (!audioRef.current) {
      const audio = document.createElement('audio');
      audio.controls = false;
      audio.style.display = 'none';
      document.body.appendChild(audio);
      audioRef.current = audio;
      
      // 监听音频时间更新
      const timeUpdateHandler = () => {
        if (audioRef.current) {
          setCurrentTime(Math.floor(audioRef.current.currentTime));
        }
      };
      
      // 监听音频结束
      const endedHandler = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      
      // 监听音频加载开始
      const loadStartHandler = () => {
        console.log('音频加载开始');
      };
      
      // 监听音频加载进度
      const progressHandler = () => {
        if (audioRef.current) {
          const loaded = audioRef.current.buffered.length > 0 ? audioRef.current.buffered.end(audioRef.current.buffered.length - 1) : 0;
          const duration = audioRef.current.duration || 0;
          console.log('音频加载进度:', (loaded / duration * 100).toFixed(2) + '%');
        }
      };
      
      // 监听音频加载元数据
      const loadedMetadataHandler = () => {
        console.log('音频元数据加载完成');
      };
      
      // 监听音频加载完成
      const canPlaythroughHandler = () => {
        console.log('音频文件加载完成，可以播放');
      };
      
      // 添加事件监听器
      audio.addEventListener('timeupdate', timeUpdateHandler);
      audio.addEventListener('ended', endedHandler);
      audio.addEventListener('error', handleAudioError);
      audio.addEventListener('loadstart', loadStartHandler);
      audio.addEventListener('progress', progressHandler);
      audio.addEventListener('loadedmetadata', loadedMetadataHandler);
      audio.addEventListener('canplaythrough', canPlaythroughHandler);
      
      // 清理函数中移除所有事件监听器
      return () => {
        // 清理音频元素
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
          // 移除所有事件监听器
          audioRef.current.removeEventListener('timeupdate', timeUpdateHandler);
          audioRef.current.removeEventListener('ended', endedHandler);
          audioRef.current.removeEventListener('error', handleAudioError);
          audioRef.current.removeEventListener('loadstart', loadStartHandler);
          audioRef.current.removeEventListener('progress', progressHandler);
          audioRef.current.removeEventListener('loadedmetadata', loadedMetadataHandler);
          audioRef.current.removeEventListener('canplaythrough', canPlaythroughHandler);
          document.body.removeChild(audioRef.current);
          audioRef.current = null;
        }
      };
    }
  }, []);
  
  // 监听播放状态
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(error => {
          console.error('音频播放失败:', error);
          setAudioError('音频播放失败，请检查浏览器音频权限和音频文件格式');
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);
  
  // 监听音频URL变化
  useEffect(() => {
    // 只有当audioUrl存在且不为空时才处理
    if (data.audioUrl && audioRef.current) {
      // 先暂停并重置音频元素
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      // 清除之前的src，确保音频元素完全重置
      audioRef.current.src = '';
      
      // 等待一小段时间，确保音频元素状态重置
      setTimeout(() => {
        if (audioRef.current && data.audioUrl) {
          // 设置新的音频URL
          audioRef.current.src = data.audioUrl;
          setAudioError(null);
          console.log('音频文件已加载:', data.audioUrl);
          
          // 尝试加载音频
          audioRef.current.load();
        }
      }, 100);
    }
  }, [data.audioUrl]);
  

  
  // 音频错误处理函数
  const handleAudioError = (e: Event) => {
    const audio = e.target as HTMLAudioElement;
    console.error('音频加载错误:', e, '错误代码:', audio.error?.code, '错误信息:', audio.error?.message);
    setAudioError(`音频加载失败: ${audio.error?.message || '未知错误'}`);
    setIsPlaying(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    // 这里可以添加复制成功的提示
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(error => {
          console.error('音频播放失败:', error);
          setAudioError('音频播放失败，请检查浏览器音频权限和音频文件格式');
          setIsPlaying(false);
        });
      }
      setIsPlaying(!isPlaying);
    } else {
      console.error('音频元素未初始化');
      setAudioError('音频元素未初始化');
    }
  };

  const handleStartEditing = () => {
    setIsEditing(true);
  };

  const handleSaveEditing = () => {
    setIsEditing(false);
    // 这里可以添加保存成功的提示
    console.log('Transcript saved:', editedTranscript);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditedTranscript(data.transcript);
    setEditedSpeakers(data.speakers);
  };

  const handleTranscriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedTranscript(e.target.value);
  };

  // 处理点击跳转至对应时间点
  const handleTimeJump = (startTime: number) => {
    const timeInSeconds = Math.floor(startTime / 1000);
    setCurrentTime(timeInSeconds);
    
    if (audioRef.current) {
      audioRef.current.currentTime = timeInSeconds;
      audioRef.current.play().catch(error => {
        console.error('音频播放失败:', error);
        setAudioError('音频播放失败，请检查浏览器音频权限和音频文件格式');
        setIsPlaying(false);
      });
      setIsPlaying(true);
    } else {
      console.error('音频元素未初始化');
      setAudioError('音频元素未初始化');
    }
    console.log('跳转到时间点:', formatTime(startTime));
  };

  // 开始编辑说话人名称
  const handleStartEditSpeaker = (speakerId: number, currentName: string) => {
    setEditingSpeakerId(speakerId);
    setEditingSpeakerName(currentName);
  };

  // 保存说话人名称
  const handleSaveSpeakerName = (speakerId: number) => {
    if (editingSpeakerName.trim()) {
      const updatedSpeakers = editedSpeakers.map((speaker) => {
        if (speaker.id === `speaker-${speakerId}`) {
          return { ...speaker, name: editingSpeakerName.trim() };
        }
        return speaker;
      });
      setEditedSpeakers(updatedSpeakers);
    }
    setEditingSpeakerId(null);
    setEditingSpeakerName('');
  };

  // 取消编辑说话人名称
  const handleCancelEditSpeaker = () => {
    setEditingSpeakerId(null);
    setEditingSpeakerName('');
  };

  // 生成导出文件名
  const generateExportFilename = (prefix: string, format: string) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${prefix}_${year}${month}${day}_${hours}${minutes}${seconds}.${format}`;
  };

  // 处理导出错误
  const handleExportError = (error: Error) => {
    setIsExporting(false);
    setExportStatus({ success: false, message: `导出失败: ${error.message}` });
    setTimeout(() => setExportStatus(null), 3000);
  };

  // 处理导出成功
  const handleExportSuccess = (format: string) => {
    setIsExporting(false);
    setExportStatus({ success: true, message: `成功导出为${format}格式` });
    setTimeout(() => setExportStatus(null), 3000);
  };

  // 导出为TXT格式
  const exportAsTXT = async () => {
    try {
      setIsExporting(true);
      const text = editedTranscript;
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = transcriptExportFilename || generateExportFilename('transcription', 'txt');
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      handleExportSuccess('TXT');
    } catch (error) {
      handleExportError(error as Error);
    }
  };

  // 导出为JSON格式
  const exportAsJSON = async () => {
    try {
      setIsExporting(true);
      const exportData = {
        metadata: {
          exportTime: new Date().toISOString(),
          contentType: 'transcription',
          format: 'json'
        },
        transcript: editedTranscript,
        speakers: data.speakers,
        summary: data.summary,
        duration: data.duration
      };
      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = transcriptExportFilename || generateExportFilename('transcription', 'json');
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      handleExportSuccess('JSON');
    } catch (error) {
      handleExportError(error as Error);
    }
  };

  // 导出为Markdown格式
  const exportAsMarkdown = async () => {
    try {
      setIsExporting(true);
      let markdown = `# 转录结果

`;
      
      // 添加说话人信息
      markdown += `## 说话人信息
`;
      data.speakers.forEach((speaker) => {
        markdown += `- ${speaker.name} (颜色: ${speaker.color})
`;
      });
      markdown += `
`;
      
      // 添加转录内容
      markdown += `## 转录内容

`;
      data.sentences.forEach((sentence) => {
        const speaker = (editedSpeakers || data.speakers)[sentence.speaker - 1] || data.speakers[0];
        const speakerName = speaker ? speaker.name : `说话人${sentence.speaker}`;
        const startTime = formatTime(sentence.start);
        const endTime = formatTime(sentence.end);
        
        markdown += `### ${speakerName}
`;
        markdown += `**时间**: [${startTime} - ${endTime}](#time-${sentence.start})
`;
        markdown += `${sentence.text}

`;
      });
      
      // 添加AI总结
      markdown += `## AI智能总结

`;
      markdown += `### 核心观点
${data.summary.core观点}

`;
      markdown += `### 内容大纲
`;
      data.summary.outline.forEach((item, index) => {
        markdown += `${index + 1}. ${item.title} ${item.time}
`;
        if (item.keyPoints) {
          item.keyPoints.forEach(point => {
            markdown += `  - ${point}
`;
          });
        }
        if (item.goldenSentence) {
          markdown += `  **金句**: ${item.goldenSentence}
`;
        }
        markdown += `
`;
      });
      
      markdown += `### 金句摘录
`;
      data.summary.goldenSentences.forEach((sentence, index) => {
        markdown += `${index + 1}. ${sentence}
`;
      });
      markdown += `
`;
      
      markdown += `### 关键词标签
`;
      markdown += data.summary.tags.map(tag => `#${tag.replace(/^#+/, '')}`).join(' ');
      markdown += `
`;
      
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = transcriptExportFilename || generateExportFilename('transcription', 'md');
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      handleExportSuccess('Markdown');
    } catch (error) {
      handleExportError(error as Error);
    }
  };

  // 导出为SRT字幕格式
  const exportAsSRT = async () => {
    try {
      setIsExporting(true);
      let srt = '';
      data.sentences.forEach((sentence, index) => {
        const speaker = (editedSpeakers || data.speakers)[sentence.speaker - 1] || data.speakers[0];
        const speakerName = speaker ? speaker.name : `说话人${sentence.speaker}`;
        
        // 转换时间格式为SRT格式 (00:00:00,000)
        const formatSRTTime = (ms: number) => {
          const totalSeconds = Math.floor(ms / 1000);
          const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
          const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
          const seconds = (totalSeconds % 60).toString().padStart(2, '0');
          const milliseconds = (ms % 1000).toString().padStart(3, '0');
          return `${hours}:${minutes}:${seconds},${milliseconds}`;
        };
        
        srt += `${index + 1}\n`;
        srt += `${formatSRTTime(sentence.start)} --> ${formatSRTTime(sentence.end)}\n`;
        srt += `${speakerName}: ${sentence.text}\n\n`;
      });
      
      const blob = new Blob([srt], { type: 'text/srt' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = transcriptExportFilename || generateExportFilename('transcription', 'srt');
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      handleExportSuccess('SRT');
    } catch (error) {
      handleExportError(error as Error);
    }
  };

  // 增强版导出为Word格式（自动应用样式）
  const exportAsEnhancedWord = async () => {
    try {
      setIsExporting(true);
      const html = `
        <html>
          <head>
            <meta charset="utf-8">
            <title>转录结果</title>
            <style>
              body { font-family: "Microsoft YaHei", Arial, sans-serif; line-height: 1.6; margin: 20px; }
              h1 { color: #333; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
              h2 { color: #555; font-size: 20px; font-weight: bold; margin-top: 30px; margin-bottom: 15px; }
              p { margin-bottom: 10px; }
              .transcript { margin-top: 20px; }
              .speaker { font-weight: bold; color: #3b82f6; margin-top: 15px; }
              .time { font-size: 12px; color: #666; margin-bottom: 5px; }
              .text { margin-left: 20px; margin-bottom: 10px; }
            </style>
          </head>
          <body>
            <h1>转录结果</h1>
            
            <h2>说话人信息</h2>
            <div>
              ${data.speakers.map((speaker) => `
                <p><strong>${speaker.name}</strong></p>
              `).join('')}
            </div>
            
            <h2>转录内容</h2>
            <div class="transcript">
              ${data.sentences.map((sentence) => {
                const speaker = (editedSpeakers || data.speakers).find(s => s.id === `speaker-${sentence.speaker}`) || 
                              (editedSpeakers || data.speakers)[0] || 
                              { name: `说话人${sentence.speaker}` };
                const speakerName = speaker.name;
                const startTime = formatTime(sentence.start);
                return `
                  <div class="speaker">${speakerName}</div>
                  <div class="text"><span class="time">(${startTime})</span> ${sentence.text}</div>
                `;
              }).join('')}
            </div>
          </body>
        </html>
      `;
      const blob = new Blob([html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = transcriptExportFilename || generateExportFilename('transcription', 'docx');
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      handleExportSuccess('DOCX');
    } catch (error) {
      handleExportError(error as Error);
    }
  };

  // 导出为PDF格式
  const exportAsPDF = async () => {
    try {
      setIsExporting(true);
      const doc = new jsPDF();
      let y = 20;
      const lineHeight = 10;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;

      // 添加标题
      doc.setFontSize(18);
      doc.text('转录结果', pageWidth / 2, y, { align: 'center' });
      y += lineHeight * 2;

      // 添加说话人信息
      doc.setFontSize(14);
      doc.text('说话人信息', margin, y);
      y += lineHeight;
      doc.setFontSize(12);
      data.speakers.forEach((speaker) => {
        doc.text(`- ${speaker.name}`, margin + 10, y);
        y += lineHeight;
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });

      // 添加转录内容
      doc.setFontSize(14);
      doc.text('转录内容', margin, y);
      y += lineHeight;
      doc.setFontSize(12);
      data.sentences.forEach((sentence) => {
        const speaker = (editedSpeakers || data.speakers).find(s => s.id === `speaker-${sentence.speaker}`) || 
                      (editedSpeakers || data.speakers)[0] || 
                      { name: `说话人${sentence.speaker}` };
        const speakerName = speaker.name;
        const startTime = formatTime(sentence.start);
        
        doc.setFont('helvetica', 'bold');
        doc.text(`${speakerName} (${startTime})`, margin + 10, y);
        y += lineHeight;
        doc.setFont('helvetica', 'normal');
        
        // 处理长文本，自动换行
        const textLines = doc.splitTextToSize(sentence.text, pageWidth - margin * 2 - 10);
        textLines.forEach(line => {
          doc.text(line, margin + 20, y);
          y += lineHeight;
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
        });
        y += lineHeight;
      });

      // 保存PDF
      const filename = transcriptExportFilename || generateExportFilename('transcription', 'pdf');
      doc.save(filename);
      handleExportSuccess('PDF');
    } catch (error) {
      handleExportError(error as Error);
    }
  };

  // AI智能总结导出函数
  // 导出AI总结为TXT格式
  const exportSummaryAsTXT = async () => {
    try {
      setIsExporting(true);
      const text = `【精选标题】\n${data.summary.titles?.map((title, i) => (i + 1) + '. ' + title).join('\n') || '无'}\n\n【核心观点】\n${data.summary.core观点}\n\n【内容大纲】\n${data.summary.outline.map((item, i) => (i + 1) + '. ' + item.title + ' ' + item.time + '\n' + (item.keyPoints?.map(point => '  - ' + point).join('\n') || '') + '\n' + (item.goldenSentence ? '  金句：' + item.goldenSentence : '') + '\n' + (item.case ? '  案例：' + item.case : '')).join('\n\n')}\n\n【延伸话题】\n${data.summary.extensionTopics?.map((topic, i) => (i + 1) + '. ' + topic).join('\n') || '无'}\n\n【金句摘录】\n${data.summary.goldenSentences.map(sentence => '- ' + sentence).join('\n')}\n\n【关键词标签】\n${data.summary.tags.map(tag => '#' + tag.replace(/^#+/, '')).join(' ')}`;
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = summaryExportFilename || generateExportFilename('ai_summary', 'txt');
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      handleExportSuccess('TXT');
    } catch (error) {
      handleExportError(error as Error);
    }
  };

  // 导出AI总结为Word格式
  const exportSummaryAsWord = async () => {
    try {
      setIsExporting(true);
      const html = `
        <html>
          <head>
            <meta charset="utf-8">
            <title>AI总结</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
              h1 { color: #333; }
              h2 { color: #555; margin-top: 30px; }
              h3 { color: #666; margin-top: 20px; }
              ul { margin-left: 20px; }
              .tags { margin-top: 10px; }
              .tag { display: inline-block; background-color: #f0f0f0; padding: 5px 10px; margin-right: 10px; border-radius: 4px; }
            </style>
          </head>
          <body>
            <h1>AI智能总结</h1>
            ${data.summary.titles && data.summary.titles.length > 0 ? `
            <h2>精选标题</h2>
            <ul>${data.summary.titles.map(title => `<li>${title}</li>`).join('')}</ul>
            ` : ''}
            <h2>核心观点</h2>
            <p>${data.summary.core观点}</p>
            <h2>内容大纲</h2>
            <div>${data.summary.outline.map((item, i) => `
              <h3>${i + 1}. ${item.title} ${item.time}</h3>
              ${item.keyPoints ? `<ul>${item.keyPoints.map(point => `<li>${point}</li>`).join('')}</ul>` : ''}
              ${item.goldenSentence ? `<p><strong>金句：</strong>${item.goldenSentence}</p>` : ''}
              ${item.case ? `<p><strong>案例：</strong>${item.case}</p>` : ''}
            `).join('')}</div>
            ${data.summary.extensionTopics && data.summary.extensionTopics.length > 0 ? `
            <h2>延伸话题</h2>
            <ul>${data.summary.extensionTopics.map(topic => `<li>${topic}</li>`).join('')}</ul>
            ` : ''}
            <h2>金句摘录</h2>
            <ul>${data.summary.goldenSentences.map(sentence => `<li>${sentence}</li>`).join('')}</ul>
            <h2>关键词标签</h2>
            <div class="tags">${data.summary.tags.map(tag => `<span class="tag">#${tag.replace(/^#+/, '')}</span>`).join('')}</div>
          </body>
        </html>
      `;
      const blob = new Blob([html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = summaryExportFilename || generateExportFilename('ai_summary', 'docx');
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      handleExportSuccess('DOCX');
    } catch (error) {
      handleExportError(error as Error);
    }
  };

  // 导出AI总结为Markdown格式
  const exportSummaryAsMarkdown = async () => {
    try {
      setIsExporting(true);
      let markdown = `# AI智能总结

`;
      if (data.summary.titles && data.summary.titles.length > 0) {
        markdown += `## 精选标题
`;
        data.summary.titles.forEach((title, index) => {
          markdown += `${index + 1}. ${title}
`;
        });
        markdown += `
`;
      }
      markdown += `## 核心观点
${data.summary.core观点}

`;
      markdown += `## 内容大纲
`;
      data.summary.outline.forEach((item, index) => {
        markdown += `${index + 1}. ${item.title} ${item.time}
`;
        if (item.keyPoints) {
          item.keyPoints.forEach(point => {
            markdown += `  - ${point}
`;
          });
        }
        if (item.goldenSentence) {
          markdown += `  **金句**: ${item.goldenSentence}
`;
        }
        markdown += `
`;
      });
      if (data.summary.extensionTopics && data.summary.extensionTopics.length > 0) {
        markdown += `## 延伸话题
`;
        data.summary.extensionTopics.forEach((topic, index) => {
          markdown += `${index + 1}. ${topic}
`;
        });
        markdown += `
`;
      }
      markdown += `## 金句摘录
`;
      data.summary.goldenSentences.forEach((sentence, index) => {
        markdown += `${index + 1}. ${sentence}
`;
      });
      markdown += `
`;
      markdown += `## 关键词标签
`;
      markdown += data.summary.tags.map(tag => `#${tag.replace(/^#+/, '')}`).join(' ');
      markdown += `
`;
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = summaryExportFilename || generateExportFilename('ai_summary', 'md');
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      handleExportSuccess('Markdown');
    } catch (error) {
      handleExportError(error as Error);
    }
  };

  // 导出AI总结为SRT格式（简化版）
  const exportSummaryAsSRT = async () => {
    try {
      setIsExporting(true);
      let srt = '';
      data.summary.goldenSentences.forEach((sentence, index) => {
        // 简化的SRT格式，使用固定时间间隔
        const startTime = index * 5;
        const endTime = (index + 1) * 5;
        
        const formatSRTTime = (seconds: number) => {
          const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
          const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
          const secs = (seconds % 60).toString().padStart(2, '0');
          return `${hours}:${minutes}:${secs},000`;
        };
        
        srt += `${index + 1}\n`;
        srt += `${formatSRTTime(startTime)} --> ${formatSRTTime(endTime)}\n`;
        srt += `${sentence}\n\n`;
      });
      const blob = new Blob([srt], { type: 'text/srt' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = summaryExportFilename || generateExportFilename('ai_summary', 'srt');
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      handleExportSuccess('SRT');
    } catch (error) {
      handleExportError(error as Error);
    }
  };

  // 导出AI总结为JSON格式
  const exportSummaryAsJSON = async () => {
    try {
      setIsExporting(true);
      const summaryData = {
        metadata: {
          exportTime: new Date().toISOString(),
          contentType: 'ai_summary',
          format: 'json'
        },
        core观点: data.summary.core观点,
        outline: data.summary.outline,
        goldenSentences: data.summary.goldenSentences,
        tags: data.summary.tags
      };
      const jsonStr = JSON.stringify(summaryData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = summaryExportFilename || generateExportFilename('ai_summary', 'json');
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      handleExportSuccess('JSON');
    } catch (error) {
      handleExportError(error as Error);
    }
  };

  // 导出AI总结为PDF格式
  const exportSummaryAsPDF = async () => {
    try {
      setIsExporting(true);
      const doc = new jsPDF();
      let y = 20;
      const lineHeight = 10;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;

      // 添加标题
      doc.setFontSize(18);
      doc.text('AI智能总结', pageWidth / 2, y, { align: 'center' });
      y += lineHeight * 2;

      // 添加精选标题
      if (data.summary.titles && data.summary.titles.length > 0) {
        doc.setFontSize(14);
        doc.text('精选标题', margin, y);
        y += lineHeight;
        doc.setFontSize(12);
        data.summary.titles.forEach((title, index) => {
          doc.text(`${index + 1}. ${title}`, margin + 10, y);
          y += lineHeight;
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
        });
        y += lineHeight;
      }

      // 添加核心观点
      doc.setFontSize(14);
      doc.text('核心观点', margin, y);
      y += lineHeight;
      doc.setFontSize(12);
      const coreLines = doc.splitTextToSize(data.summary.core观点, pageWidth - margin * 2);
      coreLines.forEach(line => {
        doc.text(line, margin + 10, y);
        y += lineHeight;
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });
      y += lineHeight;

      // 添加内容大纲
      doc.setFontSize(14);
      doc.text('内容大纲', margin, y);
      y += lineHeight;
      doc.setFontSize(12);
      data.summary.outline.forEach((item, index) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${item.title} ${item.time}`, margin + 10, y);
        y += lineHeight;
        doc.setFont('helvetica', 'normal');
        
        if (item.keyPoints) {
          item.keyPoints.forEach(point => {
            const pointLines = doc.splitTextToSize(`- ${point}`, pageWidth - margin * 2 - 10);
            pointLines.forEach(line => {
              doc.text(line, margin + 20, y);
              y += lineHeight;
              if (y > 270) {
                doc.addPage();
                y = 20;
              }
            });
          });
        }
        
        if (item.goldenSentence) {
          const goldenLines = doc.splitTextToSize(`金句：${item.goldenSentence}`, pageWidth - margin * 2 - 10);
          goldenLines.forEach(line => {
            doc.text(line, margin + 20, y);
            y += lineHeight;
            if (y > 270) {
              doc.addPage();
              y = 20;
            }
          });
        }
        y += lineHeight;
      });

      // 添加延伸话题
      if (data.summary.extensionTopics && data.summary.extensionTopics.length > 0) {
        doc.setFontSize(14);
        doc.text('延伸话题', margin, y);
        y += lineHeight;
        doc.setFontSize(12);
        data.summary.extensionTopics.forEach((topic, index) => {
          const topicLines = doc.splitTextToSize(`${index + 1}. ${topic}`, pageWidth - margin * 2 - 10);
          topicLines.forEach(line => {
            doc.text(line, margin + 10, y);
            y += lineHeight;
            if (y > 270) {
              doc.addPage();
              y = 20;
            }
          });
        });
        y += lineHeight;
      }

      // 添加金句摘录
      doc.setFontSize(14);
      doc.text('金句摘录', margin, y);
      y += lineHeight;
      doc.setFontSize(12);
      data.summary.goldenSentences.forEach((sentence, index) => {
        const sentenceLines = doc.splitTextToSize(`${index + 1}. ${sentence}`, pageWidth - margin * 2 - 10);
        sentenceLines.forEach(line => {
          doc.text(line, margin + 10, y);
          y += lineHeight;
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
        });
      });
      y += lineHeight;

      // 添加关键词标签
      doc.setFontSize(14);
      doc.text('关键词标签', margin, y);
      y += lineHeight;
      doc.setFontSize(12);
      const tagsText = data.summary.tags.map(tag => `#${tag.replace(/^#+/, '')}`).join(' ');
      const tagsLines = doc.splitTextToSize(tagsText, pageWidth - margin * 2);
      tagsLines.forEach(line => {
        doc.text(line, margin + 10, y);
        y += lineHeight;
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });

      // 保存PDF
      const filename = summaryExportFilename || generateExportFilename('ai_summary', 'pdf');
      doc.save(filename);
      handleExportSuccess('PDF');
    } catch (error) {
      handleExportError(error as Error);
    }
  };

  // 处理转录结果导出
  const handleTranscriptExport = () => {
    switch (transcriptExportFormat) {
      case 'txt':
        exportAsTXT();
        break;
      case 'docx':
        exportAsEnhancedWord();
        break;
      case 'md':
        exportAsMarkdown();
        break;
      case 'srt':
        exportAsSRT();
        break;
      case 'json':
        exportAsJSON();
        break;
      case 'pdf':
        exportAsPDF();
        break;
      default:
        exportAsTXT();
    }
  };

  // 处理AI总结导出
  const handleSummaryExport = () => {
    switch (summaryExportFormat) {
      case 'txt':
        exportSummaryAsTXT();
        break;
      case 'docx':
        exportSummaryAsWord();
        break;
      case 'md':
        exportSummaryAsMarkdown();
        break;
      case 'srt':
        exportSummaryAsSRT();
        break;
      case 'json':
        exportSummaryAsJSON();
        break;
      case 'pdf':
        exportSummaryAsPDF();
        break;
      default:
        exportSummaryAsTXT();
    }
  };



  return (
    <div className="container py-12">
      {/* 顶部操作栏 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <button 
            className="btn btn-outline flex items-center gap-2 text-lg px-6 py-3"
            onClick={onBackToUpload}
          >
            <ArrowLeft className="h-5 w-5" />
            返回上传
          </button>
          <button 
            className="btn btn-outline flex items-center gap-2 text-lg px-6 py-3"
            onClick={handlePlayPause}
          >
            {isPlaying ? (
              <><Pause className="h-5 w-5" /> 暂停</>
            ) : (
              <><Play className="h-5 w-5" /> 播放</>
            )}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-white/80" />
            <span>{Math.floor(currentTime / 60).toString().padStart(2, '0')}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / {Math.floor(data.duration / 60).toString().padStart(2, '0')}:{Math.floor(data.duration % 60).toString().padStart(2, '0')}</span>
          </div>
          {audioError && (
            <div className="text-red-500 text-sm">
              {audioError}
            </div>
          )}
          {!data.audioUrl && (
            <div className="text-yellow-500 text-sm">
              音频文件未加载，请检查上传过程
            </div>
          )}
        </div>
      </div>

      {/* 主卡片 */}
      <div className="max-w-6xl mx-auto card">
        {/* 内容区域 */}
        <div className="space-y-12">
          {/* 逐字稿 */}
          <div className="block">
            <div>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-800">
                  <span className="text-2xl">🎯</span>
                  转录结果
                </h2>
                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <>
                      <button 
                        className="btn btn-outline flex items-center gap-2 text-lg px-4 py-2"
                        onClick={handleCancelEditing}
                      >
                        取消
                      </button>
                      <button 
                        className="btn btn-primary flex items-center gap-2 text-lg px-6 py-2"
                        onClick={handleSaveEditing}
                      >
                        保存
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        className="btn btn-outline flex items-center gap-2 text-lg px-4 py-2"
                        onClick={handleStartEditing}
                      >
                        <Edit className="h-4 w-4" />
                        编辑
                      </button>
                      <button 
                        className="btn btn-outline flex items-center gap-2 text-lg px-4 py-2"
                        onClick={() => handleCopy(editedTranscript)}
                      >
                        <Copy className="h-4 w-4" />
                        复制全文
                      </button>
                    </>
                  )}
                </div>
              </div>
              {isEditing ? (
                <div className="space-y-6">
                  <textarea
                    className="w-full min-h-[200px] p-6 border border-gray-300 rounded-lg text-lg leading-relaxed resize-y"
                    value={editedTranscript}
                    onChange={handleTranscriptChange}
                    placeholder="在此编辑逐字稿..."
                    style={{ height: 'auto' }}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  {data.sentences && data.sentences.map((sentence, index) => {
                    // 查找对应的说话人信息
                    const speaker = (editedSpeakers || data.speakers).find(s => s.id === `speaker-${sentence.speaker}`) || 
                                  (editedSpeakers || data.speakers)[0] || 
                                  { name: `说话人${sentence.speaker}`, color: '#3b82f6' };
                    const speakerName = speaker.name;
                    const startTime = formatTime(sentence.start);
                    
                    return (
                      <div key={index} className="group mb-6">
                        {/* 说话人信息 */}
                        <div className="mb-2">
                          {editingSpeakerId === sentence.speaker ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                                value={editingSpeakerName}
                                onChange={(e) => setEditingSpeakerName(e.target.value)}
                                onBlur={() => handleSaveSpeakerName(sentence.speaker)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveSpeakerName(sentence.speaker);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEditSpeaker();
                                  }
                                }}
                                autoFocus
                              />
                              <button
                                className="text-sm text-blue-600 hover:text-blue-800"
                                onClick={() => handleSaveSpeakerName(sentence.speaker)}
                              >
                                保存
                              </button>
                              <button
                                className="text-sm text-gray-600 hover:text-gray-800"
                                onClick={handleCancelEditSpeaker}
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <div 
                              className="font-semibold text-lg text-gray-800 cursor-pointer"
                              onClick={() => handleStartEditSpeaker(sentence.speaker, speakerName)}
                              title="点击编辑说话人名称"
                            >
                              {speakerName}
                            </div>
                          )}
                        </div>
                        
                        {/* 文本内容和时间戳 */}
                        <div 
                          className="pl-4 border-l-2 border-gray-200"
                          onClick={() => handleTimeJump(sentence.start)}
                        >
                          <p className="text-lg leading-relaxed text-gray-700">
                            <span className="text-gray-500 mr-2">({startTime})</span>
                            {sentence.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* 导出功能模块 */}
              <div className="mt-8 p-6 border border-gray-200 rounded-lg">
                {/* 导出状态反馈 */}
                {exportStatus && (
                  <div className={`mb-6 p-4 rounded-lg ${exportStatus.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <div className="flex items-center gap-2">
                      {exportStatus.success ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className="text-lg">{exportStatus.message}</span>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-lg mb-2 text-gray-700">格式</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-lg text-lg"
                      value={transcriptExportFormat}
                      onChange={(e) => setTranscriptExportFormat(e.target.value)}
                    >
                      <option value="txt">TXT</option>
                      <option value="docx">DOCX</option>
                      <option value="md">Markdown</option>
                      <option value="srt">SRT</option>
                      <option value="json">JSON</option>
                      <option value="pdf">PDF</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-lg mb-2 text-gray-700">文件名</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-gray-300 rounded-lg text-lg"
                      placeholder={generateExportFilename('transcription', transcriptExportFormat)}
                      value={transcriptExportFilename}
                      onChange={(e) => setTranscriptExportFilename(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button 
                    className="btn btn-outline flex items-center gap-2 text-lg px-4 py-2 hover:bg-gray-100 transition-colors"
                    onClick={handleTranscriptExport}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <>
                        <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        导出中...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        导出
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* AI总结 - 放在转录结果下方，大小略小于转录结果 */}
          <div className="block mt-16 mb-16">
            <div className="max-w-4xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-800">
                  <span className="text-2xl">🧠</span>
                  AI智能总结
                </h2>
                <div className="flex items-center gap-3">
                  <button 
                    className="btn btn-outline flex items-center gap-2 text-lg px-4 py-2"
                    onClick={() => handleCopy("【核心观点】\n" + data.summary.core观点 + "\n\n【内容大纲】\n" + data.summary.outline.map((item, i) => (i + 1) + ". " + item.title + " " + item.time + "\n" + (item.keyPoints?.map(point => "  - " + point).join("\n") || "") + "\n" + (item.goldenSentence ? "  金句：" + item.goldenSentence : "") + "\n" + (item.case ? "  案例：" + item.case : "")).join("\n\n") + "\n\n【金句摘录】\n" + data.summary.goldenSentences.map(sentence => "- " + sentence).join("\n") + "\n\n【关键词标签】\n" + data.summary.tags.map(tag => "#" + tag.replace(/^#+/, '')).join(" "))}
                  >
                    <Copy className="h-4 w-4" />
                    复制总结
                  </button>
                </div>
              </div>
              
              {/* 精选标题 */}
              {data.summary.titles && data.summary.titles.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-3 text-gray-800">
                    <span className="text-xl">💎</span>
                    精选标题
                  </h3>
                  <div className="pl-8 space-y-2">
                    {data.summary.titles.map((title, index) => (
                      <p key={index} className="text-lg leading-relaxed text-gray-700">
                        {index + 1}. {title}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-3 text-gray-800">
                  <span className="text-xl">⭐</span>
                  核心观点
                </h3>
                <p className="text-lg leading-relaxed pl-8 text-gray-700">
                  <span>{data.summary.core观点}</span>
                </p>
              </div>
              
              {/* 内容大纲 */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-3 text-gray-800">
                  <span className="text-xl">📖</span>
                  内容大纲
                </h3>
                <div className="space-y-6 pl-8">
                  {data.summary.outline.map((item, index) => (
                    <div key={index} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-lg text-gray-800">{index + 1}. {item.title}</span>
                      </div>
                      {item.keyPoints && (
                        <ul className="list-disc list-inside text-lg text-gray-600 space-y-2">
                          {item.keyPoints.map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      )}
                      {item.goldenSentence && (
                        <p className="text-lg italic text-gray-600">
                          金句：{item.goldenSentence}
                        </p>
                      )}
                      {item.case && (
                        <p className="text-lg text-gray-600">
                          案例：{item.case}
                        </p>
                      )}
                      {item.methods && (
                        <ul className="list-disc list-inside text-lg text-gray-600 space-y-2">
                          {item.methods.map((method, i) => (
                            <li key={i}>{method}</li>
                          ))}
                        </ul>
                      )}
                      {item.suggestions && (
                        <ul className="list-disc list-inside text-lg text-gray-600 space-y-2">
                          {item.suggestions.map((suggestion, i) => (
                            <li key={i}>{suggestion}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 延伸话题 */}
              {data.summary.extensionTopics && data.summary.extensionTopics.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-3 text-gray-800">
                    <span className="text-xl">♾️</span>
                    延伸话题
                  </h3>
                  <div className="space-y-4 pl-8">
                    {data.summary.extensionTopics.map((topic, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <span className="text-blue-600 font-semibold text-lg">{index + 1}.</span>
                        <p className="text-lg leading-relaxed text-gray-700">{topic}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 金句摘录 */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-3 text-gray-800">
                  <span className="text-xl">📝</span>
                  金句摘录
                </h3>
                <div className="space-y-4 pl-8">
                  {data.summary.goldenSentences.map((sentence, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="text-blue-600 font-semibold text-lg">{index + 1}.</span>
                      <p className="text-lg leading-relaxed text-gray-700">{sentence}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 关键词标签 */}
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-3 text-gray-800">
                  <span className="text-xl">🏷️</span>
                  关键词标签
                </h3>
                <div className="flex flex-wrap gap-3 pl-8">
                  {data.summary.tags.map((tag, index) => (
                    <span key={index} className="badge badge-primary text-lg py-2 px-4">
                      #{tag.replace(/^#+/, '')}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* 导出功能模块 */}
              <div className="mt-8 p-6 border border-gray-200 rounded-lg">
                {/* 导出状态反馈 */}
                {exportStatus && (
                  <div className={`mb-6 p-4 rounded-lg ${exportStatus.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <div className="flex items-center gap-2">
                      {exportStatus.success ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className="text-lg">{exportStatus.message}</span>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-lg mb-2 text-gray-700">格式</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-lg text-lg"
                      value={summaryExportFormat}
                      onChange={(e) => setSummaryExportFormat(e.target.value)}
                    >
                      <option value="txt">TXT</option>
                      <option value="docx">DOCX</option>
                      <option value="md">Markdown</option>
                      <option value="srt">SRT</option>
                      <option value="json">JSON</option>
                      <option value="pdf">PDF</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-lg mb-2 text-gray-700">文件名</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-gray-300 rounded-lg text-lg"
                      placeholder={generateExportFilename('ai_summary', summaryExportFormat)}
                      value={summaryExportFilename}
                      onChange={(e) => setSummaryExportFilename(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button 
                    className="btn btn-outline flex items-center gap-2 text-lg px-4 py-2 hover:bg-gray-100 transition-colors"
                    onClick={handleSummaryExport}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <>
                        <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        导出中...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        导出
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>


        </div>

        {/* 质量保证 */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold mb-8 text-gray-800">质量保证</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-start gap-4">
              <CheckCircle className="h-8 w-8 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-xl mb-3 text-gray-800">准确率保证</h3>
                <p className="text-lg text-gray-600">
                          标准普通话转写准确率≥98%，中英混读内容准确率≥95%，带口音普通话（如粤普、川普）准确率≥90%
                        </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <CheckCircle className="h-8 w-8 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-xl mb-3 text-gray-800">用户反馈系统</h3>
                <p className="text-lg text-gray-600">
                          每10万小时行业语料注入触发模型升级，通过星火大模型语义纠错持续优化，确保专业场景转录质量越用越准
                        </p>
              </div>
            </div>
          </div>
        </div>


      </div>

      {/* 统计信息 */}
      <div className="stats-container mt-20">
        <div className="stat-item">
          <div className="stat-value text-2xl">98%</div>
          <div className="stat-label">准确率</div>
        </div>
        <div className="stat-item">
          <div className="stat-value text-2xl">96+</div>
          <div className="stat-label">支持语言</div>
        </div>
        <div className="stat-item">
          <div className="stat-value text-2xl">✓</div>
          <div className="stat-label">说话人识别</div>
        </div>
        <div className="stat-item">
          <div className="stat-value text-2xl">✓</div>
          <div className="stat-label">私密且安全</div>
        </div>
      </div>

      {/* 导出状态提示 */}
      {exportStatus && (
        <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg text-lg ${exportStatus.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} shadow-lg z-50`}>
          {exportStatus.message}
        </div>
      )}

      {/* 技术支持信息 */}
      <div className="text-center mt-20">
        <p className="text-white/80 text-lg mb-4">由讯飞录音文件转写大模型驱动</p>
        <p className="text-white/80 text-sm">国内语音转文字准确率排名第一</p>
      </div>
    </div>
  );
};

export default ResultPage;