import React, { useState, useEffect } from 'react';

interface ColorScheme {
  name: string;
  colors: string[];
  gradient: string;
  type: 'gradient' | 'split' | 'multiple';
}

interface ColorSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const ColorSelector: React.FC<ColorSelectorProps> = ({ isOpen, onClose }) => {
  // 预设配色方案
  const presetSchemes: ColorScheme[] = [
    {
      name: '莫奈花园',
      colors: ['#E7CDE4', '#FCDCDD', '#A79FC0', '#B0BCD8'],
      gradient: 'linear-gradient(135deg, #E7CDE4 0%, #FCDCDD 25%, #A79FC0 50%, #B0BCD8 100%)',
      type: 'gradient'
    },
    {
      name: '薄荷石竹',
      colors: ['#F6B9C3', '#7EB699'],
      gradient: 'linear-gradient(135deg, #F6B9C3 0%, #7EB699 100%)',
      type: 'gradient'
    },
    {
      name: '芥花芽绿',
      colors: ['#DAECBD', '#F5FBFF'],
      gradient: 'linear-gradient(135deg, #DAECBD 0%, #F5FBFF 100%)',
      type: 'gradient'
    },
    {
      name: '雾灰蔷薇',
      colors: ['#F8CDED', '#A198A8'],
      gradient: 'linear-gradient(135deg, #F8CDED 0%, #A198A8 100%)',
      type: 'gradient'
    },
    {
      name: '杏黄青灰',
      colors: ['#F2E6A5', '#8D97AA'],
      gradient: 'linear-gradient(135deg, #F2E6A5 0%, #8D97AA 100%)',
      type: 'gradient'
    },
    {
      name: '柔紫灰绿',
      colors: ['#D6CEF8', '#9BAA9D'],
      gradient: 'linear-gradient(135deg, #D6CEF8 0%, #9BAA9D 100%)',
      type: 'gradient'
    },
    {
      name: '冰透浅蓝',
      colors: ['#4CD2FD', '#DFFCFF'],
      gradient: 'linear-gradient(135deg, #4CD2FD 0%, #DFFCFF 100%)',
      type: 'gradient'
    },
    {
      name: '薄荷燕麦',
      colors: ['#C6F0E0', '#A8A098'],
      gradient: 'linear-gradient(135deg, #C6F0E0 0%, #A8A098 100%)',
      type: 'gradient'
    },
    {
      name: '鸥蓝花青',
      colors: ['#C7D2D4', '#1A2847'],
      gradient: 'linear-gradient(135deg, #C7D2D4 0%, #1A2847 100%)',
      type: 'gradient'
    }
  ];

  // 状态管理
  const [selectedScheme, setSelectedScheme] = useState<ColorScheme>(presetSchemes[0]);
  const [customColors, setCustomColors] = useState<string[]>(['#E7CDE4', '#FCDCDD']);
  const [isCustom, setIsCustom] = useState(false);

  // 应用颜色方案
  const applyColorScheme = (scheme: ColorScheme) => {
    const root = document.getElementById('root');
    if (root) {
      root.style.background = scheme.gradient;
    }
    
    // 同步调整页面组件样式
    updateComponentStyles(scheme.colors[0]);
    
    setSelectedScheme(scheme);
    setIsCustom(false);
    // 保存到localStorage
    localStorage.setItem('colorScheme', JSON.stringify(scheme));
  };

  // 应用自定义颜色
  const applyCustomColors = () => {
    const gradient = `linear-gradient(135deg, ${customColors[0]} 0%, ${customColors[1]} 100%)`;
    const root = document.getElementById('root');
    if (root) {
      root.style.background = gradient;
    }
    
    // 同步调整页面组件样式
    updateComponentStyles(customColors[0]);
    
    const customScheme: ColorScheme = {
      name: '自定义',
      colors: customColors,
      gradient: gradient,
      type: 'gradient'
    };
    setSelectedScheme(customScheme);
    setIsCustom(true);
    // 保存到localStorage
    localStorage.setItem('colorScheme', JSON.stringify(customScheme));
  };

  // 更新组件样式
  const updateComponentStyles = (primaryColor: string) => {
    // 创建或更新样式标签
    let styleTag = document.getElementById('dynamic-styles');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'dynamic-styles';
      document.head.appendChild(styleTag);
    }
    
    // 生成CSS样式
    const css = `
      /* 按钮样式 */
      .btn-primary {
        background-color: ${primaryColor} !important;
        border-color: ${primaryColor} !important;
        color: #000000 !important;
      }
      
      .btn-primary:hover {
        background-color: ${adjustColor(primaryColor, -20)} !important;
        color: #000000 !important;
      }
      
      .btn-outline {
        border-color: ${primaryColor} !important;
        color: #000000 !important;
      }
      
      .btn-outline:hover {
        background-color: ${adjustColor(primaryColor, 20)} !important;
        color: #000000 !important;
      }
      
      /* 卡片样式 */
      .card {
        background-color: rgba(255, 255, 255, 0.8) !important;
      }
      
      /* 导航栏样式 */
      .navbar {
        background: transparent !important;
      }
      
      .navbar-brand, .navbar-link {
        color: #333333 !important;
      }
      
      .navbar-link:hover {
        color: #666666 !important;
      }
      
      /* 标题样式 */
      h1, h2, h3, h4, h5, h6 {
        color: #333333 !important;
      }
      
      /* 标签样式 */
      .badge-primary {
        background-color: ${primaryColor} !important;
        color: white !important;
      }
      
      /* 进度条样式 */
      .progress-bar-fill {
        background-color: ${primaryColor} !important;
      }
      
      /* 链接样式 */
      a {
        color: #333333 !important;
      }
      
      a:hover {
        color: #666666 !important;
      }
      
      /* 表单元素 */
      .form-select:focus {
        box-shadow: 0 0 0 2px ${primaryColor} !important;
      }
      
      .input:focus {
        box-shadow: 0 0 0 2px ${primaryColor} !important;
      }
    `;
    
