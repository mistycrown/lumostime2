/**
 * @file journal-demo.ts
 * @input Deterministic, synthetic August journal scenarios
 * @output Varied month-long data with schedules, paragraphs, habits and reviews for visual QA
 * @pos Test fixture (presentation sample, separate from stress tests)
 * @updated 2026-10-23: Replaces repeated placeholder text with natural, distinct entries.
 * @updated 2026-10-23: Includes original image stickers, linked actual traces and parent/child goal progress.
 * @updated 2026-10-23: Includes rich photo logs, historical attribute fields, comments, reactions and inline node aliases.
 * @updated 2026-10-23: Exercises saved review groups and Collection membership in rich Log exports.
 * @updated 2026-10-24: Includes both answered guidance plus AI narrative and a narrative-only daily review.
 */
import type { JournalExportData } from '../../src/utils/journalExport';
import type { DailyReview, Log, TodoItem, ReviewTemplateSnapshot } from '../../src/types';

const stamp = (day: number, hour = 0, minute = 0) => new Date(2026, 7, day, hour, minute).getTime();
const key = (day: number) => `2026-08-${String(day).padStart(2, '0')}`;
const tasks: Array<[number, string, number?, string?]> = [
  [2, '整理八月阅读清单'], [3, '产品方案初稿', 7, '先梳理使用场景，再补上页面草图。\n\n周五前发给设计组讨论。'],
  [5, '和林同学讨论研究方法'], [6, '预约牙齿检查'], [8, '去美术馆看夏季展览'],
  [10, '准备读书会分享', 15], [12, '提交旅行照片冲印'], [14, '给妈妈寄明信片'],
  [17, '完成课程论文提纲', 21], [19, '项目阶段评审'], [22, '周末去植物园'],
  [24, '整理房间与旧书'], [26, '准备九月课表', 30], [28, '和朋友一起做晚饭'],
  [31, '写下八月最想记住的三件事'], [3, '取回冲印照片'], [3, '给家人打个电话']
];
const todos: TodoItem[] = tasks.map(([day, title, deadline, note], index) => ({
  id: `demo-todo-${index}`, categoryId: index % 2 ? 'work' : 'life', title,
  scheduledDate: key(day), deadlineDate: deadline ? key(deadline) : undefined, note,
  isCompleted: day < 17 && index % 3 !== 1,
  completedAt: day < 17 && index % 3 !== 1 ? new Date(stamp(day, 18)).toISOString() : undefined
}));
todos.push({
  id: 'reading-routine', categoryId: 'life', title: '晨间阅读二十分钟', isCompleted: false,
  recurrenceRule: { frequency: 'weekly', startDate: key(1), endDate: key(31), weekdays: [1, 3, 5], skipDates: [key(12)] },
  occurrenceCompletions: Object.fromEntries([3, 5, 7, 10, 14, 17].map((day) => [key(day), { completedAt: new Date(stamp(day, 8, 20)).toISOString() }]))
});

