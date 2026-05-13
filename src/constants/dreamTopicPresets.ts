/**
 * @file dreamTopicPresets.ts
 * @input None
 * @output Shared Dream topic preset definitions
 * @description Centralizes the built-in Dream concern-topic presets so the Dream system can seed a stable first-run topic set without hardcoding labels inside services or UI components.
 * @updated 2026-05-13: Reframed the built-in Dream topic presets around inner traits, living rhythm, wellbeing, and execution-pressure patterns so Dream defaults to understanding the user more like a person than a monitoring dashboard.
 * @updated 2026-05-12: Added the initial built-in Dream topic presets for schedule, health, energy, execution, and long-term pressure tracking.
 */

export interface DreamTopicPreset {
  id: string;
  title: string;
  note: string;
}

export const DREAM_TOPIC_PRESETS: DreamTopicPreset[] = [
  {
    id: 'preset-inner-traits',
    title: '内在特征',
    note: '请长期关注这个人更内在、更稳定的部分，而不只是他表面上做了什么。留意他的价值取向、情绪习惯、做事时的心理倾向、面对压力和关系时的典型反应，也关注他真正想要什么、需要什么、在意什么、害怕什么、回避什么。不要急着用简单标签定义他，而是尽量形成一种更细腻、更贴近真人的理解，慢慢看清他的内在驱动力、脆弱点和长期需求。'
  },
  {
    id: 'preset-life-rhythm',
    title: '生活节律',
    note: '请长期观察他的生活节奏和时间分布方式，看看他通常会在什么时候进入状态、什么时候放松、什么时候发散、什么时候逃避、什么时候恢复。关注一天之内和一周之内反复出现的模式，比如夜间更清醒、下午容易低落、某些时段更适合推进任务、某些时段更容易失控。重点不是判断这样的节律对不对，而是逐渐看清他真实的生活组织方式。'
  },
  {
    id: 'preset-wellbeing',
    title: '身心状态',
    note: '请持续关注他的身体状态、精力变化和情绪负荷，尤其是那些会反复出现、并真实影响生活和工作的信号。包括睡眠、疲劳、透支、恢复速度、身体不适、长期紧绷、情绪低落或烦躁，以及这些状态和日常行为之间的关系。不要过度医学化，也不要轻易下结论，更重要的是诚实记录那些正在持续影响他的状态变化。'
  },
  {
    id: 'preset-execution-pressure',
    title: '执行模式与压力',
    note: '请关注他通常是怎样推进事情的，以及压力会如何改变他的行动方式。留意他在启动、持续推进、收尾、面对复杂任务和面对堆积压力时的典型反应，比如拖延、卡住、反复绕路、短期冲刺后失速、硬扛、逃避，或者在某些条件下反而能稳定前进。重点不是评价他是否自律，而是总结出他一贯的执行规律，以及什么样的压力最容易让他失衡。'
  }
];
