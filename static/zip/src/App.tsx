import React, { useState } from 'react';
import { Palette, Leaf, Star, Moon, MapPin, Scissors, PawPrint, Settings2, Music, Music2, Music3, Music4 } from 'lucide-react';
import { timelineData } from './data';
import { themes } from './themes';
import { ThemeType } from './types';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('classic');
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  
  // Theme-specific Debugger state
  type ThemeConfig = { iconSize: number; iconAngle: number; lineWidth: number; offsetX: number; timelineWidth: number; uniformNodes: boolean; nodeColor: string; lineColor: string; lineOpacity: number };
  const defaultColors = { nodeColor: '#374151', lineColor: '#d1d5db', lineOpacity: 60 };
  const [themeConfigs, setThemeConfigs] = useState<Record<ThemeType, ThemeConfig>>({
    classic: { iconSize: 16, iconAngle: 0, lineWidth: 2, offsetX: 0, timelineWidth: 2, uniformNodes: false, ...defaultColors },
    vine: { iconSize: 12, iconAngle: 94, lineWidth: 1, offsetX: 0, timelineWidth: 6, uniformNodes: false, ...defaultColors },
    celestial: { iconSize: 12, iconAngle: 0, lineWidth: 2, offsetX: 0, timelineWidth: 2, uniformNodes: false, ...defaultColors },
    track: { iconSize: 16, iconAngle: 0, lineWidth: 2, offsetX: 0, timelineWidth: 2, uniformNodes: false, ...defaultColors },
    stitches: { iconSize: 16, iconAngle: 0, lineWidth: 2, offsetX: 0, timelineWidth: 1, uniformNodes: false, ...defaultColors },
    paw: { iconSize: 12, iconAngle: 0, lineWidth: 2, offsetX: 0, timelineWidth: 2, uniformNodes: false, ...defaultColors },
    music: { iconSize: 16, iconAngle: 0, lineWidth: 1, offsetX: 0, timelineWidth: 6, uniformNodes: false, ...defaultColors },
  });
  const [isDebuggerOpen, setIsDebuggerOpen] = useState(true);

  const currentConfig = themeConfigs[currentTheme];
  const { iconSize, iconAngle, lineWidth, offsetX, timelineWidth, uniformNodes, nodeColor, lineColor, lineOpacity } = currentConfig;

  const updateConfig = <K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) => {
    setThemeConfigs(prev => ({
      ...prev,
      [currentTheme]: {
        ...prev[currentTheme],
        [key]: value
      }
    }));
  };

  const renderLine = (theme: ThemeType) => {
    const config = themeConfigs[theme];
    const { lineWidth, timelineWidth, lineColor, lineOpacity } = config;
    const opacity = lineOpacity / 100;
    const encodedColor = encodeURIComponent(lineColor);

    if (theme === 'classic') {
      return <div className="absolute top-3 bottom-[-2.5rem] left-1/2 -translate-x-1/2 transition-all duration-500" style={{ width: `${lineWidth}px`, backgroundColor: lineColor, opacity }} />;
    }
    if (theme === 'paw') {
      return <div className="absolute top-3 bottom-[-2.5rem] left-1/2 -translate-x-1/2 border-dotted transition-all duration-500" style={{ borderLeftWidth: `${lineWidth}px`, borderColor: lineColor, opacity }} />;
    }

    const w = Math.max(timelineWidth, 4);
    let h = w * 3;
    let path = '';
    
    const pad = lineWidth + w * 0.5;
    const svgW = w + pad * 2;
    const c = svgW / 2;
    const l = c - w / 2;
    const r = c + w / 2;

    if (theme === 'vine') {
      h = w * 3.5;
      path = `
        <path d='M${c},0 C${r},${h*0.25} ${l},${h*0.75} ${c},${h}' stroke='${encodedColor}' stroke-width='${lineWidth}' fill='none' />
        <circle cx='${r - w*0.1}' cy='${h*0.25}' r='${lineWidth * 1.2}' fill='${encodedColor}' opacity='0.7' />
        <circle cx='${l + w*0.1}' cy='${h*0.75}' r='${lineWidth * 0.8}' fill='${encodedColor}' opacity='0.9' />
      `;
    } else if (theme === 'celestial') {
      h = w * 4;
      path = `
        <line x1='${c}' y1='0' x2='${c}' y2='${h}' stroke='${encodedColor}' stroke-width='${lineWidth}' stroke-dasharray='${lineWidth*2} ${lineWidth*4}' opacity='0.5' />
        <path d='M${c},${h*0.5 - lineWidth*2} L${c + lineWidth*1.5},${h*0.5} L${c},${h*0.5 + lineWidth*2} L${c - lineWidth*1.5},${h*0.5} Z' fill='${encodedColor}' opacity='0.8' />
        <circle cx='${c}' cy='${h*0.2}' r='${lineWidth * 0.8}' fill='${encodedColor}' opacity='0.6' />
      `;
    } else if (theme === 'track') {
      h = w * 2.5;
      const tieL = l - w * 0.5;
      const tieR = r + w * 0.5;
      path = `
        <line x1='${l}' y1='0' x2='${l}' y2='${h}' stroke='${encodedColor}' stroke-width='${lineWidth}' />
        <line x1='${r}' y1='0' x2='${r}' y2='${h}' stroke='${encodedColor}' stroke-width='${lineWidth}' />
        <line x1='${tieL}' y1='${h*0.5}' x2='${tieR}' y2='${h*0.5}' stroke='${encodedColor}' stroke-width='${lineWidth}' />
        <circle cx='${l}' cy='${h*0.5}' r='${lineWidth * 0.8}' fill='${encodedColor}' />
        <circle cx='${r}' cy='${h*0.5}' r='${lineWidth * 0.8}' fill='${encodedColor}' />
      `;
    } else if (theme === 'stitches') {
      h = w * 2.5;
      path = `
        <path d='M${l},${h*0.3} L${r},${h*0.7} M${r},${h*0.3} L${l},${h*0.7}' stroke='${encodedColor}' stroke-width='${lineWidth}' fill='none' stroke-linecap='round' />
        <circle cx='${l}' cy='${h*0.3}' r='${lineWidth * 0.6}' fill='${encodedColor}' opacity='0.6' />
        <circle cx='${r}' cy='${h*0.7}' r='${lineWidth * 0.6}' fill='${encodedColor}' opacity='0.6' />
        <circle cx='${r}' cy='${h*0.3}' r='${lineWidth * 0.6}' fill='${encodedColor}' opacity='0.6' />
        <circle cx='${l}' cy='${h*0.7}' r='${lineWidth * 0.6}' fill='${encodedColor}' opacity='0.6' />
      `;
    } else if (theme === 'music') {
      h = w * 2;
      path = `
        <line x1='${c - w}' y1='0' x2='${c - w}' y2='${h}' stroke='${encodedColor}' stroke-width='${lineWidth}' opacity='0.4' />
        <line x1='${c - w*0.5}' y1='0' x2='${c - w*0.5}' y2='${h}' stroke='${encodedColor}' stroke-width='${lineWidth}' opacity='0.4' />
        <line x1='${c}' y1='0' x2='${c}' y2='${h}' stroke='${encodedColor}' stroke-width='${lineWidth}' opacity='0.4' />
        <line x1='${c + w*0.5}' y1='0' x2='${c + w*0.5}' y2='${h}' stroke='${encodedColor}' stroke-width='${lineWidth}' opacity='0.4' />
        <line x1='${c + w}' y1='0' x2='${c + w}' y2='${h}' stroke='${encodedColor}' stroke-width='${lineWidth}' opacity='0.4' />
      `;
    }

    const svgString = `data:image/svg+xml,%3Csvg width='${svgW}' height='${h}' viewBox='0 0 ${svgW} ${h}' xmlns='http://www.w3.org/2000/svg'%3E${path.replace(/\s+/g, ' ')}%3C/svg%3E`;

    return (
      <div 
        className="absolute top-3 bottom-[-2.5rem] left-1/2 -translate-x-1/2 transition-all duration-500"
        style={{
          width: `${svgW}px`,
          opacity,
          backgroundImage: `url("${svgString.replace(/"/g, "'")}")`,
          backgroundRepeat: 'repeat-y',
          backgroundPosition: 'center top'
        }}
      />
    );
  };

  const renderNode = (theme: ThemeType, index: number, isReview: boolean = false) => {
    const config = themeConfigs[theme];
    const { iconSize, iconAngle, offsetX, uniformNodes, nodeColor } = config;

    const colorClass = isReview ? 'text-yellow-500' : '';
    const wrapperClass = `absolute top-1 left-1/2 -translate-x-1/2 z-10 bg-[#faf9f7] rounded-full p-0.5 transition-all duration-500 flex items-center justify-center ${colorClass}`;
    const customColorStyle = isReview ? {} : { color: nodeColor };

    if (theme === 'classic') {
      const dotSize = Math.max(6, iconSize - 6); // Scale dot slightly based on iconSize
      return (
        <div 
          className={`absolute top-2 left-1/2 -translate-x-1/2 z-10 rounded-full ${isReview ? 'bg-yellow-500' : ''} ring-4 ring-[#faf9f7] transition-all duration-500`} 
          style={{ width: dotSize, height: dotSize, marginLeft: `${offsetX}px`, backgroundColor: isReview ? undefined : nodeColor }}
        />
      );
    }

    let Icon: any = Star; // Fallback
    let currentAngle = iconAngle;
    let currentOffsetX = offsetX;
    let isSolid = false;

    if (theme === 'vine') {
      Icon = Leaf;
    }
    else if (theme === 'celestial') Icon = uniformNodes ? Star : [Star, Moon][index % 2];
    else if (theme === 'track') Icon = MapPin;
    else if (theme === 'stitches') Icon = Scissors;
    else if (theme === 'paw') {
      Icon = PawPrint;
      const pawAngles = [0, -96, -26, -110];
      currentAngle = uniformNodes ? iconAngle : pawAngles[index % pawAngles.length] + iconAngle;
    }
    else if (theme === 'music') {
      const musicIcons = [Music, Music2, Music3, Music4];
      Icon = uniformNodes ? Music : musicIcons[index % musicIcons.length];
      const musicAngles = [-15, 10, -5, 15];
      currentAngle = uniformNodes ? iconAngle : musicAngles[index % musicAngles.length] + iconAngle;
    }

    return (
      <div className={wrapperClass} style={{ marginLeft: `${currentOffsetX}px`, ...customColorStyle }}>
        <div style={{ transform: `rotate(${currentAngle}deg)`, display: 'flex', transition: 'transform 0.3s ease' }}>
          <Icon size={iconSize} strokeWidth={2.5} fill={isSolid ? "currentColor" : "none"} />
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#faf9f7] relative overflow-hidden font-sans">
      
      {/* Theme Switcher FAB */}
      <div className="absolute top-4 right-4 z-50">
        <button 
          onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
          className="p-3 rounded-full shadow-md bg-white text-gray-800 transition-transform hover:scale-105 border border-gray-100"
        >
          <Palette size={20} />
        </button>
        
        <AnimatePresence>
          {isThemeMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              className="absolute right-0 mt-2 p-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl flex flex-col gap-1 w-56 border border-gray-100 max-h-[80vh] overflow-y-auto"
            >
              <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider sticky top-0 bg-white/95 backdrop-blur-xl z-10">选择主题</div>
              {(Object.entries(themes) as [ThemeType, typeof themes[ThemeType]][]).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => {
                    setCurrentTheme(key);
                    setIsThemeMenuOpen(false);
                  }}
                  className={`px-3 py-2.5 text-sm rounded-xl text-left transition-colors flex items-center gap-2
                    ${currentTheme === key ? 'bg-gray-100 text-gray-900 font-bold' : 'hover:bg-gray-50 text-gray-600'}`}
                >
                  {t.name}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Debugger Toggle Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button 
          onClick={() => setIsDebuggerOpen(!isDebuggerOpen)}
          className={`p-3 rounded-full shadow-lg transition-transform hover:scale-105 border ${isDebuggerOpen ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-gray-800 border-gray-100'}`}
          title="Toggle Debugger"
        >
          <Settings2 size={20} />
        </button>
      </div>

      {/* Universal Theme Debugger - Toggleable */}
      <AnimatePresence>
        {isDebuggerOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed right-6 bottom-20 bg-white/95 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col gap-4 w-64 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-gray-500 flex justify-between">
                <span>大小 (Size)</span>
                <span className="text-gray-900 font-mono">{iconSize}px</span>
              </label>
              <input 
                type="range" 
                min="4" 
                max="32" 
                value={iconSize} 
                onChange={(e) => updateConfig('iconSize', Number(e.target.value))} 
                className="w-full accent-indigo-600" 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-gray-500 flex justify-between">
                <span>固定角度 (Angle)</span>
                <span className="text-gray-900 font-mono">{iconAngle}°</span>
              </label>
              <input 
                type="range" 
                min="-180" 
                max="180" 
                value={iconAngle} 
                onChange={(e) => updateConfig('iconAngle', Number(e.target.value))} 
                className="w-full accent-indigo-600" 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-gray-500 flex justify-between">
                <span>线粗细 (Line Width)</span>
                <span className="text-gray-900 font-mono">{lineWidth}px</span>
              </label>
              <input 
                type="range" 
                min="1" 
                max="8" 
                step="0.5"
                value={lineWidth} 
                onChange={(e) => updateConfig('lineWidth', Number(e.target.value))} 
                className="w-full accent-indigo-600" 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-gray-500 flex justify-between">
                <span>左右偏移 (Offset X)</span>
                <span className="text-gray-900 font-mono">{offsetX}px</span>
              </label>
              <input 
                type="range" 
                min="-50" 
                max="50" 
                value={offsetX} 
                onChange={(e) => updateConfig('offsetX', Number(e.target.value))} 
                className="w-full accent-indigo-600" 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-gray-500 flex justify-between">
                <span>总宽度 (Timeline Width)</span>
                <span className="text-gray-900 font-mono">{timelineWidth}px</span>
              </label>
              <input 
                type="range" 
                min="0" 
                max="60" 
                value={timelineWidth} 
                onChange={(e) => updateConfig('timelineWidth', Number(e.target.value))} 
                className="w-full accent-indigo-600" 
              />
            </div>

            <div className="flex items-center justify-between mt-1">
              <label className="text-xs font-medium text-gray-500">
                统一节点 (Uniform Nodes)
              </label>
              <input 
                type="checkbox" 
                checked={uniformNodes} 
                onChange={(e) => updateConfig('uniformNodes', e.target.checked)} 
                className="w-4 h-4 accent-indigo-600 rounded border-gray-300" 
              />
            </div>

            <div className="flex items-center justify-between mt-1">
              <label className="text-xs font-medium text-gray-500">节点颜色 (Node Color)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={nodeColor} 
                  onChange={(e) => updateConfig('nodeColor', e.target.value)} 
                  className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent shrink-0" 
                />
                <input 
                  type="text" 
                  value={nodeColor} 
                  onChange={(e) => updateConfig('nodeColor', e.target.value)} 
                  className="w-20 text-xs font-mono border border-gray-200 rounded px-1.5 py-1 text-gray-700 uppercase focus:outline-none focus:border-indigo-500" 
                  placeholder="#000000"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-1">
              <label className="text-xs font-medium text-gray-500">连线颜色 (Line Color)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={lineColor} 
                  onChange={(e) => updateConfig('lineColor', e.target.value)} 
                  className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent shrink-0" 
                />
                <input 
                  type="text" 
                  value={lineColor} 
                  onChange={(e) => updateConfig('lineColor', e.target.value)} 
                  className="w-20 text-xs font-mono border border-gray-200 rounded px-1.5 py-1 text-gray-700 uppercase focus:outline-none focus:border-indigo-500" 
                  placeholder="#000000"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-1">
              <label className="text-xs font-medium text-gray-500 flex justify-between">
                <span>连线透明度 (Line Opacity)</span>
                <span className="text-gray-900 font-mono">{lineOpacity}%</span>
              </label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={lineOpacity} 
                onChange={(e) => updateConfig('lineOpacity', Number(e.target.value))} 
                className="w-full accent-indigo-600" 
              />
            </div>
            
            <div className="text-[10px] text-gray-400 text-center leading-relaxed mt-2">
              当前配置仅对【{themes[currentTheme].name.split(' ')[0]}】生效<br/>
              调整到满意的数值后，请告诉我！
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline Content */}
      <main className="px-6 pt-24 pb-32">
        <div className="relative">
          {timelineData.map((item, index) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              key={item.id} 
              className="flex mb-8 relative group"
            >
              {/* Time Column */}
              <div className="w-16 flex flex-col items-end pr-4 pt-0.5 shrink-0">
                <span className="font-sans font-bold text-lg text-gray-900">{item.time}</span>
                <span className="text-[11px] mt-0.5 text-gray-400">{item.duration}</span>
              </div>

              {/* Line & Node Column */}
              <div className="relative w-6 shrink-0">
                {renderLine(currentTheme)}
                {renderNode(currentTheme, index)}
              </div>

              {/* Content Column */}
              <div className="flex-1 pl-4 pb-2">
                <h3 className="font-sans font-bold text-lg text-gray-900 mb-2.5 transition-colors duration-500">{item.title}</h3>
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag, i) => (
                    <span key={i} className="text-[11px] px-2.5 py-1 flex items-center gap-1 transition-colors duration-500 bg-white border border-gray-200 shadow-sm rounded-md text-gray-600">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}

          {/* End Review Node */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: timelineData.length * 0.1 }}
            className="flex mb-8 relative group"
          >
             <div className="w-16 flex flex-col items-end pr-4 pt-0.5 shrink-0">
                <span className="font-bold text-xs uppercase tracking-wider text-gray-400">Review</span>
              </div>
              <div className="relative w-6 shrink-0">
                {renderNode(currentTheme, 999, true)}
              </div>
              <div className="flex-1 pl-4">
                <h3 className="font-sans font-bold text-lg text-gray-900">准备好开始回顾了吗？</h3>
              </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