const titles = ['整理读书笔记', '午后去河边散步', '修改研究提纲', '和朋友聊近况', '整理项目需求', '学习新的排版方法', '做一顿简单晚餐', '拍下窗边的光', '梳理本周任务', '练习钢琴', '阅读短篇小说', '把照片贴进手账', '记录植物的变化', '去图书馆借两本书', '画一张窗边速写', '复习课程笔记', '写一封久未寄出的信', '整理旅行路线', '学习做意大利面', '给盆栽换土', '制作读书会讲义', '看一部老电影', '试着写一首短诗', '整理桌面的纸张', '完成课程练习', '练习水彩调色'];
const notes = ['记下今天最有启发的一句话。', '走到桥边时，晚风刚好吹过来。', '先明确问题，再寻找合适的证据。', '很久没见，却还是有说不完的话。', '把复杂的需求拆成几件能完成的小事。', '留白让文字有了呼吸的地方。', '番茄、鸡蛋和一小碗热汤。', '阴影慢慢移过桌面，像安静的时钟。', '给重要的事留下完整的一段时间。', '慢速弹完两遍，比追求速度更有帮助。', '喜欢结尾停下来、不急着解释的余韵。', '选了三张照片，记录这个月的颜色。', '新叶比昨天舒展了一点，给它拍了张照。', '在书架转角发现一本早就想读的随笔。', '没擦掉歪歪的线条，反而更像当时的风景。', '把容易混淆的概念画成了小小的关系图。', '写完才发现，一直挂念的是那些普通的问候。', '决定少安排一个景点，多留一点闲逛的时间。', '酱汁比预想的顺利，面条还可以再煮软一点。', '换了一个更透气的花盆，希望它继续长大。', '把最想分享的三个观点各配了一张图。', '老电影的配乐很克制，让画面自己说话。', '只写了四行，却花了很久挑选最后一个词。', '留下真正需要的资料，把剩下的纸叠好收起来。', '最后一道题想通了，给自己画了一颗小星星。', '发现蓝色里加一点暖灰，会像傍晚的天空。'];
const logs: Log[] = Array.from({ length: 26 }, (_, index) => {
  const day = index + 2;
  const isLife = [3, 6, 7, 12, 13, 17, 18, 19, 21, 23].includes(index);
  return {
    id: `demo-log-${index}`, categoryId: isLife ? 'life' : 'study', activityId: isLife ? 'walk' : 'book',
    title: index === 1 ? '读完《海边的卡夫卡》' : titles[index],
    note: index === 1 ? '今天读完了《海边的卡夫卡》的最后几章。小说把现实与梦境交织在一起，读到结尾，我反而更想回到开头，再看看那些曾经忽略的细节。\n\n把这页书的余味留给明天。' : notes[index],
    startTime: stamp(day, isLife ? 17 : 9, 0), endTime: stamp(day, isLife ? 17 : 10, isLife ? 45 : 0), duration: isLife ? 2700 : 3600,
    focusScore: isLife ? undefined : 4, moodScore: index % 4 === 0 ? 5 : undefined
  };
});
logs.push({ id: 'night-reading', categoryId: 'study', activityId: 'book', title: '夜读与摘录', note: '夜里读到一段很喜欢的话。\n\n关灯前，把它抄在了纸上。', startTime: stamp(18, 23, 30), endTime: stamp(19, 0, 30), duration: 3600 });
const richLog = logs.find((log) => log.id === 'demo-log-1')!;
richLog.note += '\n\n把它与[[旧书丨阅读笔记]]联系起来，也想到了[[夏日散步]]。';
richLog.attributeValues = [{ attributeId: 'pages', value: 32 }, { attributeId: 'genre', optionIds: ['fiction', 'memoir'] }, { attributeId: 'excerpt', value: '有些文字要隔一段时间再读，才会看到不同的风景。' }];
richLog.images = ['/background/sea.webp', '/background/plant.webp', '/background/forest.webp'];
richLog.progressIncrement = 32;
richLog.moodScore = 5;
richLog.reactions = ['❤️', '✨', 'image:/sticker/water3/04.webp'];
richLog.comments = [{ id: 'reading-comment', content: '下次读书会可以从这一章开始。\n\n把摘录和照片一起留在这里。', createdAt: stamp(4, 20, 15) }];
// A fully populated week makes the seven-column time-block overview reviewable.
for (let index = logs.length - 1; index >= 0; index--) {
  const day = new Date(logs[index].startTime).getDate();
  if (day >= 10 && day <= 16) logs.splice(index, 1);
}
for (let day = 10; day <= 16; day++) {
  const sessions: [number, number, string, string, string][] = [
    [0, 7, '夜间休息', 'life', 'sleep'], [7.5, 8, '早餐与晨间整理', 'life', 'meal'],
    [9, 12, day < 15 ? '项目写作与设计' : '整理照片与周末阅读', 'study', 'work'],
    [12, 13, '午餐与休息', 'life', 'meal'], [14, 16, day < 15 ? '课程学习' : '美术馆与手账', 'study', 'book'],
    [18, 19, '散步与拉伸', 'life', 'walk'], [20, 22, '音乐、电影和晚间阅读', 'life', 'rest'], [23, 24, '准备入睡', 'life', 'sleep']
  ];
  sessions.forEach(([start, end, title, categoryId, activityId], index) => logs.push({ id: `week-${day}-${index}`, categoryId, activityId, title, startTime: stamp(day, Math.floor(start), (start % 1) * 60), endTime: stamp(day, Math.floor(end), (end % 1) * 60), duration: (end - start) * 3600 }));
}
[3, 5, 10, 17, 19, 26].forEach((day, index) => {
  const task = todos.find((todo) => todo.scheduledDate === key(day))!;
  logs.push({ id: `time-plan-${index}`, categoryId: 'study', activityId: 'book', title: task.title, linkedTodoId: task.id, isPlanned: true, startTime: stamp(day, 14), endTime: stamp(day, 15, 30), duration: 5400 });
});

