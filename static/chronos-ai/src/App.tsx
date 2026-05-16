/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Loader2, Plus, Sparkles, Clock, CalendarHeart, Check } from 'lucide-react';

type TimelineItem = {
  id: string;
  startTime: string;
  endTime: string;
  activity: string;
  domain?: string;
  tags?: string[];
  todos?: string[];
  notes?: string;
};

type AIAnnotation = {
  itemId: string;
  comment: string;
};

type EvaluationResponse = {
  overallImpression: string;
  annotations: AIAnnotation[];
};

const INITIAL_TIMELINE: TimelineItem[] = [
  { 
    id: '1', startTime: '07:00', endTime: '08:00', activity: '晨间冥想与咖啡',
    domain: '健康', tags: ['正念', '习惯'], notes: '尝试了新的深呼吸练习，感觉非常平静。'
  },
  { 
    id: '2', startTime: '08:00', endTime: '09:30', activity: '阅读与写日记',
    domain: '个人成长', tags: ['阅读', '反思'], notes: '读完了《The Daily Stoic》的最后两章。'
  },
  { 
    id: '3', startTime: '09:30', endTime: '12:30', activity: '深度工作：编程与架构设计',
    domain: '事业', tags: ['开发', '专注'], todos: ['完成权限模块的数据库设计', '修复登录页面的 UI 逻辑'], notes: '状态很好，比预期提前完成了模块设计。'
  },
  { 
    id: '4', startTime: '12:30', endTime: '13:30', activity: '午后散步与听播客',
    domain: '健康', tags: ['放松', '学习'], notes: '听了关于 AI 发展的最新一期播客。'
  },
  { 
    id: '5', startTime: '13:30', endTime: '16:00', activity: '视频会议与团队同步',
    domain: '事业', tags: ['沟通', '会议'], todos: ['确认下周的迭代目标'], notes: '会议稍微有些拖沓，但最终达成了共识。'
  },
  { 
    id: '6', startTime: '16:00', endTime: '18:00', activity: '健身房（力量训练）',
    domain: '健康', tags: ['运动', '力量'], notes: '深蹲突破了之前的重量边缘。'
  },
  { 
    id: '7', startTime: '18:00', endTime: '20:00', activity: '与老友共进晚餐',
    domain: '社交', tags: ['朋友', '聚餐'], notes: '聊了很多大学时代的趣事，很怀念。'
  },
  { 
    id: '8', startTime: '20:00', endTime: '22:00', activity: '放松、听爵士乐与阅读',
    domain: '个人成长', tags: ['放松', '音乐'], notes: '非常惬意的一个晚上。'
  },
];