    styleTag.textContent = css;
  };

  // 调整颜色亮度
  const adjustColor = (color: string, amount: number) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    const newR = Math.max(0, Math.min(255, r + amount));
    const newG = Math.max(0, Math.min(255, g + amount));
    const newB = Math.max(0, Math.min(255, b + amount));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };

  // 处理颜色输入变化
  const handleColorChange = (index: number, value: string) => {
    const newColors = [...customColors];
    newColors[index] = value;
    setCustomColors(newColors);
  };

  // 初始化时加载保存的颜色方案
  useEffect(() => {
    const savedScheme = localStorage.getItem('colorScheme');
    if (savedScheme) {
      try {
        const scheme = JSON.parse(savedScheme);
        applyColorScheme(scheme);
        if (scheme.name === '自定义') {
          setCustomColors(scheme.colors);
          setIsCustom(true);
        }
      } catch (error) {
        console.error('Failed to load saved color scheme:', error);
        // 加载默认配色方案
        const defaultScheme = presetSchemes[0];
        applyColorScheme(defaultScheme);
      }
    } else {
      // 首次加载，使用默认配色方案
      const defaultScheme = presetSchemes[0];
      applyColorScheme(defaultScheme);
    }
  }, []);

  // 恢复默认配色
  const resetToDefault = () => {
    const defaultScheme = presetSchemes[0];
    applyColorScheme(defaultScheme);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">更换网页配色</h3>
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={onClose}
            >
              &times;
            </button>
          </div>
          
          {/* 预设配色选择区 */}
          <div className="mb-6">
            <h4 className="font-medium text-lg mb-4">预设配色方案</h4>
            <div className="grid grid-cols-3 gap-3">
              {presetSchemes.map((scheme, index) => (
                <div
                  key={index}
                  className={`rounded-lg p-3 cursor-pointer transition-all ${selectedScheme.name === scheme.name && !isCustom ? 'ring-2 ring-#7EB699' : 'hover:shadow-md'}`}
                  onClick={() => {
                    applyColorScheme(scheme);
                    onClose();
                  }}
                >
                  {scheme.type === 'split' ? (
                    <div className="h-20 flex flex-col">
                      <div 
                        className="flex-1 rounded-t-lg" 
                        style={{ backgroundColor: scheme.colors[0] }}
                      ></div>
                      <div 
                        className="flex-1 rounded-b-lg" 
                        style={{ backgroundColor: scheme.colors[1] }}
                      ></div>
                      <p className="font-medium text-white text-shadow mt-2 text-center text-sm">{scheme.name}</p>
                    </div>
                  ) : scheme.type === 'multiple' ? (
                    <div className="h-20 flex flex-col">
                      <div className="flex-1 flex">
                        <div 
                          className="flex-1 rounded-tl-lg" 
                          style={{ backgroundColor: scheme.colors[0] }}
                        ></div>
                        <div 
                          className="flex-1 rounded-tr-lg" 
                          style={{ backgroundColor: scheme.colors[1] }}
                        ></div>
                      </div>
                      <div className="flex-1 flex">
                        <div 
                          className="flex-1 rounded-bl-lg" 
                          style={{ backgroundColor: scheme.colors[2] }}
                        ></div>
                        <div 
                          className="flex-1 rounded-br-lg" 
                          style={{ backgroundColor: scheme.colors[3] }}
                        ></div>
                      </div>
                      <p className="font-medium text-white text-shadow mt-2 text-center text-sm">{scheme.name}</p>
                    </div>
                  ) : (
                    <div
                      className="h-20 rounded-lg flex items-center justify-center"
                      style={{ background: scheme.gradient }}
                    >
                      <p className="font-medium text-white text-shadow text-sm">{scheme.name}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* 自定义颜色输入区 */}
          <div className="mb-6">
            <h4 className="font-medium text-lg mb-4">自定义颜色</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">起始颜色</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={customColors[0]}
                    onChange={(e) => handleColorChange(0, e.target.value)}
                    className="w-10 h-10 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={customColors[0]}
                    onChange={(e) => handleColorChange(0, e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded"
                    placeholder="#F6B9C3"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">结束颜色</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={customColors[1]}
                    onChange={(e) => handleColorChange(1, e.target.value)}
                    className="w-10 h-10 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={customColors[1]}
                    onChange={(e) => handleColorChange(1, e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded"
                    placeholder="#7EB699"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* 按钮区域 */}
          <div className="space-y-3">
            <button
              className="btn btn-primary w-full py-3 text-lg"
              onClick={() => {
                applyCustomColors();
                onClose();
              }}
            >
              保存自定义配色
            </button>
            <button
              className="btn btn-outline w-full py-3 text-lg"
              onClick={resetToDefault}
            >
              恢复默认配色
            </button>
            <button
              className="btn btn-outline w-full py-3 text-lg"
              onClick={onClose}
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorSelector;