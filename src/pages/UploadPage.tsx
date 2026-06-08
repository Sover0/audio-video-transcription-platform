import React, { useState, useRef, useEffect } from 'react';
import { Upload, Settings, Mic, Video, Play, Square } from 'lucide-react';



interface UploadPageProps {
  onUploadComplete: (data: any) => void;
  onViewPreviousResult?: () => void;
  hasPreviousResult?: boolean;
}

const UploadPage: React.FC<UploadPageProps> = ({ onUploadComplete, onViewPreviousResult, hasPreviousResult }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [audioLanguage, setAudioLanguage] = useState('zh');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<'audio' | 'video' | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    smartPunctuation: true,
    formalization: false,
    normalization: true
  });
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const cameraRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 加载保存的设置
  useEffect(() => {
    const savedSettings = localStorage.getItem('transcriptionSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('加载设置失败:', error);
      }
    }
  }, []);

  // 摄像头预览功能
  const startCameraPreview = async () => {
    if (recordingType === 'video' && !isRecording) {
      try {
        // 获取摄像头流
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setCameraStream(stream);
        if (cameraRef.current) {
          cameraRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('获取摄像头预览失败:', error);
        alert('无法访问摄像头，请检查权限设置');
      }
    }
  };

  // 停止摄像头预览
  const stopCameraPreview = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      if (cameraRef.current) {
        cameraRef.current.srcObject = null;
      }
    }
  };

  // 当录制类型变为视频时，启动摄像头预览
  useEffect(() => {
    if (recordingType === 'video') {
      startCameraPreview();
    } else {
      stopCameraPreview();
    }

    // 组件卸载时停止摄像头预览
    return () => {
      stopCameraPreview();
    };
  }, [recordingType]);

  // 保存设置
  const saveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
    localStorage.setItem('transcriptionSettings', JSON.stringify(newSettings));
  };

  // 音频格式转换函数（使用后端服务）
  const convertAudioFormat = async (file: File): Promise<File> => {
    console.log('开始转换音频格式:', file.name, file.type);
    
    // 如果文件已经是WAV格式，直接返回
    if (file.type === 'audio/wav') {
      console.log('文件已经是WAV格式，跳过转换');
      return file;
    }
    
    console.log('创建FormData...');
    const formData = new FormData();
    formData.append('audio', file);
    console.log('FormData创建完成，文件大小:', file.size, '字节');

    try {
      console.log('发送请求到后端服务器...');
      console.log('请求URL: http://localhost:3001/api/convert');
      
      // 测试健康检查端点
      console.log('测试健康检查端点...');
      const healthResponse = await fetch('http://localhost:3001/health');
      console.log('健康检查响应:', healthResponse.status, healthResponse.statusText);
      
      if (!healthResponse.ok) {
        console.error('健康检查失败，后端服务器可能未运行');
        throw new Error('后端服务器未运行');
      }
      
      // 发送转换请求
      console.log('发送转换请求...');
      const response = await fetch('http://localhost:3001/api/convert', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'audio/wav'
        }
      });

      console.log('收到后端响应:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('音频格式转换失败:', errorText);
        throw new Error(`音频格式转换失败: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('收到转换后的文件:', blob.size, blob.type);
      
      const convertedFile = new File([blob], `converted_${file.name.replace(/\.[^/.]+$/, '')}.wav`, {
        type: 'audio/wav'
      });

      console.log('音频格式转换完成:', convertedFile.name, convertedFile.type);
      return convertedFile;
    } catch (error) {
      console.error('音频格式转换失败:', error);
      console.warn('使用原始文件继续');
      return file;
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);

    try {
      // 检查文件大小（500MB限制）
      console.log('文件大小:', file.size, '字节');
      console.log('500MB限制:', 500 * 1024 * 1024, '字节');
      if (file.size > 500 * 1024 * 1024) {
        throw new Error('文件大小超过500MB限制，请选择较小的文件');
      }

      // 检查文件类型
      if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
        throw new Error('请上传音频或视频文件');
      }

      // 处理文件
      console.log('开始处理文件:', file.name, file.type);
      let fileToTranscribe = file;
      
      // 只对音频文件进行格式转换，视频文件直接传递给后端
      if (file.type.startsWith('audio/') && file.type !== 'audio/wav') {
        fileToTranscribe = await convertAudioFormat(file);
      }

      // 调用转录API
      const transcriptionResult = await transcribeFile(fileToTranscribe, recordingType !== null);
      setTimeout(() => {
        setIsUploading(false);
        onUploadComplete(transcriptionResult);
      }, 500);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setIsUploading(false);
      // 显示错误提示
      alert(`上传失败: ${error.message || '未知错误'}`);
    }
  };

  const startRecording = async () => {
    if (!recordingType) return;
    
    try {
      // 重置录制时间
      setRecordingTime(0);
      
      // 开始计时器
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // 获取媒体流
      let stream;
      if (recordingType === 'video' && cameraStream) {
        // 如果已经有摄像头流，复用它并添加音频
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioTrack = audioStream.getAudioTracks()[0];
        stream = new MediaStream();
        
        // 添加摄像头流的视频轨道
        cameraStream.getVideoTracks().forEach(track => {
          stream.addTrack(track);
        });
        
        // 添加音频轨道
        if (audioTrack) {
          stream.addTrack(audioTrack);
        }
        
        // 更新摄像头流和预览
        setCameraStream(stream);
        if (cameraRef.current) {
          cameraRef.current.srcObject = stream;
        }
      } else {
        // 否则，重新获取完整的媒体流
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: recordingType === 'video'
        });

        // 处理视频流
        if (recordingType === 'video') {
          setCameraStream(stream);
          if (cameraRef.current) {
            cameraRef.current.srcObject = stream;
          }
        }
      }

      // 处理音频流和电平检测
      if (recordingType === 'audio' || recordingType === 'video') {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        const analyser = audioContext.createAnalyser();
        analyserRef.current = analyser;
        
        // 连接音频流到分析器
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        // 配置分析器
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        // 实时更新音频电平
        const updateAudioLevel = () => {
          if (analyserRef.current && isRecording) {
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength;
            setAudioLevel(average / 255); // 归一化到0-1
            requestAnimationFrame(updateAudioLevel);
          }
        };
        updateAudioLevel();
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // 停止计时器
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // 停止音频分析
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
          analyserRef.current = null;
        }

        // 停止视频流
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
        }

        const blob = new Blob(recordedChunksRef.current, {
          type: recordingType === 'audio' ? 'audio/webm' : 'video/webm'
        });
        const file = new File([blob], `recording.${recordingType === 'audio' ? 'webm' : 'webm'}`, {
          type: blob.type
        });
        handleFileUpload(file);

        // 停止所有轨道
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('无法开始录音/录像，请检查权限设置');
      
      // 清理计时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 格式化录制时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
    console.log('生成的时间戳:', dateTime);
    return dateTime;
  };



  // 获取音频文件时长（毫秒）
  const getAudioDuration = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      try {
        const audio = new Audio();
        audio.preload = 'metadata';
        
        audio.onloadedmetadata = () => {
          const duration = Math.floor(audio.duration * 1000).toString();
          console.log('音频时长:', duration, '毫秒');
          resolve(duration);
        };
        
        audio.onerror = () => {
          console.error('无法获取音频时长，使用默认值0');
          resolve('0');
        };
        
        audio.src = URL.createObjectURL(file);
      } catch (error) {
        console.error('获取音频时长失败:', error);
        resolve('0');
      }
    });
  };

  // 转录函数（使用后端服务）
  const transcribeFile = async (file: File, isRecording: boolean = false): Promise<any> => {
    console.log('开始转录文件:', file.name, file.type, '是否为录制文件:', isRecording);
    
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('isRecording', isRecording.toString());

    try {
      console.log('发送请求到后端转录服务...');
      const response = await fetch('http://localhost:3001/api/transcribe', {
        method: 'POST',
        body: formData
      });

      console.log('收到后端响应:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('转录失败:', errorText);
        throw new Error(`转录失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('转录结果:', result);
      console.log('转录响应完整对象:', result);
      console.log('转录响应中的 summary:', result.summary);
      return result;
    } catch (error) {
      console.error('转录失败:', error);
      throw new Error('转录失败，请检查网络连接或后端服务');
    }
  };

  return (
    <div className="container py-12">
      {/* 标题 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">音频和视频转录为文本</h1>
        <p className="text-center text-white/80 text-lg mb-8">将任何音频或视频文件转为准确的文本并为您智能总结提供创作素材</p>
        {/* 查看之前的转录结果按钮 */}
        {hasPreviousResult && onViewPreviousResult && (
          <div className="mt-4">
            <button 
              className="btn btn-outline text-lg px-6 py-2"
              onClick={onViewPreviousResult}
            >
              查看之前的转录结果
            </button>
          </div>
        )}
      </div>

      {/* 主上传卡片 */}
      <div className="max-w-4xl mx-auto card">
        <h2 className="text-2xl font-bold mb-8 text-center" style={{ color: '#7EB699' }}>转录功能</h2>
        
        {/* 功能模块 */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">选择功能</h3>
          <div className="flex flex-col gap-4 max-w-md mx-auto">
            {/* 浏览文件按钮 */}
            <button 
              className="btn btn-primary py-8 text-xl"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'audio/*,video/*';
                input.style.display = 'none';
                input.onchange = (e) => {
                  const target = e.target as HTMLInputElement;
                  if (target.files && target.files.length > 0) {
                    handleFileUpload(target.files[0]);
                  }
                };
                document.body.appendChild(input);
                input.click();
                setTimeout(() => document.body.removeChild(input), 100);
              }}
              disabled={isUploading || isRecording}
            >
              <Upload className="h-8 w-8 mr-3 inline" />
              浏览文件
            </button>
            
            {/* 录制音频按钮 */}
            <button
              className="btn btn-primary py-8 text-xl"
              onClick={() => setRecordingType('audio')}
              disabled={isUploading || isRecording}
            >
              <Mic className="h-8 w-8 mr-3 inline" />
              录制音频
            </button>
            
            {/* 录制视频按钮 */}
            <button
              className="btn btn-primary py-8 text-xl"
              onClick={() => setRecordingType('video')}
              disabled={isUploading || isRecording}
            >
              <Video className="h-8 w-8 mr-3 inline" />
              录制视频
            </button>
          </div>
        </div>

        {/* 录制控制模块 */}
        {recordingType && (
          <div className="mb-8 border border-gray-200 rounded-lg p-6 bg-gray-50">
            {/* 通用控制选项 */}
            <div className="mb-6">
              <h4 className="font-medium text-lg mb-4">录制设置</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="mic-input" defaultChecked className="w-5 h-5" />
                  <label htmlFor="mic-input" className="text-lg text-black">麦克风</label>
                  <span className="text-sm text-gray-500 ml-2">（录制您的语音）</span>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="system-sound" className="w-5 h-5" />
                  <label htmlFor="system-sound" className="text-lg text-black">系统声音</label>
                  <span className="text-sm text-gray-500 ml-2">（录制电脑播放的声音）</span>
                </div>
              </div>
            </div>
            
            {/* 音频录制特定功能 */}
            {recordingType === 'audio' && (
              <div className="mb-6">
                <h4 className="font-medium text-lg mb-4">音频录制</h4>
                {isRecording && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg text-gray-700">录音电平</span>
                        <span className="text-lg text-gray-700">{formatTime(recordingTime)}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        {[...Array(10)].map((_, index) => (
                          <div 
                            key={index} 
                            className="h-16 w-3 bg-gray-200 rounded-full"
                            style={{
                              height: `${Math.max(20, audioLevel * 100 + Math.random() * 10)}px`,
                              backgroundColor: audioLevel > 0.7 ? '#F6B9C3' : '#7EB699',
                              transition: 'height 0.1s ease'
                            }}
                          ></div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
            
            {/* 视频录制特定功能 */}
            {recordingType === 'video' && (
              <div className="mb-6">
                <h4 className="font-medium text-lg mb-4">视频录制</h4>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <button 
                      className="flex-1 py-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                      onClick={() => alert('全屏录制功能开发中')}
                    >全屏</button>
                    <button 
                      className="flex-1 py-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                      onClick={() => alert('窗口录制功能开发中')}
                    >窗口</button>
                    <button 
                      className="flex-1 py-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                      onClick={() => alert('标签页录制功能开发中')}
                    >标签页</button>
                  </div>
                  {isRecording && (
                    <div className="space-y-4">
                      <div className="border border-gray-200 rounded-lg p-2 bg-gray-100">
                        <div style={{ position: 'relative', width: '100%', height: '180px' }}>
                          <video 
                            ref={cameraRef} 
                            className="w-full h-full object-cover rounded" 
                            autoPlay 
                            muted 
                            playsInline
                            style={{ display: 'block' }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg text-gray-700">状态: 录制中</span>
                        <span className="text-lg text-gray-700">{formatTime(recordingTime)}</span>
                      </div>
                    </div>
                  )}
                  {!isRecording && (
                    <div className="border border-gray-200 rounded-lg p-2 bg-gray-100">
                      <div style={{ position: 'relative', width: '100%', height: '180px' }}>
                        <video 
                          ref={cameraRef} 
                          className="w-full h-full object-cover rounded" 
                          autoPlay 
                          muted 
                          playsInline
                          style={{ display: 'block' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* 录制控制按钮 */}
            {!isRecording ? (
              <button
                className="btn btn-primary w-full py-3 text-lg"
                onClick={startRecording}
              >
                <Play className="h-5 w-5 mr-2 inline" />
                开始录制
              </button>
            ) : (
              <div className="flex gap-4">
                <button
                  className="btn btn-primary flex-1 py-3 text-lg"
                  onClick={stopRecording}
                >
                  <Square className="h-5 w-5 mr-2 inline" />
                  停止录制
                </button>
                <button
                  className="btn btn-outline flex-1 py-3 text-lg"
                >
                  查看文件
                </button>
              </div>
            )}
          </div>
        )}

        {/* 音频语言选择 */}
        <div className="mb-8">
          <label className="form-label block mb-3 font-medium text-lg">音频语言</label>
          <div className="relative">
            <select
              className="form-select w-full py-3"
              value={audioLanguage}
              onChange={(e) => setAudioLanguage(e.target.value)}
            >
              <option value="zh">简体中文</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>



        {/* 说话人识别设置 */}
        <div className="mb-0">
          <button 
            className="btn btn-outline w-full py-3 flex items-center justify-between"
            onClick={() => setIsSettingsOpen(true)}
          >
            <span className="font-medium">更多设置</span>
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* 设置弹出界面 */}
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">

                
                <div className="space-y-0">
                  <div className="border border-gray-200 rounded-t-lg p-4 m-0">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="smart-punctuation" 
                        className="w-5 h-5" 
                        checked={settings.smartPunctuation}
                        onChange={(e) => saveSettings({...settings, smartPunctuation: e.target.checked})}
                      />
                      <label htmlFor="smart-punctuation" className="text-lg text-gray-700">智能断句</label>
                    </div>
                  </div>
                  
                  <div className="border-t-0 border-x border-b border-gray-200 p-4 m-0">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="formalization" 
                        className="w-5 h-5" 
                        checked={settings.formalization}
                        onChange={(e) => saveSettings({...settings, formalization: e.target.checked})}
                      />
                      <label htmlFor="formalization" className="text-lg text-gray-700">口语转书面语</label>
                    </div>
                  </div>
                  
                  <div className="border-t-0 border-x border-b border-gray-200 rounded-b-lg p-4 m-0">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="normalization" 
                        className="w-5 h-5" 
                        checked={settings.normalization}
                        onChange={(e) => saveSettings({...settings, normalization: e.target.checked})}
                      />
                      <label htmlFor="normalization" className="text-lg text-gray-700">繁简统一与数字规范化</label>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end gap-4">
                  <button 
                    className="btn btn-primary py-1.5 px-3 text-sm"
                    onClick={() => setIsSettingsOpen(false)}
                  >
                    确定
                  </button>
                  <button 
                    className="btn btn-primary py-1.5 px-3 text-sm"
                    onClick={() => {
                      if (window.confirm('确定要取消所有更改吗？')) {
                        // 恢复到操作前状态
                        const savedSettings = localStorage.getItem('transcriptionSettings');
                        if (savedSettings) {
                          try {
                            setSettings(JSON.parse(savedSettings));
                          } catch (error) {
                            console.error('恢复设置失败:', error);
                          }
                        }
                        setIsSettingsOpen(false);
                      }
                    }}
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 转录按钮 */}
        <button 
          className="btn btn-primary w-full py-4 text-lg font-medium mt-6"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isRecording}
        >
          {isUploading ? '处理中...' : isRecording ? '录制中...' : '开始转录'}
        </button>



        {/* 使用条款 */}
        <p className="text-sm text-gray-500 text-center mt-8">
          使用瞬刻TransAI即表示您同意我们的服务条款和隐私政策。
        </p>
      </div>

      {/* 技术支持信息 */}
      <div className="text-center mt-16">
        <p className="text-white/80 text-lg mb-4">由讯飞录音文件转写大模型驱动</p>
        <p className="text-white/80 text-sm">国内语音转文字准确率排名第一</p>
      </div>
    </div>
  );
};

export default UploadPage;