const guidanceGroups: ReviewTemplateSnapshot[] = [
  { id: 'memories', title: '值得记住', order: 0, questions: [{ id: 'memory', question: '今天有哪些值得记住的小事？', type: 'text' }] },
  { id: 'tomorrow', title: '留给明天', order: 1, questions: [{ id: 'tomorrow', question: '明天想为自己留出什么时间？', type: 'text' }] }
];
const dailyReviews: DailyReview[] = [3, 4, 5, 7, 10, 12, 14, 17, 18, 19, 21, 24, 26, 28, 30, 31].map((day, index) => ({
  id: `review-${day}`, date: key(day), createdAt: stamp(day), updatedAt: stamp(day, 22),
  summary: notes[index + 5],
  narrative: day === 3 ? '八月的第三天，阅读和散步串起了日常的节奏。窗边的明信片，让平凡的一天多了一份可以珍藏的温柔。' : day === 4 ? '这一天只有叙事，没有填写引导问题。晚风经过窗边，留下了安静的片刻。' : undefined,
  moodEmoji: index % 3 === 0 ? `image:/sticker/water3/${String(index + 1).padStart(2, '0')}.webp` : index % 2 ? '☀️' : '🌿',
  checkItems: [
    { id: 'water', category: '照顾自己', content: '喝够三杯水', manualMode: 'count', currentCount: index === 0 ? 2 : 3, targetCount: 3, isCompleted: index !== 0 },
    { id: 'walk', category: '照顾自己', content: '散步半小时', isCompleted: index % 3 !== 1 },
    { id: 'read', category: '慢慢生长', content: '睡前读几页书', isCompleted: index % 4 !== 2 },
    { id: 'journal', category: '慢慢生长', content: '记下今天的小事', isCompleted: true }
  ],
  templateSnapshot: guidanceGroups,
  answers: day === 3 ? [{ questionId: 'memory', question: '今天有哪些值得记住的小事？', answer: '中午收到朋友寄来的明信片，上面画了一只趴在窗边的猫。\n\n晚上把它放在书桌前，希望明天也能记得这样轻松的心情。' }, { questionId: 'tomorrow', question: '明天想为自己留出什么时间？', answer: '留半小时安静阅读，读完再看看窗外。' }] : []
}));

logs.forEach((log) => {
  if (log.categoryId === 'study') log.scopeIds = log.activityId === 'work' ? ['learning', 'career'] : ['learning'];
  if (log.activityId === 'walk') log.scopeIds = ['wellbeing'];
  const date = new Date(log.startTime).getDate();
  const task = todos.find((todo) => todo.scheduledDate === key(date));
  if (!log.isPlanned && task && log.categoryId === 'study') log.linkedTodoId = task.id;
});
// Actual linked sessions create the same cross-day trace strips as the application calendar.
[3, 4, 5, 6].forEach((day) => {
  const log = logs.find((entry) => !entry.isPlanned && new Date(entry.startTime).getDate() === day);
  if (log) log.linkedTodoId = 'demo-todo-1';
});