export default function App() {
  const [timeline, setTimeline] = useState<TimelineItem[]>(INITIAL_TIMELINE);
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    setError(null);
    try {
      const res = await fetch('/api/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeline }),
      });
      if (!res.ok) {
        throw new Error('评估时间线失败');
      }
      const data: EvaluationResponse = await res.json();
      setEvaluation(data);
    } catch (err: any) {
      setError(err.message || '与 Chronos 交流时发生错误。');
    } finally {
      setIsEvaluating(false);
    }
  };

  const currentDay = new Date().toLocaleDateString('zh-CN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen flex justify-center bg-[#f8f7f5]">
      {/* Mobile constraint container */}
      <div className="w-full max-w-md bg-white border-x border-[#f0f0f0] min-h-screen flex flex-col shadow-sm relative">
        
        {/* Header - Editorial Minimalist */}
        <header className="px-6 pt-12 pb-6 border-b border-[#f0f0f0]">
          <div className="flex items-center space-x-2 text-[#8b8a87] text-xs font-semibold tracking-widest uppercase mb-3">
            <CalendarHeart size={14} className="stroke-[1.5]" />
            <span>{currentDay}</span>
          </div>
          <h1 className="font-serif text-4xl text-black font-medium tracking-tight">今日时间线</h1>
          <p className="text-[#8b8a87] mt-2 font-serif italic">光阴与片刻的记录。</p>
        </header>

        {/* AI Evaluation Overall Impression */}
        {evaluation && (
          <div className="p-6 bg-[#faf9f7] border-b border-[#eae8e4]">
            <div className="flex items-center space-x-2 mb-3">
              <Sparkles size={16} className="text-[#a39a88]" />
              <span className="font-serif text-sm font-semibold uppercase tracking-widest text-[#a39a88]">
                Chronos 的观察
              </span>
            </div>
            <p className="font-serif text-lg leading-relaxed text-[#3d3b38]">
              "{evaluation.overallImpression}"
            </p>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="relative pl-6 pt-4">
            {/* The continuous vertical line */}
            <div className="absolute left-0 top-6 bottom-4 w-px bg-[#e5e5e5]" />

            <div className="space-y-10">
              {timeline.map((item, index) => {
                const annotation = evaluation?.annotations.find(a => a.itemId === item.id);
                return (
                  <div key={item.id} className="relative group">
                    {/* Time dot */}
                    <div className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-white border-2 border-black transition-transform group-hover:scale-125" />
                    
                    <div className="flex flex-col pb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold tracking-wider text-[#a0a0a0] uppercase">
                          {item.startTime} — {item.endTime}
                        </span>
                        {item.domain && (
                          <span className="text-[10px] font-medium px-2 py-0.5 bg-[#eceae5] text-[#7a756d] rounded-sm tracking-widest">
                            {item.domain}
                          </span>
                        )}
                      </div>
                      <h3 className="font-serif text-[20px] tracking-tight leading-snug text-[#000000] mb-2">
                        {item.activity}
                      </h3>

                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.tags.map(tag => (
                            <span key={tag} className="text-[#8b8a87] text-[12px] font-medium before:content-['#'] before:mr-0.5">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Todos */}
                      {item.todos && item.todos.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                          {item.todos.map((todo, idx) => (
                            <div key={idx} className="flex items-start space-x-2.5 text-[#404040]">
                              <div className="mt-[2px] w-[14px] h-[14px] rounded-[3px] border border-[#a39a88] flex items-center justify-center bg-[#faf9f7] shrink-0">
                                <Check size={10} className="text-[#a39a88]" strokeWidth={3} />
                              </div>
                              <span className="text-[14px] leading-tight opacity-80">{todo}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Notes - Subdued style */}
                      {item.notes && (
                        <div className="mb-3 flex items-start space-x-2 text-[#706c65]">
                          <div className="w-1.5 h-1.5 mt-2 rounded-full bg-[#d5d2cb] shrink-0" />
                          <p className="text-[14px] leading-relaxed">{item.notes}</p>
                        </div>
                      )}

                      {/* Item-specific AI Annotation - Quote Style */}
                      {annotation && (
                        <div className="mt-4 pl-4 border-l-2 border-[#d5d2cb] py-1">
                          <p className="font-serif italic text-[#7a756d] text-[15px] leading-relaxed">
                            {annotation.comment}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="h-4" />
          </div>
        </main>

        {/* Action Footer */}
        <footer className="p-6 border-t border-[#f0f0f0] bg-white bg-opacity-95 backdrop-blur-sm sticky bottom-0 z-20">
          <button
            onClick={handleEvaluate}
            disabled={isEvaluating}
            className="w-full flex items-center justify-center space-x-2 bg-black text-white px-6 py-4 rounded-full font-medium tracking-wide hover:bg-[#202020] transition-colors disabled:opacity-50"
          >
            {isEvaluating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Chronos 正在思考...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>回顾我的一天</span>
              </>
            )}
          </button>
          
          {error && (
            <p className="text-sm text-red-500 mt-4 text-center">{error}</p>
          )}
        </footer>

      </div>
    </div>
  );
}