export const journalDemoData: JournalExportData = {
  logs, todos, dailyReviews,
  collections: [{ id: 'summer-reading', name: '夏日阅读', createdAt: 0, updatedAt: 0 }],
  collectionEntries: [{ id: 'summer-reading-log', collectionId: 'summer-reading', itemType: 'log', itemId: 'demo-log-1', addedAt: 0 }],
  categories: [{ id: 'study', name: '学习与创作', icon: '📚', themeColor: '#526b5d', activities: [{ id: 'book', name: '阅读与学习', icon: '📖', color: '#77a891', keywords: ['阅读', '课程', '学习', '照片'], attributes: [
    { id: 'pages', name: '阅读页数', type: 'number', unit: '页', order: 0, createdAt: 0, updatedAt: 0 },
    { id: 'genre', name: '题材', type: 'multi', options: [{ id: 'fiction', label: '小说' }, { id: 'memoir', label: '随笔' }], order: 1, createdAt: 0, updatedAt: 0 },
    { id: 'excerpt', name: '摘录感受', type: 'text', order: 2, createdAt: 0, updatedAt: 0 }
  ] }, { id: 'work', name: '工作与创作', icon: '✏️', color: '#879bc4', keywords: ['项目', '写作', '设计'] }] }, { id: 'life', name: '生活', icon: '🌱', themeColor: '#b28666', activities: [{ id: 'walk', name: '运动与日常', icon: '🌿', color: '#a1af7d', keywords: ['散步', '拉伸'] }, { id: 'sleep', name: '睡眠', icon: '🌙', color: '#9a9dbd' }, { id: 'meal', name: '三餐', icon: '🍞', color: '#cfad7f' }, { id: 'rest', name: '休闲', icon: '🎵', color: '#ba97a8' }] }],
  scopes: [{ id: 'learning', name: '学习成长', icon: '📚', themeColor: '#77a891', order: 0, isArchived: false }, { id: 'career', name: '创作与工作', icon: '✏️', themeColor: '#879bc4', order: 1, isArchived: false }, { id: 'wellbeing', name: '照顾自己', icon: '🌿', themeColor: '#a1af7d', order: 2, isArchived: false }],
  todoCategories: [{ id: 'work', name: '工作与学业', icon: '📚', color: '#879bc4' }, { id: 'life', name: '日常生活', icon: '🌿', color: '#a1af7d' }],
  weeklyReviews: [
    { id: 'week-review', weekStartDate: key(3), weekEndDate: key(9), createdAt: stamp(9), updatedAt: stamp(9, 22), summary: '这一周完成了方案初稿，也给生活留下了空白。', answers: [{ questionId: 'week', question: '下周想继续保持什么？', answer: '上午先做需要专注的工作。\n下午留一小段时间散步，不把日程排得太满。' }] },
    { id: 'busy-week-review', weekStartDate: key(10), weekEndDate: key(16), createdAt: stamp(16), updatedAt: stamp(16, 22), summary: '给写作留出整块时间，周末也有自己的节奏。', answers: [{ questionId: 'balance', question: '这周的时间花在哪里？', answer: '上午的写作最专注。\n三餐和休息成为每天稳定的锚点。' }, { questionId: 'next', question: '下周的小调整', answer: '晚上少安排一件事，提早半小时放下手机。' }] }
  ],
  monthlyReviews: [{ id: 'month-review', monthStartDate: key(1), monthEndDate: key(31), createdAt: stamp(31), updatedAt: stamp(31, 22), cite: '日子很长，值得慢慢写。', summary: '八月的关键词：留白、阅读、慢慢完成。', answers: [{ questionId: 'month', question: '这个月最想珍藏的三个瞬间', answer: '和朋友重逢的晚餐。\n美术馆里那幅蓝色的画。\n傍晚在桥边吹到的风。' }] }],
  goals: [{ id: 'reading-goal', majorGoalId: 'learning-year', title: '八月阅读与课程学习', scopeId: 'learning', metric: 'duration_raw', targetValue: 40 * 3600, startDate: key(1), endDate: key(31), status: 'active', motivation: '留一点时间，听听不同的人如何理解这个世界。' }],
  majorGoals: [{ id: 'learning-year', title: '保持学习和创作的节奏', scopeId: 'learning', metric: 'duration_raw', targetValue: 120 * 3600, startDate: '2026-01-01', endDate: '2026-12-31', status: 'active', description: '把阅读、课程与写作连成一条慢慢积累的线。', createdAt: new Date(stamp(1)).toISOString(), updatedAt: new Date(stamp(31)).toISOString() }]
};
