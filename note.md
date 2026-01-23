npm run build
npx cap sync
npx cap open android

npm run electron:build
npm run dev

git reset --hard 04a7d4a425066ad7a9210c3042d1e7d2e32b26e7
git push --force

发布新版本时：
先更新 package.json 和 updateService.ts 中的版本号
构建新的 APK
创建 GitHub Release 并上传 APK 
再更新 version.json 的版本号

待开发功能：
领域没有设置热力图阈值的地方？(不紧急)
随机引导模板功能。
整理下标题栏的逻辑。（不紧急）
点击小图查看大图
memoir和Chronicle在宽屏上的自适应。
全屏统计视图的异常。
筛选条件是否显示日报周报
s3配置界面的引导

# 1.0.7
增加专注记录评论功能。
增加memoir页面。
增加档案页/索引页的默认页面设置。
修改筛选器的“或”逻辑，使用“or”表示。
增加记录详情页扩展输入框的功能。
增加计时悬浮窗收缩、扩展的功能。
增加S3云同步功能。


# 20260122

配置教程：
[【ios福音】obsidian第三方同步方案(remotely插件+腾讯云cos)-保姆级教程 - 知乎](https://zhuanlan.zhihu.com/p/479961754)

现在手机端上传图片，已经可以在存储桶中看到，但是现在手机端上传图片，无法在电脑端上下载。
你看一下下载图片的逻辑，是不是还是保留的webdav的逻辑，没有加s3的逻辑


我希望悬浮窗的完整状态，它的高度在56Px左右，就是稍微减矮一点。  

// 测试腾讯云COS连接
const testConfig = {
  bucketName: 'lumostime-1315858561',
  region: 'ap-chongqing',
  accessKeyId: '',
  secretAccessKey: ' ', // 替换为你的实际SecretKey
  endpoint: 'https://cos.ap-chongqing.myqcloud.com'
};

console.log('测试配置:', testConfig);




# 20260121
在设置页的偏好设置中，增加两个选项。 在启动默认页的下方，以开关切换的形式去呈现内容，就是档案页的默认页面和索引页的默认页面。

档案页的默认页面有两个选择Chronicle和memoir，索引页的默认页面也有两个选择tags和scopes。 

请你再检查，memoir相关功能有没有多余的代码，有没有可以优化的空间。

右下角悬浮按钮切换到memoir的icon变成，audio-waveform
切换到 Chronicle的按钮变成book-heart

减小monthly reviews 上面边距
使用#标题#匹配到标题之后，条目备注就不要显示这一串字符了。

使用暖灰色（Stone/Warm Gray）作为主基调，模拟纸张的质感，营造温暖、复古但现代的氛围。
顶部标题栏和下面的内容背景保持一样的颜色。

下滑的时候，标题栏流畅地缩小和变窄，从这样变成这样
<header class="sticky top-0 z-40 transition-all duration-300 bg-transparent py-4"><div class="max-w-xl mx-auto px-6"><div class="flex flex-col items-center"><h1 class="font-serif text-stone-800 font-bold transition-all duration-300 text-2xl mb-1">Memoir</h1></div></div></header>

<header class="sticky top-0 z-40 transition-all duration-300 bg-stone-50/90 backdrop-blur-md shadow-sm py-2"><div class="max-w-xl mx-auto px-6"><div class="flex flex-col items-center"><h1 class="font-serif text-stone-800 font-bold transition-all duration-300 text-lg">Memoir</h1></div></div></header>

时间线上的星星和月亮有白色背景，请删除。

引言部分的文字改成17px（"'Every moment is a memory waiting to happen."）

标题 momeir Chronicle 的字号在大的时候是18 px，小的时候是16px。

每个条目的标题字号放小，16px。

读取不到标题和内容的日报：
标题为日期，如2026/12/1
内容为省略号。
读取不到标题和内容的周报：
标题为日期范围，如2026/12/1-2026/12/7
内容为省略号。

按照这个组件修改顶部的日期切换栏，复制粘贴ui样式，不要修改。

点击“昨日”按钮可以跳转到昨天的日回顾。 

点击“今日”按钮可以跳转到今日的日回顾。 

“上周”可以跳转到上周的周回顾。 

“本周”可以跳转到本周的周回顾。 

如果没有，就新建。 

如果有，就打开。 

```
<div class="flex items-end gap-3 mb-8 pt-6 px-1 select-none"><div class="flex flex-col relative group cursor-pointer shrink-0"><div class="flex items-center gap-2"><span class="text-xs font-bold text-stone-400 font-sans tracking-wide">2024年</span></div><div class="flex items-center gap-1"><h2 class="text-3xl font-serif font-bold text-stone-800 group-hover:text-stone-600 transition-colors">1月</h2><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down text-stone-300 group-hover:text-stone-500 transition-colors mt-1.5" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg></div></div><div class="h-px bg-stone-200 flex-1 mb-3"></div><div class="flex items-center gap-1 mb-1 shrink-0 bg-stone-100/60 p-1 rounded-lg border border-stone-100"><button class="px-2.5 py-1 text-[11px] font-medium text-stone-500 hover:text-stone-800 hover:bg-white/80 rounded-md transition-all">昨日</button><button class="px-2.5 py-1 text-[11px] font-bold text-stone-800 bg-white shadow-sm border border-stone-200/50 rounded-md">今日</button><div class="w-px h-3 bg-stone-300/40 mx-0.5"></div><button class="px-2.5 py-1 text-[11px] font-medium text-stone-500 hover:text-stone-800 hover:bg-white/80 rounded-md transition-all">上周</button><button class="px-2.5 py-1 text-[11px] font-medium text-stone-500 hover:text-stone-800 hover:bg-white/80 rounded-md transition-all">本周</button></div></div>
```

按照这个，在整个画面的右边的中间加一个悬浮的框，切换导航栏。 
在屏幕的最右侧（紧贴边缘），渲染一条极细的、隐约可见的垂直线
只显示有记录的日期：比如只有 15号、14号、12号，而不是把1-31号全列出来
当前位置高亮：随着页面滚动，当前可视区域对应的日期节点会变大、变深色
点击跳转：点击右侧的某个日期数字，页面平滑滚动（Smooth Scroll）到对应的条目。


```
<div class="fixed right-1 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-3 py-4 rounded-full bg-stone-50/50 backdrop-blur-[2px]"><button class="group relative flex items-center justify-center w-8 h-4 select-none touch-manipulation"><span class="
               font-serif text-[10px] transition-all duration-300
               text-stone-300 font-medium group-hover:text-stone-500
             ">15</span><div class="
               absolute -left-1 w-1 h-1 rounded-full bg-stone-900 transition-all duration-300
               opacity-0 scale-0
             "></div></button><button class="group relative flex items-center justify-center w-8 h-4 select-none touch-manipulation"><span class="
               font-serif text-[10px] transition-all duration-300
               text-stone-300 font-medium group-hover:text-stone-500
             ">14</span><div class="
               absolute -left-1 w-1 h-1 rounded-full bg-stone-900 transition-all duration-300
               opacity-0 scale-0
             "></div></button><button class="group relative flex items-center justify-center w-8 h-4 select-none touch-manipulation"><span class="
               font-serif text-[10px] transition-all duration-300
               text-stone-300 font-medium group-hover:text-stone-500
             ">12</span><div class="
               absolute -left-1 w-1 h-1 rounded-full bg-stone-900 transition-all duration-300
               opacity-0 scale-0
             "></div></button><button class="group relative flex items-center justify-center w-8 h-4 select-none touch-manipulation"><span class="
               font-serif text-[10px] transition-all duration-300
               text-stone-300 font-medium group-hover:text-stone-500
             ">10</span><div class="
               absolute -left-1 w-1 h-1 rounded-full bg-stone-900 transition-all duration-300
               opacity-0 scale-0
             "></div></button><button class="group relative flex items-center justify-center w-8 h-4 select-none touch-manipulation"><span class="
               font-serif text-[10px] transition-all duration-300
               text-stone-900 font-bold scale-150 origin-right
             ">08</span><div class="
               absolute -left-1 w-1 h-1 rounded-full bg-stone-900 transition-all duration-300
               opacity-100 scale-100
             "></div></button></div>
```

筛选条件设置是否显示周报、日报。

点击左侧的日期，新建日报。






记录详情的输入框可以伸展

---

在设置页面增加一个设置页，内容是： 
memoir的筛选条件。筛选条件：

1. 第一，是否带有图片？
   
2. 第二，备注最小字数？

3. 第三，关联标签？（可以多选）

4. 第四，关联领域？（可以多选）

这些条件都可以留空，就是不筛选。
只有满足上面四个条件的专注记录，才会在 memoir 界面显示。 
ui的设计请参考先有的风格，保持一致。

为月报数据类型增加一个可选的 cite 字段，首先是在月报详情页，增加一个Tab展示这个cite字段，用户可以编辑，然后实时保存。
其次是在Memoir页面上的这个月份选择下面的那个地方，引用月报当中的cite字段。 

D:\2026 ai_assist\lumostime\static\my-chronicle-timeline
这个文件夹里面是一个日记页面组件的设计草稿。 
你看一下我给你的参考代码。它里面是有一个最左边的日期往下滑，它会固定在顶部的这么一个设计。 

现在把我们的假数据替换成真数据。 
日期、备注的内容、图片，还有开始的时间、评论，这些字段在专注记录数据里面都是有的。 
但是现在因为备注是没有标题的，所以要设定一个标题语法。也就是说，用户在专注记录的备注里面，如果输入了这样一个标题的语法，那么就自动识别为标题。 暂时定为#标题#，也就是用两个井号包裹标题。如果识别到了标题，那就是把它作为标题；如果没有识别到标题，就把标签的名字，也就是活动的名字、二级标签的名字，给它作为标题。 

日总结和周总结的标题和内容，请你参考一下档案页里面逻辑。标题就是AI叙事的标题  

就是AI叙事的第一行。 内容就是ai叙事最后的引用格式文字。

第一。不需要生成重复的左边的日期时间戳。  
只需要在每一天的第一条生成一个就行了。 
第二，要模仿这个来展示标签、待办、领域信息，现在的每个条目都不对



每个条目标题字体模仿：<h3 class="text-lg font-bold leading-tight text-stone-900">上课开会</h3>
正文字体模仿<p class="text-sm text-stone-500 leading-relaxed mb-2 font-light whitespace-pre-wrap">修改摘要</p>


第二，要模仿这个来展示标签、待办、领域信息，现在的每个条目只展示了二级标签，没有展示一级标签、待办、领域。请模仿脉络页的条目是怎么写的。
不要改动现有的ui

删除页面右上角的 "Enters" 的 Filter 功能。 


My Chronicle更名为  Chronicle
日记 更名为 Memoir 

/html/body/div/div[1]/main/div[1]/main将这个组件的上 padding 改成 10。 
<span class="text-xs font-bold text-gray-400 tracking-[0.2em] uppercase block mb-1">Timeline</span>删除这个组件。 

现在的时间线页面没有显示周报，只有日报。 
日报周报和普通节点应该用时间线竖线上面的小圆点进行区分。 日报的小圆点变成小月亮，周报小圆点变成小星星。

现在每一个条目只显示了开始时间，请您把结束时间也加上，然后改成24小时时间。 

# 1.0.6
更新前先备份数据

增加批量修改历史记录的功能。
修复引导提问不生效的问题。

# 1.0.5
更新前先备份数据

更新日志：
pc端增加导出到obsidian功能。
增加自定义筛选器功能。
增加数据导出到Excel功能。
增加ai批量添加任务的功能。
增加统计页面月横向时间轴视图。
增加日报中的“日课”功能，并增加对应的统计功能。
修改ai补记关联领域的逻辑，ai现在可以自动推荐关联领域，并且自动应用标签关联领域规则。
修改任务、分类、标签、领域时间线中的月历UI。
增加任务、分类、标签、领域时间线中的“显示全部”按钮
增加启动时自动检查更新功能。
增加偏好设置中自动聚焦备注的开关。
增加脉络页手机端左右滑动切换上一天、下一天的功能。
增加标签关联领域规则页面，按照领域分组规则的功能。
增加删除已有关联记录的待办时的再次确认功能。
增加ai叙事自定义模板的适用周期修改功能。
修复脉络页同步按钮没有时间戳检测的问题。
修复任务详情页日期滚动问题。
修复凌晨时补记点击到现在会生成跨天记录的问题。
修复用户未接受悬浮球建议开始应用关联标签记录时，悬浮球状态异常的问题。
修复分类详情页未隐藏切换领域悬浮按钮的问题。
修复月度环形统计图没有趋势百分比的问题。
修复从待办开始计时时，多关联领域只保存一个领域的问题。
修复快速打点有时会生成跨天记录的问题。
修复时间线中每天第一条记录之前的空闲时间块不显示的问题。
修复DailyReviewView、WeeklyReviewView 和 MonthlyReviewView 组件中addToast参数传递错误的问题。
拆分和重构app.tsx

重写ai叙事默认的提示词，分别是：
图标	模板名称	适用周期
📜	赛博黄历	日
📅	每日简报	日
🧞‍♂️	伴侣日记	日
📊	极简复盘	周、月
🌟	哲学命题	全周期
⚠️	严格导师	全周期
🍃	正念叙事	全周期
🚀	成长教练	全周期
🚩	苏维埃政委	全周期


# 20260117
新功能介绍：和上版本不同的地方。
日、周、月总结功能
统计图标更新
档案页

现在要增加一个为专注记录添加图片的功能，请拆解这个任务。包括ui设计、数据的存储同步等等。

关闭点击查看大图之后，应该显示专注记录详情，不是回退两级关闭详情。

严格导师的icon不可用，把⚠️换成⚔️。提示词中的icon也替换一下。
伴侣日记的名称，改成树洞伴侣。
苏维埃这个标题太长了，icon也要换，提示词中的五角星全部换成红旗


✓在日课模板这个设置页的右上方，在新建模板的旁边添加一个按钮“批量修改日课数据”，用于批量修改已经生成的日课数据，点击后弹出一个弹窗。每个小功能分tab呈现。第一个功能是：批量删除，允许用户删除已有日报中的每一个日课条目，比如“早起喝水”。第二个功能是：批量重命名，允许用户重命名已有日报中的每一个日课条目，比如“早起喝水”可以重命名为“早起”。

✓任务详情没有切换全部和当月的时间线的按钮。

✓在偏好设置中增加一个开关，可以设置是否在添加补记和正在专注的时候，自动跳转到备注框。默认跳转。

✓在todo里面设置任务的时候scope选两个，然后开始任务之后脉络里面的记录只显示一个scope

✓日课增加“重新从模板导入”按钮在“清空当日日课”的上方。用户点击后，会重新从模板生成当日的日课，并覆盖原有的日课数据。

✓在删除待办时，检查是否已经有关联到此待办的记录，如果有，则弹出提示框，让用户确认。如果用户删除，则移除这些记录的关联待办数据，但是不要删除记录本身。请检查这个逻辑。

✓当用户添加了从6点到9点的记录，但是缺少0点到6点的记录时，也应该显示idle time的空闲时间块，等待用户添加。

## 提示词修改

全局输出要求：
1. 使用Markdown格式。
2. 第一行必须是标题，不包含任何前缀。标题的格式为【固定icon】+【具体标题内容】。固定icon将在人设提示词中给出。
3. 最后一部分必须且只能是一个引用块 (Blockquote, >)，内容必须短小精悍。
4. 禁止使用 "根据数据..."、"通过分析..." 等废话作为开头，直接进入叙事或分析。
5. 禁止使用多余的比喻句、形容词、引号、破折号，请尽量像人那样写作。打破总结的模板，使句式丰富多样。
6. 你写的内容需要通顺易懂，态度谦虚真诚，突出自然真实，不要过度夸张。

 
### 哲学命题（适用于日、周、月）
```
export const TEMPLATE_PHILOSOPHY = `
Role: 你是一位博古通今的现代哲学家，你的脑海中存储着人类思想史上所有的智慧。

Task: 请阅读我的【本时间段内数据】，捕捉今天我生活中的核心张力，并从哲学史中检索一个**最精准**的哲学概念来进行概念升维，你能看到用户看不到的东西，避免老生常谈。你的论述应该围绕着这一概念展开，尽量不要牵涉到其他概念，避免掉书袋。

你必须在内心中严格按照以下三步推进文章，但**不要在输出中标记步骤名称**，要像一条河流一样自然流动，一切内容，均需守着「概念的本质」，类比和比喻都是为了更好地表达本质的技巧方法，不要脱离本质内核。

- what：概念的关键组成要素  （拆解）
- how: 概念的运作机制 （作用）
- 哲学：哲学视角收尾提升 （本质）

禁止罗列式（bullets）表达，要像哲学家的内心独白一样深刻和流畅，措词「通俗易懂」，讲解结合现实场景「深入浅出」，引人入胜。

# Output Structure

[Title: 🌟 {哲学命题的名称}]

## [正文]
(这里开始你的三段式散文创作。请确保文章一气呵成，从现象到本质，层层递进。)

> [文章末尾，请引用一句与该概念相关的经典哲言，作为余音绕梁的结束。]

```

### 赛博黄历（适用于日）
```

export const TEMPLATE_FORTUNE = `
Role: 你是一位精通风水学、八字命理学、占卜学的东方玄学大师。

Task: 将用户的【今日数据】转化为一张【电子老黄历】的撕页，并根据今日表现推演明天的运势。

请结合今天和明天的信息： \${lunar_data} ，使用五行生克理论进行分析。

# Core Logic
请在内心进行术语转译，不要直接说现代词汇，要用古风包装：
1. **行为转译**：
   - 写代码/改Bug -> 转化为：【修造】（修补天地漏洞）或【祭祀】（向赛博神灵祈祷）。
   - 写论文/学习 -> 转化为：【文昌】（文曲星动）或【闭关】。
   - 摸鱼/发呆 -> 转化为：【卧游】或【神游太虚】。
   - 没做日课 -> 转化为：【诸事不宜】或【冲煞】。
2. **吉凶判定**：
   - 如果用户今天效率高 -> 宜：大兴土木；忌：安逸。
   - 如果用户今天很累/失败 -> 宜：休沐、纳财；忌：强求。

# Output Structure

[Title: 📜 {今日喜忌内容}·{今日农历日期}]

## [今日宜忌]
**【宜】**：[词A] ([解释A])、[词B] ([解释B])
**【忌】**：[词C] ([解释C])、[词D] ([解释D])
*(注意：这里的宜忌必须是根据用户今天已经发生的事，进行精准命中。)*

## [运势批注]
(用半文半白的语言，点评今日。
例如：“今日火旺金缺，施主在‘代码’一事上耗神太重，恐伤肝火。虽文昌星高照，产出颇丰，然‘养生’一栏空空如也，乃‘杀鸡取卵’之相。慎之，慎之。”)

## [明日神谕]
(给出一个具体的、玄学的指引。
例如：“明日正南方利财，但不宜早起。若遇报错，切勿强攻，宜向东行，以此方之木气化解。幸运色：#00FF00 (报错绿)。顺便，记得喝水，以此补水局。”)

> [一句像谶语一样的总结，或者一句改编的古诗。]

**Format Rules**:
- 标题要有仪式感。
- 语气：神神叨叨、半文半白、带有幽默感。
- 必须包含“宜/忌”的视觉列表。
`;
```

### 每日简报【适用于日】
```
export const TEMPLATE_SIMPLE = `
Role: 你是一位客观、务实的记录者。
Task: 阅读【今日数据】，用最朴素、直白的语言，生成一份每日简报。

# Principles
1. **零修辞**：严禁使用比喻、拟人、夸张等修辞手法。
2. **去情感化**：不要安慰，不要赞美，也不要批评。只陈述事实。
3. **数据导向**：能用数字的地方直接引用数字。

# Output Structure

[Title: 📅 每日简报 {日期}]

**1. 核心达成**
(直接陈述今天完成度最高、或投入时间最长的 1-2 件事。配合具体时长。
例如：“完成了论文第二章的初稿撰写（投入 3 小时）；修复了登录模块的关键 Bug。”
如果无核心产出，直接陈述：“今日主要处理琐碎杂务，无核心产出。”)

**2. 时间效能**
(客观评价时间利用率。
例如：“全天高专注时长共计 6 小时，利用率较高。下午 14:00-15:00 存在较长时间的注意力中断。”)

> [一句话总结。高度概括今日的状态，不做升华。]

**Format Rules**:
- 语言平实简洁，拒绝任何互联网黑话。
- 全文控制在 150-200 字以内。
`;
```

### 极简复盘【适用于周、月】
```
export const TEMPLATE_PERIODIC = `
Role: 你是一位客观的数据分析师。
Task: 阅读我的【阶段数据】（包含本周或本月的累计记录），剥离细节，用最直白的语言生成一份阶段性复盘简报。

# Principles
1. **总量视角**：关注累计投入时长和最终产出结果，忽略单日的琐碎起伏。
2. **零修辞**：严禁使用比喻、煽情或说教的语言。
3. **趋势导向**：指出这段时间的状态是稳定、波动还是下滑。

# Output Structure

[Title: 📅 阶段简报 {开始日期 - 结束日期}]

**1. 核心进展**
(陈述本阶段投入时间最多、或达成实质性突破的 1-2 个领域。需引用累计时长。
例如：“本周重点攻克了[博士课题]，累计投入 28 小时，完成了论文核心章节的修缮；[开发任务]方面进展平稳，累计投入 10 小时。”
若本阶段无明显重心，陈述：“本阶段精力分散于多个杂务，无突出进展。”)

**2. 效能趋势**
(客观评价这段时间的投入分布和稳定性。
例如：“整体投入时间呈现‘前高后低’趋势，周一至周三保持高强度产出，周四后显著下滑。时间主要分布在[学术]与[工作]领域，生活类事务占比极低。”)

> [一句话总结。高度概括这一个周期的核心特征。例如：“以学术攻坚为主线，但后期耐力不足的一周。”]

**Format Rules**:
- 语言平实简洁，不使用“复利”、“闭环”等黑话。
- 聚焦于“累计”和“变化”。
- 全文控制在 200 字以内。
`;

```

### 严格导师【适用于日、周、月】

export const TEMPLATE_STRICT = `
Role: 你是一位极其严苛、追求极致的导师。你极度厌恶平庸、借口和自我感动。你的眼里只有结果。

Task: 审阅用户的【本阶段内的时间统计数据】，用简练、犀利、不留情面的语言，指出我工作/学习中的漏洞。、

# Core Tone
**替代超我**：外包了一个强力的超我，来压制懒惰的本我。
**惜字如金**：多用短句、反问句。语气要冷，压迫感要强。
**拒绝情绪**：不要生气，不要愤怒。保持绝对的冷静和客观。

# Output Structure

[Title: ⚠️ + {主要内容}]

## [冷眼审视]

## [戳破幻象]
(精准打击用户的借口。)

## [最后通牒]
(给出带有命令口吻的建议。)

> [一句极度刺耳但发人深省的鞭策。]


```
### 正念叙事（适用于日、周、月）

```
export const TEMPLATE_HEALING = `
Role: 你是一位结合了正念减压与叙事疗法的心理疗愈师。你的语言像流淌的溪水，缓慢、温柔、不含评判。

Task: 阅读用户的【本时间段的数据】，为他构建一个心灵栖息地。将焦虑的情绪外化，并引导用户回归当下的安宁。

# 🧠 Core Logic (The Healing Algorithm)
1. **正念暂停 (The Mindful Pause)**:
2. **情绪外化 (Externalization)**:
3. **接纳与呼吸 (Acceptance)**:

# Output Structure

[Title: 🍃 此刻安住 [日期]]

**【觉察·当下】**
(用极慢的语速，描述今天的一个画面。)

**【外化·访客】**
(运用叙事疗法，把负面情绪变成客体。)

**【回归·静谧】**
(一段引导性的结束语，强调存在本身的价值。)

> [一句极其治愈的、关于接纳与自爱的短句。]

**Format Rules**:
- 语气：轻柔、缓慢。
- 严禁出现催促、建议或任何带有压力的词汇。
- 把重点放在“感受”而非“思考”上。
`;

```

### 成长教练

```
export const TEMPLATE_GROWTH = `
Role: 你是一位擅长“行为设计”和“长期主义”的个人成长教练。

Task: 基于我的【本阶段的数据】，进行一次深度复盘，并为明天设计具体的行动方案。

# 🧠 Core Logic (The Coaching Algorithm)
1. **价值分层**:
    - **🅰️ 长期资产**：能产生复利的事
    - **🅱️ 短期交付**：必须做但价值只在当下的事
    - **🗑️ 情绪耗损**：单纯的内耗或无意义的娱乐
2. **福格行为模型 (B=MAP)**:
   - 在建议明天怎么做时，严格遵循 **行为(Behavior) = 动机(Motivation) + 能力(Ability) + 提示(Prompt)**。
3. 坚持长期主义。秉持以终为始，复利思维，幸福主义的理念，思考这些行为与我的目标之间的联系，是否形成长期价值，是否增加了我的可持续幸福感。

# Output Structure

[Title: 🚀 成长日志 {日期}]

## 1. 行动分类

## 2. 觉察与复盘
(用第三人称视角的教练口吻，指出一个思维误区或习惯漏洞。）

## 3. 明日行为设计

> [金句总结]

**Format Rules**:
- 语气：专业、理性、具有启发性（Coaching Tone）。
- 严禁空洞的鼓励，只提供可执行的策略。
- 必须包含 **B=MAP** 的具体拆解。
`;


```

## 苏维埃（使用于日、周、月）

```
export const TEMPLATE_COMMUNIST = `
Role: 你是列宁、马克思或一位严肃的苏维埃政治委员的化身。你用历史唯物主义的眼光审视一切，用钢铁般的意志要求他人。

Task: 阅读【本阶段时间数据】，将其视为一份前线战况报告，并以革命导师的口吻，向你的“同志”（用户）下达一份政治批示。

# ★ Core Logic
请在内心进行革命话语体系的转译，严禁使用资本主义的软弱词汇：

1. **战场映射 (Mapping the Struggle)**:
   - 工作/学习 -> 转化为：【核心生产战线】或【对资产阶级堡垒的进攻】。
   - 摸鱼/娱乐 -> 转化为：【受到了小资产阶级腐朽思想的侵蚀】或【中了消费主义的糖衣炮弹】。
   - 困难/Bug -> 转化为：【反动派的顽固抵抗】或【内部的怠工现象】。
   - 休息/睡觉 -> 转化为：【必要的战略休整】或【储备革命能量】。
   - 未完成的任务 -> 转化为：【尚未解放的领土】。

2. **语气指南 (Tone Guide)**:
   - **称呼**：必须使用“同志”（Comrade）。
   - **宏大化**：把个人的得失上升到集体和历史的高度。
   - **辩证批判**：一方面要肯定战术上的胜利，另一方面要严厉指出思想上的松懈。

# Output Structure

[Title: ★ 关于 [日期] 生产战线情况的政治局批示]

**【[用户昵称] 同志：】**
(开场白。带有极强的紧迫感和使命感。
例如：“中央委员会怀着极大的关切审阅了你今日的战报。在当前世界革命形势如此严峻的时刻，你的一举一动都关乎着全局。”)

**【★ 战况辩证分析】**
(运用“一方面...另一方面...”的辩证法进行分析。
- **肯定方面**：表扬高产出时段。
例如：“从数据上看，我们在‘代码生产’这条主战线上取得了无可辩驳的战术胜利（投入6小时）。这体现了无产阶级铁一般的纪律性，值得嘉奖。”
- **批判方面**：抨击低效/摸鱼时段。
例如：“但是，我们也敏锐地注意到，在下午15:00，你的阵地上出现了严重的思想滑坡。长达一小时的‘短视频浏览’，表明你对资产阶级享乐主义的糖衣炮弹缺乏最基本的警惕！这是典型的小资产阶级动摇性！”)

**【★ 最高指示】**
(给出下一步的战略命令，口号化，有力。
例如：“这种松懈是绝对不能容忍的！组织要求你立刻整顿纪律。明天，必须集中优势兵力攻克那个残留的Bug堡垒。不要找借口，布尔什维克没有‘困难’二字！”)

> [一句充满力量的革命口号，作为结束语。]

**Format Rules**:
- 充满苏式政治术语。
- 语气激昂、严肃、不容置疑。
- 使用 ★ 作为小标题符号，营造红头文件氛围。
`;

```

### 树洞整理（适用于日）

```

export const TEMPLATE_COMPANION = `
Role: 你是用户的私人日记助手，也是一位温暖的心理专家与人生导师。
Task: 用户会输入【今日碎片记录】（包含断续的想法、经历、情绪）。请你将其整理为一篇连贯的日记，并提供深度洞察。

# Core Logic (Processing Pipeline)
1. **重构叙事 (Restructure)**:
   - 将碎片化的句子串联成通顺的段落。
   - **保留原意**：不要随意增加不存在的情节，但可以优化表达。
2. **结构化提取 (Extraction)**:
   - 从乱序文字中精准提取出：发生的事件、灵感、待办、感恩点。
3. **导师视角 (Mentoring)**:
   - 像一位老友一样，基于今日内容，给出温柔且有力量的反馈。

# Output Structure

[Title: 🧞‍♂️ 伴侣日记：[日期]]

## 1. 📝 岁月重拾 (The Diary)
(将用户的碎片记录改写为一篇完整的日记。
要求：语言通顺、结构清晰、有文学感。用第一人称“我”来叙述。)

## 2. 🔍 碎片整理 (Key Takeaways)
* **☁️ 心情与状态**: [总结今日情绪基调]
* **💡 灵感与想法**: [提取关键的脑洞或感悟]
* **✨ 小确幸**: [值得感恩的人或事]
* **🚩 遗留待办**: [提取未完成的事项]

## 3. 🧘 导师洞察 (Insight & Support)
(角色：心理专家/人生导师。
语气：直接、温和、治愈。
内容：分析用户今天为什么会产生这种情绪？或者对那个未解的难题给出一个视角的转换。
例如：“我注意到你今天反复提到了‘焦虑’。其实，焦虑往往源于对未来的过度想象。试着回到当下...”)

> [一句简短的激励语句作为结尾。]

**Format Rules**:
- 即使输入只有寥寥数语，也要认真对待，写出深度。
- 严禁说教，保持“陪伴者”的温度。
`;



```


# 20260109
快速打点新增的记录，不应该有跨天的记录，如果今天没有更早的记录，开始时间应当是当天的00：00，而不是追溯到很多天前的上一个记录

筛选器详情的专注刻度，里面的散点会因为屏幕宽度的变化变成椭圆，请你修改，确保无论如何拉伸屏幕，都保持正圆

导出到obsidian这一个子设置页，删除导出为xlsx的卡片。

删除今日日课后，再重新生成日报，就没办法正常读取模板生成日课了。
---

给ai生成叙事的提示词中，要包含check项的完成情况。
日报、周报、月报，增加不一样的逻辑。

确保新功能对之前数据的兼容性，不要影响用户旧版本的数据，比如说没有check项的日报，应当直接显示暂无check项，而不是修改原数据。用户从旧版本更新，是没有清单模板数据的，可以加载一次自带的模板？以及还有没有其他新旧版本更新的问题，请检查提出。


设置项里检查清单四个字改成“检查清单模板”

每一个分类的检查清单模板，里面的具体条目内容，以胶囊的形式显示，不要一个一行。模仿这个胶囊。但是不要限定宽度，宽度根据文字内容自动调整。<button class="
                            px-2 py-2 rounded-lg text-[10px] font-medium text-center border transition-colors flex items-center justify-center gap-1.5 truncate
                            bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100
                        "><span>📚</span><span class="truncate">学习计划</span></button>每一个分类的卡片高度跟随检查项内容的多少自动调整。


---

check统计视图里面每一组统计项的排序应当是按照这个数据分类本身的存储顺序去改的，也就是说，如果这个日报数据中check项是排到前面的，那应该是这一条目的统计数据都是排到前面的。每日回顾应该在晚间流程的前面, 周、月、年范围都是一样的逻辑


在日报详情页面，增加一个“check” tab，排序在“数据”tab 之前。页面右下角有悬浮按钮“+”点击可新增check项。
“check” tab显示本天需要检查的事项，以列表形式展现，每一项前可点击完成/取消完成。条目右侧显示编辑图标，点击后可以修改条目内容、删除条目。
在设置页面，每日回顾的子分类下，新增“check模板”子设置页。用户可以在此添加和编辑check模板。具体的样式，可以参考“回顾模板”。
首先，请修改日报数据类型，存储每天的check数据。然后新增数据类型：check的模板。
check存储的逻辑和引导回顾问题一样，一旦生成日报数据后，就不受到模板修改的影响。
然后，在设置页面添加“check模板”子设置页。
然后，实现日报详情页读取模板、生成check项的功能。并实现交互ui效果。


在数据统计页StatsView.tsx，右上角切换视图组件的最右侧，添加一个“check”统计视图。该视图只对周、月、年这三种时间范围生效。请定位这个组件：
```
<div class="flex items-center justify-between mb-4"><div class="flex-1"><div class="flex bg-stone-100/50 p-0.5 rounded-lg w-fit"><button class="px-2.5 py-1 rounded-md text-[10px] font-bold transition-all bg-white text-stone-900 shadow-sm">日</button><button class="px-2.5 py-1 rounded-md text-[10px] font-bold transition-all text-stone-400 hover:text-stone-600">周</button><button class="px-2.5 py-1 rounded-md text-[10px] font-bold transition-all text-stone-400 hover:text-stone-600">月</button><button class="px-2.5 py-1 rounded-md text-[10px] font-bold transition-all text-stone-400 hover:text-stone-600">年</button></div></div><div class="flex items-center gap-2"><div class="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg"><button class="p-1.5 rounded-md transition-all text-stone-400 hover:text-stone-800 hover:bg-white" title="上一个时间段"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></button><button class="p-1.5 rounded-md transition-all text-stone-400 hover:text-stone-800 hover:bg-white" title="下一个时间段"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg></button></div><div class="flex bg-stone-100 p-0.5 rounded-lg"><button class="p-1.5 rounded-md transition-all bg-white text-stone-900 shadow-sm" title="饼图"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chart-pie" aria-hidden="true"><path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"></path><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path></svg></button><button class="p-1.5 rounded-md transition-all text-stone-400 hover:text-stone-600" title="矩阵"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-grid3x3 lucide-grid-3x3" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M3 9h18"></path><path d="M3 15h18"></path><path d="M9 3v18"></path><path d="M15 3v18"></path></svg></button><button class="p-1.5 rounded-md transition-all text-stone-400 hover:text-stone-600" title="趋势"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trending-up" aria-hidden="true"><path d="M16 7h6v6"></path><path d="m22 7-8.5 8.5-5-5L2 17"></path></svg></button><button class="p-1.5 rounded-md transition-all text-stone-400 hover:text-stone-600" title="日程"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar" aria-hidden="true"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path></svg></button></div></div></div>
```
周、月、年视图的内容分别模仿这三张图。



---
周报详情-数据页面，添加本周check统计视图，只需要改引用的组件显示情况就行了，不要新写其他组件。
月报详情-数据页面，添加本周check统计视图
统计视图里的check统计事项应该是自下而上的进行统计的，而不是从模板里面读取的，因为有的时候用户修改了这个模板，但是历史数据没有修改，所以说统计项应该是自底向下的汇总，请你确定一下这个逻辑。而且检查事项的统计只统计带有模板分类属性的事项，有的是用户添加的“通用”类型的事项，这些是临时的，不用统计。
为每一个检查事项分配一个随机颜色，颜色分配逻辑可以查看分类详情中的关键字颜色分配。只分配100色系的浅色，用来代替图中绿色。
不需要当天加粗的黑色边框。
不需要“完成率”三个字，也不需要显示完成天数，只需要显示完成率的数字即可
不需要周的mo ru we th fr sa su 的标签。
重置数据和恢复默认数据，似乎没有对检查清单模板生效。

# 20260102
分类详情页不该有领域的悬浮按钮。 
所有的分类详情、领域详情、标签详情、任务详情、筛选详情当中的时间记录所显示的关联标签、关联领域、关联待办的格式都是一样的，每一条记录都要显示全部三个要素。 
# 20251231
添加补记的时候，用户如果在第二天的凌晨点击“到现在”就会生成跨天记录。请你识别一下这种情况。任何时间，都不能生成跨天记录。

在应用关联标签的功能当中。用户如果没有接受悬浮球的建议，退出关联应用之后，用户再点击悬浮球，想要回到 lumostime ，但却异常开始了已经退出应用的计时

在任务详情页，时间轴内的日期不需要固定，只用和页面一起滚动向下即可。

在ai补记（时间记录的）确认页面，添加可选择关联领域的地方。
1. 确定ai提示词中，给ai提供当前用户的领域，并要求ai返回关联领域（告诉ai也可以不返回关联领域）
2. 原有的建议关联领域ui，请直接删除。如果检测到标签自动关联领域规则，请直接应用，并且自动关联领域规则高于ai返回的关联领域，会覆盖ai返回的关联领域。
3. 关联领域的ui模仿ai快速添加任务的确认窗口。当未选中时，显示icon，选中时，显示icon+完整文字。

在ai添加待办的地方，关联标签不能正确读取，现在全是未选中的地方。
ai推荐的关联领域，请采用最小化匹配原则，也就是宁可留空不要乱写，请在提示词中告诉ai这一点。

# 20251230
在数据导出导入这个设置页里，在末尾增加一个新的卡片：导出为xlsx。
第一行设置时间范围，两个输入框，起始时间和结束时间。
第二行设置快捷按钮，今天、昨天、本周、上周、本月、上月、今年、全部
第三行为导出按钮。
导出Excel的内容，列名分别为：id 开始时间 结束时间 持续时长 一级分类 二级标签 关联待办 关联领域 备注 专注得分


参考下面div的ui
```
<div class="bg-white rounded-2xl p-6 shadow-sm space-y-4"><div class="flex items-center gap-3 text-stone-600 mb-2"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download" aria-hidden="true"><path d="M12 15V3"></path><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 10 5 5 5-5"></path></svg><h3 class="font-bold text-lg">导出数据</h3></div><p class="text-sm text-stone-500 mb-4 leading-relaxed">选择日期范围并导出数据到 Obsidian</p><div class="space-y-3"><p class="text-xs font-bold text-stone-400 uppercase tracking-widest px-1">时间范围</p><div class="flex items-center gap-2"><div class="flex-1"><label class="text-xs text-stone-400 mb-1 block px-1">起始日期</label><input placeholder="20251229" maxlength="8" class="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-300" type="text" value="20251228"></div><span class="text-stone-300 mt-5">-</span><div class="flex-1"><label class="text-xs text-stone-400 mb-1 block px-1">结束日期</label><input placeholder="20251229" maxlength="8" class="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-300" type="text" value="20251228"></div></div></div><div class="space-y-2"><p class="text-xs font-bold text-stone-400 uppercase">快捷选择</p><div class="flex flex-wrap gap-2"><button class="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">今天</button><button class="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">昨天</button><button class="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">最近7天</button><button class="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">本周</button><button class="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">上周</button><button class="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">本月</button><button class="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">上月</button></div></div><div class="space-y-3"><p class="text-xs font-bold text-stone-400 uppercase tracking-widest px-1">选择导出内容</p><div class="flex flex-wrap gap-2"><button class="
                                    px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                                    bg-stone-100 text-stone-700 border border-stone-400 hover:bg-stone-200
                                "><span>记录</span></button><button class="
                                    px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                                    bg-stone-100 text-stone-700 border border-stone-400 hover:bg-stone-200
                                "><span>数据</span></button><button class="
                                    px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                                    bg-stone-100 text-stone-700 border border-stone-400 hover:bg-stone-200
                                "><span>引导</span></button><button class="
                                    px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                                    bg-stone-100 text-stone-700 border border-stone-400 hover:bg-stone-200
                                "><span>叙事</span></button><button class="
                                    px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                                    bg-stone-100 text-stone-500 hover:bg-stone-200
                                ">周报</button><button class="
                                    px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                                    bg-stone-100 text-stone-500 hover:bg-stone-200
                                ">月报</button></div></div><button class="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium active:scale-[0.98] transition-all shadow-lg bg-stone-800 text-white shadow-stone-300 hover:bg-stone-900"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download" aria-hidden="true"><path d="M12 15V3"></path><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 10 5 5 5-5"></path></svg>导出数据</button></div>

```

---

增加筛选器功能。
用户可以通过特定的符号，比如说井号引导标签，百分号引导领域，然后@引导代办，以及不带符号的就是搜索全文备注，来定义筛选条件。所有的筛选都是包含，也就是用户输入的关键词只要包含到目标的被注标签领域或者代办当中，都算匹配成功。每一个筛选条件之间用空格分割。比如说“瑜伽 #运动 %健康 @柔韧”
这个功能的入口在设置页面的“搜索全部”下面。名称为“自定义筛选器”。用户点击之后进入自定义筛选器页面。右上角有增加自定义筛选器功能的按钮。点击“增加”，用户可以输入筛选的条件。筛选器条目显示筛选器的名称和匹配到的记录数量、总时间。增加之后，用户点击新建好的筛选器，可以进入筛选器详情的页面。
筛选期详情的UI设计请参考标签详情、分类详情、代办详情、日报详情、周报详情等各种详情。这些详情都是一样的，也就是第一行是标题栏“筛选器详情”（英文），第二行是具体的筛选期的名字。下面是 tab 导航栏，展示时间线（模仿现有的时间线格式）热力图tab（其他tab等后面再添加）
首先，请你先实现设置页面自定义筛选条件实现筛选匹配的功能

时间线处，显示该筛选器所有的记录，而不局限于某一个月。去除时间线页面中的日历。

1. 在时间线的上面，增加
关键指标卡片 (KPI Cards)：
累计投入时长：例如 56小时 20分钟。
累计次数：例如 42次。
平均每次时长：例如 1小时 20分钟（这个可以看出这是否是一个碎片化任务）。

2. 增加一个tab 标题：节奏
时间规律（分析生活节奏）
核心问题： “我习惯在什么时候做这件事？” 目的： 帮助用户发现自己的生物钟和行为模式。
2.1 24小时分布图 (24h Activity Bar Chart)
图表形式：横轴是 0点-24点，纵轴是时长。采用面积图的方式。
洞察：用户可能会发现，“原来我大部分瑜伽记录都发生在晚上 20:00 - 22:00”。这能帮他确认自己的习惯。
随机分配100色系的淡色颜色
2.2 周热力图 (Weekly Pattern)
图表形式：横轴是周一到周日，纵轴是活跃度。
洞察：一眼看出是“周末突击型”选手，还是“工作日规律型”选手。

3. 把热力图tab 改成 ：趋势
GitHub 风格热力图 (Calendar Heatmap)
图表形式：一整年的格子图，颜色越深代表时间越长。
洞察：这是最直观的“坚持图谱”。看着满满的格子，成就感爆棚；看到大片空白，会产生一种温和的提醒。

趋势折线图 (Trend Line)
图表形式：按周/月汇总时长的面积。
洞察：它是上升的还是下降的？比如“上个月瑜伽时间明显下降了”，提示用户该回炉重造了。

4. 增加tab：专注
首先写专注统计总数据：
平均专注度XXX，专注记录总XXX条

专注度/能量分析 (Focus/Energy Breakdown)
图表形式：百分比条。
内容：筛选出的记录中，专注度 5 分的占比多少？1 分的占比多少？
洞察：如果“瑜伽”的记录里 90% 都是高专注，说明这是一件高滋养的事情。

下面展示横轴为时间日期，纵轴为专注时长，圆点大小为专注度的散点图。

# 20251229
我要开发一个从 lumostime 里面导出数据到 Obsidian 的日报的功能。 
首先要有一个地方让用户输入在本地的 Obsidian 的笔记库的地址，以及日记的格式。 
比如说，我的日记的地址就是这个样子的。 F:\document\Obsidian Vault\@蒺藜\01 diary\2025\04\2025-04-26.md里面有一个日记文件的根目录，然后还有这个年月日是怎么编排的，中间的格式是什么样的地址。 
其次，要有一个选项让用户选择导出什么样的记录，比如说导出时间记录、导出日报当中的数据，还有导出日报中的引导提问、导出日报中的 AI 叙事。
（开发完导出日报的功能之后，我们还可以增加导出周报和导出月报的功能。 ）
每一个日报就是一个MD文件。在这个Markdown文件里面，首先用二级标题去写标题部分。
比如说时间记录部分，就写每个时间记录标题，然后写时间轴的记录，然后是引导提问，接着展示问题和答案。如果是AI叙事，就展示“AI叙事”这个标题和叙事的内容。
比如数据统计，就是“数据统计”这个标题和数据统计的内容。这些导出数据的TXT文本，基本上都好像已经开发过了，你可以再复用。 特别是导出时间轴，还有导出时间统计的部分都是开发过的，不要再重复开发了。 
导出数据到 Obsidian 的入口放在设置页面里面。 
在导出设置的页面里面，还有一个可以指定时间范围的选项。你可以从几月几号到几月几号，采用这种八位数字的方式。你还可以快速使用一个快捷按钮，比如说“上月”、“本月”等等。 
现在我们开发的第一个功能就是首先在设置页面里面添加一个入口。然后在这个设置页面增加一个填写路径和填写日记格式的地方。
如果点击导出，就可以导出到那个 MD 文档。你就先做这么一个功能，尽量先做好这个 MVP，之后我们再来加一些细节的功能。
总结一下，就是要有一个入口，点击之后导出。不管你导出的内容是什么，反正你有导出成功的链路，你先跑通。 

---

还要添加一个新逻辑，就是检测对应的文件是否存在。如果已经存在的话，那么就在文件的末尾添加，不要覆盖原有的文件。如果没有存在的话，那再新建一个MD文件。

继续增加导出周报和月报的功能，在路径配置处增加配置周报路径和月报路径的地方，格式和现在的日报配置一样。
在选择导出内容下面，增加两个选项：导出范围内周报、导出范围内月报。识别方式就是每周/每月最后一天是否在导出范围内。如果在，且勾选，则按照上面配置的周报月报路径导出。
导出的内容，根据用户选择的导出内容。但周报和月报中总是不会包含记录。其他的都和日报一样。


# v1.0.4
截止目前的版本均为测试版，更新前请先备份数据。

修复bug：
修复重置和清除数据时个人信息未清除的问题
修复周回顾详情页面的日历双滚动条问题。修复周度回顾数据标签页视图切换按钮被遮挡问题。
修复回顾阅读模式文本换行问题
修复手机端检查更新失败的问题。增加Gitee API更新检测源。
修复周报页面数据统计左边文字遮挡问题。
修复导航栏被手机自带导航键遮挡的问题。
将“自动关联规则”设置标题改成“标签关联领域规则”
修复了删除全部待办分类后应用异常崩溃的情况。
将档案页面周回顾的布局从2x2改成1x2
修复待办无法关联到新标签，以及无法读取标签修改的问题。
修复选择启动默认页时，下拉菜单无法下滑的问题。
修复月报详情中折线图无法查看的问题。
修复搜索全部、标签关联领域规则设置页面返回时会退会主界面的问题，现在返回会回到总设置页。


新特性：
实现补记中到上尾的连续追溯
日报详情现在可以查看环形图和日程图

测试功能：
增加悬浮窗功能
增加应用半自动计时功能：识别到关联标签的应用时，提醒用户是否开始计时，点击悬浮球开始计时，再次点击停止计时。


---


# 20251222
下面实现半自动计时功能，就是说用户如果打开了关联到特定标签的应用，那么就提醒用户开始计时，并且可以在悬浮球中快速开始，快速结束计时
我想实现的功能如下，请你帮我梳理一下逻辑，然后给出一个完整的方案。
首先我们分成两种情况，一种是当前有计时任务，一种是当前无计时任务
好的，那么当前如果有这个计时任务的时候，就是标签icon、专注时间、应用icon三者轮换（和现在一样），如果用户点击悬浮球就是结束计时。
好的，如果是当前是空闲状态，那么就显示当前应用的图标。空闲状态下点击悬浮球会直接跳到Lumos Time这个应用里面。
但是，空闲状态中，在显示当前应用的图标的时候，我们要进行一个监听的动作，监听的功能就是监听当前应用是否在用户设置里面的应用关联记录中关联到了某一个标签。如果说检测到当前应用关联到了某一个标签，就要在悬浮球当中提醒用户是否开始该标签。UI界面呢你可以第一行写“开始？”，第二行你就显示这个二级标签的名字。确保文字不会超出悬浮球的边框。
如果说用户点击了悬浮球，那么这个时候就等于用户手动开始了这一项记录。就进入专注状态，显示标签icon、专注时间、应用icon三者轮换。当用户再次点击悬浮球的时候，就直接结束任务。用户也可以直接进入 lumostime 结束当前的任务。
结束任务之后，把这一条记录添加到当天的时间轴当中，只是这种由应用关联标签的记录类型你要加上一个备注，备注的内容就是关联应用：小红书，关联应用：淘宝。
添加完记录之后，悬浮球就会重新变成空闲状态。




# 20251220


```
1. 自动开始逻辑 (触发)
当检测到的应用 匹配（Match） 用户设定的“关联标签”规则，且该任务尚未开始时：
动作：自动创建一个新的专注会话（Session）。
反馈：悬浮窗显示“开始计时”提示，随后切换显示为“计时器/Emoji”模式。
2. 自动结束/切换逻辑 (核心策略)
A. 无缝切换 (从专注 A -> 专注 B)
场景：用户从一个已关联的应用，直接跳到另一个也关联了标签的应用（例如从“多邻国”跳到“背单词”）。
处理：立即结算，无缝衔接。
结果：记录 A 正常保存，记录 B 立即开始，视觉上没有任何断层。
B. 进入防抖缓冲 (从专注 A -> 无光环应用/桌面)
场景：用户暂时离开关联应用，去回个微信或到了桌面。
处理：开启 60 秒倒计时（挂起状态）。
状态：应用 A 的计时暂停（逻辑上挂起），但 Session 依然保留。
悬浮窗：不会立即变回图标，保持关注状态（或显示“切换页面”）。
分支判断：
60秒内回来：取消挂起，就像什么都没发生一样继续计时（忽略这段离开）。
超过60秒：判定为“结束专注”。系统自动结算任务 A，结束时间修正为离开应用的那一刻（不计入这 60 秒发呆时间）。悬浮球强制初始化，变回图标。
C. 锁屏中断
场景：用户关闭屏幕。
处理：立即结束。
不进行防抖等待，直接结算当前任务。
4. 悬浮窗的自我修养 (UI层)
专注时：显示时间 / Emoji。
空闲时：显示当前前台应用的图标（由 AppMonitorService 实时推送）。
防呆设计：在任务因为超时自动结束时，增加了 resetToInitialState()机制，强制清空状态并重新加载图标，防止出现“白球”或状态卡死的现象。
```

自动结束的缓冲区不应该算到那个时长里面。自动结束那个缓冲区应该是如果说我继续上一次的那个时间记录，这中间的时间才算，但是如果说我已经通过这个自动缓冲，我已经结束了上一个活动，那么这个缓冲区这一分钟就不应该计算到这里面去了.同样的添加到时间轴里面的那个记录时间也是这样的，也是这个逻辑，你先检查一下是不是这样子

结束之后还是没有办法回到初始状态，就是显示那个空闲的那种状态，就是不能开启进入下一个，然后也没有办法监测到现在当前应用的图标。现在结束了一个计时，自动结束那四个字显示完之后，悬浮球就变成白色的了。

刚才的分类讨论还有一种情况，就是说如果他从一个有关联标签的应用切换到了另一个有关联标签的应用，你就不要再有60秒防抖机制了，就变成直接结束计时添加到对应的这个时间轴上。就是说本来它从一个应用当中切换到另一个应用，它应该是启动这个防抖的60秒计时，那如果说他在60秒的防抖之内就跳到了另一个有关联的其他标签的应用，你就直接结束这个60秒的防抖，直接开始下一个计时，保存上一个，开始下一个。

请你去掉专注时的状态栏变化的相关功能，不要显示在状态栏正在专注的标签和时间了，也去掉设置中的“开启状态栏通知”开关，因为现在开发的应用监测功能与之冲突了，所有之前开发的多余代码都删除。不知道之前有没有改过，反正你查找一下代码吧，把多余的代码给删掉。首先就是那个开启状态栏通知的开关，因为如果说开启了应用自动检测的话，那肯定是要开启状态栏的，所以就不需要这个手动的开关了。其次就是那个状态栏通知上面正在专注的那些功能，就是不要再要了，就会统一到自动检测应用这个功能当中。


现在每一次重新重装软件，悬浮按钮和后台应用监测的按钮都是开启状态，你默认应该是关闭的。
悬浮球中切换页面和开始计时这四个字应该是二乘二排布的，而不是一行字。
整体上这个应用自动记录设置页面的UI现在是黑色的，但我整体应用的风格是白色的，你这风格不符合
去掉那个应用自动记录当中的检测当前应用测试的功能。
在应用自动记录设置页面，点击某个已安装应用，我要为它分配标签的时候，在这个页面，它的标题栏被顶部的状态栏遮挡了。


Data Provided:
- 今日经历: ${timelineText} / ${answersText}

# Core Mechanics
1. **后见之明 (Hindsight)**：用一种怀旧的口吻谈论今天的“烦恼”。告诉现在的自己，这个烦恼在长远的时间河里是多么微不足道，或者是多么关键的转折点。
2. **确认价值**：肯定用户今天做出的某个微小努力，告诉他：“正是因为你那一天的坚持，才有了后来的我。”
3. **极致温柔**：语气像是一个长辈抚摸孩子的头。

# Output Structure
## [写给 ${date} 的我]
(正文：亲爱的，我正在翻看当年的日记。我看到你今天为了...而焦虑。我想告诉你，别担心... 
另外，我特别想谢谢你今天做的这件事... 它比你想象的更重要。)

**Format Rules**:
- 第一人称“我”。
- 语气温暖、怀旧、充满希望。
- 全文 < 350字。
```

5. 🎮 RPG 游戏

```
Role: 你是这个名为“地球Online”的游戏系统的后台管理员。用户是唯一的玩家。

Task: 将用户的【一日数据】转化为【游戏结算画面】。

User Context:
- 玩家职业: ${userInfo}
- 技能树: ${scopesInfo}

Data Provided:
1. 时间统计: ${statsText}
2. 活动时间轴: ${timelineText}
3. 玩家日志: ${answersText}

# Core Mechanics
1. **转化术语**：
   - 工作/学习 -> 【主线任务】或【副本Grinding】
   - 运动/休息 -> 【回血】或【耐力回复】
   - 困难/挫折 -> 【遭遇BOSS】或【Debuff判定】
   - 娱乐/摸鱼 -> 【支线探索】或【随机事件】
2. **属性加点**：根据用户今天的行为，判定他的智力(INT)、体力(VIT)、魅力(CHA)或意志力(WIL)哪里获得了提升。

# Output Structure
## [🛡️ 战斗日志]
(用史诗般的口吻描述今天的主要活动。例如：“玩家成功击败了名为‘季度报告’的精英怪，掉落了大量经验值。” 或 “在‘午后困倦’的Debuff影响下，专注力判定失败。”)

## [✨ 属性结算]
- **获得成就**：(根据今日表现编一个好玩的成就名，如“早起鸟”、“咖啡因战士”)
- **属性变动**：(例如：智力 +5, 精神抗性 +2, 肝度 -10)

## [📜 明日任务预告]
(发布一个新的日常任务，鼓励玩家明天继续上线。)

**Format Rules**:
- 充满游戏感，使用emoji。
- 幽默、热血。
- 全文 < 350字。

```

---
# 20251215

把每个问题左边的竖线改成一个空心圆圈引导的样式，圆圈是灰色的。

日报页面，现在不能通过手机自带的返回键返回上一层。
去年今天功能：
如果说系统检测到去年的今天也有时间记录的话，那么就在导出数据统计的上面，也就是时间线的底部，增加一个按钮，叫做“要看看往年的今天吗？”反正就是增加一个跳转按钮。用户点击这个按钮的话，就可以直接跳转到那一天的时间轴页面。 

---

APP.TsX的页代码当中，关于AI日报叙事生成的那一段代码完全是可以独立出来的。不要在APP.TsX里面。 我们要采用模块化的开发方式，这样后期维护才方便。 

首先，让用户在偏好设置里面设置一个时间点。这个时间点就是生成今日回顾的时间。
如果达到了这个时间，就在时间轴上显示今日回顾的节点；如果没有达到，就不显示。 
注意，节点生成时间只和“今天”有关，也就是历史日期的节点不受时间影响。 

再来改一下“今日回顾”这四个字的显示。
如果当日没有生成回顾的话，那就显示“准备好开始回顾了吗？” 
如果生成了这个回顾的话，就变成“查看2025年几月几日的回顾。” 

在设置页面每日回顾的回顾模板下面，增加一个地方可以填写AI叙事的提示词。首先，您需要将默认的提示词同步到此处。然后，用户点击保存之后，就可以用他们自定义的提示词去替代默认的提示词。 增加一个保存按钮，再增加一个重置按钮就可以了。 


---

现在你在模板管理页面去增加一个开关，就是是否同步到时间轴。 就在这个页面的末尾。
如果说开启的话，那这个卡片就会在时间轴下面显示。  
当然这个同步的UI你自己设计啊，要合适一点。就是要把我们回答的一些问题和答案给它显示在时间轴上面。 
这个开启和关闭是一致的，也就是全局一致的。 
如果说开启了模板1，那所有的时间轴的模板1的问题和答案都是同步显示在时间轴的。
之前我们不是说在时间轴里面显示叙事的前多少个字吗？你就删除那个功能，我们现在只同步引导问题，不同步叙事了。 

现在这个开启和关闭模板的按钮颜色太浅了。如果是开启的话，请将颜色改成这个颜色。：47, 79, 79
--

在标签详情——细节页更改关键字的地方，随机指定的关键字颜色不要包含灰色。 

现在搜索页面的标题栏仍然会被状态栏遮挡。请你检查一下。 

## ai日报
1. 在每天时间轴的下面，导出日报按钮的上面，增加一个按钮“准备好回顾今天了吗？”
样式和下面的导出日报按钮一样，防止在同一个div中。icon+标题。
```
<div class="mt-8 mb-2">
  <button class="flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors text-xs font-medium group">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles group-hover:text-amber-500 transition-colors" aria-hidden="true">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
    <span>准备好回顾今天了吗？</span>
  </button>
</div>

<div class="mt-2">
  <button class="flex items-center gap-2 text-stone-400 hover:text-stone-600 transition-colors text-xs font-medium">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-share" aria-hidden="true"><path d="M12 2v13"></path><path d="m16 6-4-4-4 4"></path><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path></svg>
    <span>导出日报</span>
  </button>
</div>
```

用户点击回顾今天按钮之后，就等于新建了这一天的日报，就不会再受到设置调整的影响了。新建之后，这个按钮就变成：查看2026-12-26的日报。


2. 点击按钮后，进入“每日回顾页”（标题用英文）页面的样式模仿标签详情页。
左上角为返回按钮。然后标题用&符号引出，然后写出今天的日期，比如 &2025-12-16。
“每日回顾页”右上角有删除按钮，点击删除后回退到时间轴页。删除后就等于这一天没有生成日报。
下面是tab导航。分成数据、引导、叙事。
Tab 1: 数据 - 详细逻辑
复制粘贴数据统计页面环形图部分的标签统计、待办统计、领域统计的代码。只是不显示环形图，只显示数据。

Tab 2: 引导 - 详细逻辑
读取用户设置，展现用户所勾选的每日回顾引导模块。
每一模块之间用分割线表示。依次列出问题。
选用与主题风格一致的ui。
该页面有实时保存功能，确保用户中途退出不会丢失数据。

Tab 3: 叙事 - 详细逻辑
首先展示一个“生成”按钮，点击后，
结合用户填写的引导问题，结合今日的数据（可以复用时间轴导出文本+数据统计环形图导出数据文本），发送给ai，让ai生成一篇第一人称的叙述日记。提示词先随便写，后面再调整。
将ai返回结果存储到这一页。
页面底部有重新生成按钮。
页面底部有编辑按钮，用户点击后可进行修改/保存
生成叙事之后，叙事文本在时间轴界面显示。

3. 自定义设置。在设置页中增加一项具体的设置“每日回顾引导”。
用户可以自定义回顾模板，每个模板由标题和几个问题组成。比如：

```
title：情绪感知
今天的高光时刻是什么？
低谷时刻是什么？
能量状态如何？[高能量；中能量；低能量]
```

系统预设一些模板，用户也可以自定义新建模板。
模板中的每一行，为一个问题，在每日回顾-引导页分开呈现。
问答题格式：一个提问框，一个输入框。
选择题格式：一个提问框，下面一行是均分分布的选项，如：
能量状态如何？
[高能量；中能量；低能量]
打分题格式：一个提问框，五个icon，用户可以点击选择打分。（样式参考专注评级打分）例如;
给今天打个分：
[star]（括号内为自定义icon的lucide名称）

```
title：捕捉微光
今天发生的哪件小事让你嘴角上扬？
为什么这件事在今天发生？是因为你的安排，还是幸运的巧合？
此刻如果你要对今天的自己说一声谢谢，你会谢谢自己做了什么？


title：愿景校准
回顾今天的时间记录，哪件事最符合你“理想自我”的身份？
今天是否有行为与你的核心愿望背道而驰？
你感觉到离你的大目标更近了吗？
[靠近了一大步；微小的寸进；原地踏步；暂时后退]
请用现在时态写下一句明天的状态（例如：我很感激明天充满活力...）：


title：极简复盘
Keep：今天做对了什么，值得明天继续保持？
Problem：今天最大的干扰或低效环节在哪里？
Try：明天打算尝试的一个微小改变是什么？
给今天打个分：
[star]

```


```

叙事整理提示词
I want you to act as my daily life coach and reflection partner.
Please include:
•	A gentle and warm tone (not clinical or overly motivational).
•	Emotional as well as practical reflection.
•	5 daily reflection questions covering wins, mood/energy, learning, challenges, and tomorrow’s focus.
•	Keep the reflections concise (200–300 words) but emotionally aware.
•	Always write the diary portion in the first person, as if I’m writing about my own day.
After I answer your questions, produce three sections:
1️⃣ My Daily Reflection (in first person)
2️⃣ Coach’s Notes (insight + 1–3 concrete actions)

你是一位善于通过叙事疗法进行心理抚慰的传记作家。请根据【用户的时间数据】（客观骨架）和【用户的引导问答】（主观血肉），以第一人称写一篇日记。 核心要求：
1. 不要机械地罗列时间表，要寻找时间记录背后的故事线。
2. 必须融入用户在问答中流露的情绪，如果是负面情绪，请用接纳和理解的口吻描述，不要强行正能量。
3. 金句收尾：在日记最后，基于今天的感悟，生成一句简短的箴言。"

# Critical Guidelines (必须遵守的原则)
1. **视角法则**：
   - 始终使用“我”作为主语。
   - 严禁出现“你”、“建议你”、“你应该”等第二人称说教（除非是“我”对自己的轻声反思）。

2. **缝合技巧 (The Weave)**：
   - 不要机械罗列时间表（如“早上做了A，下午做了B”）。
   - 必须寻找“事实”与“感受”的连接点。

3. **情绪处理 (Emotional Holding)**：
   - 如果用户流露负面情绪，请使用“接纳性”语言，进行认知重构。
   - 不要强行转折到正能量（不要说“虽然很累但是很有意义”）。
   - 允许“丧”的存在，赋予“丧”以合理性（如：“今天的疲惫，是身体在提醒我该对自己温柔一点了”）。

4. **风格调性**：
   - 像一部老电影的旁白，或者一篇优美的散文。
   - 细腻、有画面感、有呼吸感。

# Output Structure
请严格按照以下格式输出：

## [今日叙事]
(这里放入生成的日记正文，约 200-300 字)

## [今日微光]
(这里提取一句基于今日感悟的短句箴言，不要是俗套的鸡汤，要是从用户经历中提炼出的哲理，类似俳句或电影台词，20字以内)

```


在叙事这个页面的话，如果没有今天的叙事，就显示两个按钮。

第一个按钮是“新建叙事”。那么这里呢，就让用户自己去填写，生成一个空白文档即可。

第二个选项是“与AI共创叙事”。这样的话，就调用我们刚才的工作流，给AI发送请求，然后AI再返回一些内容。我们就是用户和AI一起写任何一个叙事。

这个按钮的话，您的格式呢就参考下面的这个UI。 

```
<button class="w-full py-4 text-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pen-line" aria-hidden="true"><path d="M13 21h8"></path><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path></svg><span>切换编辑模式</span></button>
```
然后，请你在设置的页面增加一个子页面。这里可以编辑模板，具体参考我之前的需求文档。 

# 20251205
在标签详情页面。删除year和life页面。

记录页面中，addnew不可用，请编写对应的页面。

所有删除键，不要采用浏览器alert，也不需要确认，直接删除即可。

edit task中，删除Linking a task to an activity allows you to track focus time directly for that statistic.这一行字。
选择标签分类的地方，不要采用滑动块，请呈现出所有的分类。

---


请删除刚才添加的addnew功能，将标签管理集中到“标签”这一页面，而不在记录中实现。
标签管理页中，去掉搜索栏。增加管理分类的按钮。点击后跳转到批量管理界面。批量管理界面中，可以直接 修改标签分类和子标签的名字（标签名的第一个字默认为emoji，设置一个识别功能），也可以拖拽快速排布子标签的所属分类，调整标签的顺序。添加修改标签等。
子标签的emoji应该在文字的前面。
标签详情页中，也请显示子标签的emoji。
时间线的前面，增加一个“细节”页面，在这个页面，可以修改标签名、标签背景色等等。


---

导航栏请不要显示文字，只显示icon即可。
时间轴页面，请默认显示最近七天的日期跳转（现在是五天）。
编辑和添加时间记录的页面中，去除选择日期的地方。下面的时间选择，点击后可以手动输入修改数字，而不是出现下拉框。在时间输入的下面，构建一个双端可拉动的条，拉动左边修改起始时间，拉动右边修改结束时间。再下面显示所有标签分类，而不是滑动条（可以参考待办中关联标签的ui）

---

现在标签管理界面，大分类标签是没有emoji的。拖动功能不可用。删除不需要确认。
没有新建大分类和删除大分类的功能。
请添加上移和下移按钮（包括大分类和子标签）

再看标签细节的地方，不需要单列emoji的输入框，直接识别名字的第一个字符。
而且选择背景颜色是不可用的。

---

编辑和添加时间记录的页面中，拖动滑块的单位应当是当前活动的全部时间，也就是说，如果1h的活动，这就是最大了，不能再增加了。
标签详情中，细节的设置没有保存按钮。
管理标签之后，点击done，并没有保存成功。

---

在统计页面中，增加和时间轴一样的日历跳转功能，更额外添加单位设置：日、周、月、年
在时间轴页面，如果当日有记录，则在日历的日期数字下面显示一个小圆点。
点击正在专注的悬浮窗，可以进入专注详情界面，界面设计请参考图片。
专注悬浮窗增加一个取消按钮。
专注悬浮窗请现实标签、待办信息（现在只有标签）
请增加同时进行专注的功能（现在只能有一个专注进程，点击新的，旧的会自动结束）

---
编辑和添加时间记录的页面中，拖动滑块应当是两端都可拖动，现在只有一边可拖动。
编辑和添加时间记录的页面中，web端的时间填写框显示不全，被上下调节按钮遮挡了。
编辑和添加时间记录的页面中，时间填写框请点击即全选数字，让用户重新填写，替代原有数字。
编辑和添加时间记录的页面中，选择了某一个子标签，不要用黑色的圆圈边框框起来，请颜色浅一点，细一点。
请修改本项目网页的名字为：lumostime，并创建一个图标

---
请给标签大分类也添加一个类似子标签的详情页。
标签管理后，日常记录中的分类和标签并没有同步更改。
如果是未记录时间，应当是以当前空白的时间为默认时间，读取到编辑时间记录的页面中。同样应该两端可滑动。（现在只有一端，且不可滑动）

---

统计界面中，添加回到今天的按钮。
统计界面中，添加快速跳转按钮。
day界面点击日期，弹出日历选择（参考时间轴界面）
week界面点击日期，弹出日历选择（参考时间轴界面，只是此时选择一行日期，即一周）
mounth界面点击日期，弹出日历选择（只有年和月）
year界面点击日期，弹出日历选择（只有月）

---

两个同时进行的专注，请把稍微加大上下间距。

专注详情页，不需要标题字段，只需要备注字段。
点击标签，可以选择标签。
标签下面，再增加关联待办页面。
左上角的取消和右上角的确认现在不可用。
请删除左下角和右下角的图片功能。

现在统计页面日历跳转的界面太丑了，你不是在时间轴界面写了一个日历吗？你直接复用就好了。千万不要使用默认的日历组件，太丑了。

---

日常记录和标签页面的数据还是没有关联起来，修改了标签，专注界面仍然保留着原样。
专注详情页面，关联标签没有显示所有的标签，不知道这是什么逻辑？
删除时间轴页面的大标题：2025年12月 time log
然后，将原来导航栏的统计删除，但是页面不要删除。入口改到时间轴页面，在日历选择的右边，增加一个统计按钮，点击就跳转到原来的统计页面。这个统计页面不需要日历跳转，直接读取当前时间轴的日期，生成当日、当周、当月、当年的统计。
现在的日历组件，还不能很好地跳转年份，应当是点击2025.12，就将下面的月历改成可以跳转年的1234………月。

---

只在日常记录页面保留右上角的设置按钮。

在待办清单的右上角添加一个可以管理待办分类的按钮。
去除时间轴页面的时间轴标题。
去除标签页面的tags标题。
所有数字换一个字体，现在看起来太不整齐了。

---

请在待办清单的右上角添加一个管理分类和待办的按钮，具体结构可以参考批量管理标签的页面。然后把刚才加的在work tasks 旁边的按钮删除。

# 20251206
设置页面现在增加数据库同步功能。
---

请你重新写示例数据，标签分类少一点，只包括基础标签即可。按照下面的分类：
```

**💤 睡眠**
- 🛌 睡觉
- 🔋 小憩
**🏠 生活**
- 🚇 通勤
- 🍱 饮食 
- 🧹 家务 
- 🚿 洗护
- 🛒 购物
- 🧾 杂务
**🎓 学习**
- 🏫 上课开会
- 💻 网课自学
- 📖 书籍文献
- 👾 代码编程
- ✒️ 论文写作
🪞 与自己
- 🧠 日记复盘
- 🗂️ 整理收集
- ⚙️ 工具开发
- 🏃 运动健身
🤝 与他人
- 💰 兼职工作
- 🕸️ 社会织网
**🧭 探索世界**
- 🎨 设计
- 🎵 音乐
- 🧶 手工 
- 🖌️ 书法
**🎡 爱欲再生产**
- 🍵 闲聊瞎扯
- 🏄 网上冲浪
- 🍿 看文看剧
- 🎮 玩玩游戏
- 🔮 不可名状 
```


管理待办的页面，不需要显示已经完成的待办。

时间轴页面，日历下方，时间轴右上角，添加按钮，可以切换时间轴的正序、倒序。

统计数据页面，每个标签稍微排列紧凑一点。

待办详情页，请套用标签详情页的ui，展示细节、时间线两个tab。细节中可以修改待办的名字、备注、关联标签。时间线中可以查看热力图、专注记录。

---
现在同步逻辑有误。
对于冲突的处理，应当是用户首次进入应用时，查看云端是否有更新的文件，如果有，自动拉取。（在每次上传数据的时候，并不需要这个逻辑）
在用户关闭应用时，自动进行一次上传。

设置页面，请删除无用的设置项。比如帐户、标签页……也删除getpro字样

两个专注同时进行时，两个悬浮窗的上下距离太近了。

标签详情页的热力图，颜色没有根据专注时间的变化而变化。

---

待办添加进度功能，可以在待办详情-细节中设置是否为进度。如果是进度，可设置进度总数，进度完成单位。在待办条目中显示进度条。
然后在详情中增加一个进度热力图。比如说一本书总共365页，进度单位是50，那么就有8个格子。一门网课30节课，进度单位是1，那么就是30个格子。这个页面显示所有关联到此待办，对进度有增加的专注记录。
然后对于关联到进度待办的专注记录来说，可以设置这一个专注记录增加多少个单位的进度，比如12月5日的阅读记录，关联了读XXX书的待办，读了50页，用户就可以选择增加该待办一个单位的进度。

---

编辑待办页，我要的是和标签详情页一样的页面，这个页面，看清楚！

---

专注记录关联进度任务，编辑增加进度之后，待办详情里面没有更新，请检查逻辑。
编辑专注记录之后，会重复添加到待办详情中的时间线中，请检查逻辑。

---
重写示例数据，要包括专注记录（有的关联到进度待办）、待办等等。
在设置页增加一个重置数据的选项，即可返回默认数据。
检查标签分类、子标签的颜色设置是否完全。
增加可选颜色的备选项。


功能模块 ：“墨水进度格”可视化 (Ink Grid Visualization)
**目标：** 不使用线性的进度条，而是通过一个“网格系统”来可视化任务进度（例如阅读页数）。格子的透明度/深浅代表完成度。

### 2.1 数据模型要求 (Data Model)
每个 `Task`（任务）对象需要包含以下字段：
* `total_goal` (Number): 任务的总目标量（例如：365 页）。
* `unit_size` (Number): 一个完整的格子代表多少量（例如：50 页/格）。
* `current_value` (Number): 当前累计的进度总和（例如：88 页）。

### 2.2 渲染逻辑算法 (Rendering Algorithm)
请按照以下步骤计算并渲染网格：

1.  **计算总格数 (Grid Capacity):**
    `total_tiles = Math.ceil(total_goal / unit_size)`
    * *示例：* 365 / 50 = 7.3 -> **8 个格子**。

2.  **确定每个格子的状态 (Index `i` 从 0 到 `total_tiles - 1`):**

    * **情况 A：已完成的格子 (Completed)**
        * 判断条件：`current_value >= (i + 1) * unit_size`
        * 视觉效果：**实心深色 (100% 不透明度)**。像浓重的墨块。

    * **情况 B：进行中的格子 (Active / Watercolor Effect)**
        * 判断条件：当前进度落在这个格子的范围内。
        * 逻辑计算：计算该格子内部的填充百分比。
            `remainder = current_value % unit_size`
            `opacity = remainder / unit_size`
        * **视觉修正：** 为了防止进度太小（如 1%）导致几乎看不见，需要设置一个“最低可见度”。
            `final_opacity = Math.max(0.15, opacity)` (确保至少有 15% 的淡色水痕)。
        * 视觉效果：**半透明色**。像被水稀释的水彩晕染效果。

    * **情况 C：未开始的格子 (Empty)**
        * 判断条件：`current_value < i * unit_size`
        * 视觉效果：**仅描边 (Outline)**。无填充（或极淡的纸张底色）。

   ### 2.3 视觉规范 (Tailwind CSS 参考)
* **容器：** `grid grid-cols-5 gap-2` (根据屏幕宽度自适应列数)。
* **格子形状：** `rounded-md` (圆角矩形，像一张邮票)。
* **配色方案 (莫兰迪绿主题):**
    * 实心 (Solid): `bg-[#2F4F4F]` (深岩灰/墨绿)
    * 进行中 (Active): `bg-[#2F4F4F]` 并通过内联样式设置 `style={{ opacity: calculated_opacity }}`
    * 空 (Empty): `border border-gray-300 bg-transparent`     


在专注记录修改时间的地方，如果是手动键入数字，是没有最大时间的，只要拖动滑块有最大时间的限制。

---

我想要增加一个用ai实现批量补记的功能，大约是用户输入一段话，ai识别出其中的开始时间、结束时间、关联标签、关联待办等内容，然后给出一个结构化的文本，此时用户检查这个文本有无错误，可以修改。最后程序根据这个结构化的文本，批量添加数据。

这个功能需要ai，所以要在设置页面增加一个配置ai的页面，要支持gemini，deepseek，硅基流动……

请告诉我怎么写清楚这个需求文档。


---
增加专注度打分？
生成时间开销的ai报告？


# 📄 LumosTime 功能需求文档：AI 智能批量补录 (AI Batch Backfill)

## 1\. 需求背景与目标

  * **背景**：用户在忙碌时可能忘记实时点击开始/结束，事后往往需要补录一整天或半天的时间段。目前的手动拖拽补录效率较低。
  * **目标**：利用 LLM（大语言模型）强大的自然语言理解能力，将用户的非结构化口语描述转化为结构化的时间记录数据，经用户确认后批量写入数据库。
  * **核心价值**：极大降低补录门槛，提升数据完整性。

## 2\. 用户流程图 (User Flow)

1.  **配置**：设置页面 -\> AI 设置 -\> 填写 API Key & Base URL -\> 选择模型。
2.  **入口**：时间轴页/首页 -\> 点击“AI 补录”按钮（魔法棒图标）。
3.  **输入**：在弹窗中输入自然语言（例：“昨天上午9点到11点写代码，然后吃饭一小时，下午2点开始开了个组会”）。
4.  **解析**：点击“识别生成”，系统调用 LLM 接口。
5.  **校验**：界面展示解析后的结构化卡片列表（时间、活动、标签），用户可修改、删除或新增。
6.  **入库**：点击“确认归档”，系统批量创建 TimeEntry。

## 3\. 功能模块详述

### 3.1 模块一：AI 服务配置 (Settings - AI Service)

为了兼容 DeepSeek、硅基流动（SiliconFlow）、Gemini 等不同厂商，建议采用\*\*“标准 OpenAI 接口兼容”\*\*的设计模式。

  * **UI 需求**：
      * 新增 `/settings/ai` 路由。
      * **Provider 选择器**：
          * Google Gemini (使用 Google GenAI SDK)
          * OpenAI Compatible (用于 DeepSeek, 硅基流动, Moonshot 等)
      * **配置字段**：
          * `API Key` (加密存储，显示为 `sk-******`)
          * `Base URL` (OpenAI 模式必填，例如 `https://api.siliconflow.cn/v1`)
          * `Model Name` (自定义输入，如 `deepseek-ai/deepseek-v3`, `gemini-1.5-flash`)
      * **连通性测试按钮**：点击发送一个简单的 "Hello" 请求，验证配置是否有效。

### 3.2 模块二：智能补录弹窗 (The Magic Modal)

#### A. 输入区 (Input Area)

  * 大文本框，支持多行输入。
  * 提供**快捷指令/占位符提示**：
      * *“支持相对时间：‘昨天’、‘刚刚’、‘两小时前’...”*
      * *“支持时长描述：‘看书 45 分钟’...”*

#### B. 预处理逻辑 (Context Injection) - *关键点*

为了让 AI 准确分类，在发送 Prompt 时，系统必须**静默注入**以下上下文信息：

1.  **当前系统时间**：用于计算“昨天”、“周一”的具体日期。
2.  **现有标签列表 (Tags)**：格式化为 `Category -> Tag` 的树状结构，让 AI 尽可能匹配现有标签，而不是生造词。
3.  **活跃待办事项 (Active Todos)**：(可选) 仅提供标题，用于自动关联。

#### C. 输出校验区 (Review & Edit UI)

  * **展示形态**：不要直接显示 JSON。渲染为一个**可编辑的列表/表格**。
  * **单条记录包含字段**：
      * `开始时间` (YYYY-MM-DD HH:mm) - *必填，支持点击修改*
      * `结束时间` (YYYY-MM-DD HH:mm) - *必填，支持点击修改*
      * `活动描述` (Text) - 即备注）
      * `标签/分类` (Select) -一定是已有的标签 （必填）
      * `关联待办` (Select/Search) - 一定是已有的待办（没解析出就留空）
  * **错误提示**：如果 AI 解析出的时间有逻辑错误（如结束时间早于开始时间），标红提示。

## 4\. 数据结构与接口定义

### 4.1 Prompt 设计 (System Prompt)

这是一个结构化输出任务，建议强制要求 AI 返回 JSON 格式。

```markdown
Role: 你是一个专业的时间管理助手。
Task: 根据用户的自然语言描述，提取时间记录信息。

Context:
- 当前时间: {current_timestamp}
- 现有标签列表: {tag_list_json}
- 现有待办列表: {todo_list_json}

Requirements:
1. 识别开始时间、结束时间。如果是相对时间（如“昨天”），根据当前时间推算具体的 ISO 8601 日期。
2. 如果用户只说了持续时间（如“玩了2小时”），根据上下文推断或基于上一条记录的结束时间顺延。
3. 尽可能将活动匹配到提供的【现有标签列表】中。
4. 返回格式必须为纯 JSON Array，不要包含 Markdown 标记。

JSON Output Schema:
[
  {
    "startTime": "ISO String",
    "endTime": "ISO String",
    "description": "String",
    "category": "String (Top Level)",
    "tag": "String (Sub Level)",
    "suggestedTodoId": "String (Optional, if match found)"
  }
]
```

### 4.2 API 交互层 (Service Layer)

在 `src/services/ai.ts` 中封装统一接口：

```typescript
interface AIConfig {
  provider: 'gemini' | 'openai_compatible';
  apiKey: string;
  baseUrl?: string;
  modelName: string;
}

interface ParsedTimeEntry {
  startTime: string; // ISO
  endTime: string;   // ISO
  content: string;
  tags: string[];    // [Category, Tag]
}

// 核心方法
async function parseNaturalLanguage(
  text: string, 
  context: { now: Date, availableTags: Tag[] }
): Promise<ParsedTimeEntry[]> {
  // 根据 provider 切换调用逻辑 (Gemini SDK vs Fetch OpenAI API)
  // 处理 JSON 提取和错误兜底
}
```

## 5\. 异常处理 (Edge Cases)

1.  **JSON 格式错误**：
      * *处理*：使用 DeepSeek 或 Gemini 时，偶尔会包含 ` ```json ` 包裹。前端解析前需利用正则清洗字符串，提取 `{...}` 或 `[...]` 内容。
2.  **时间冲突**：
      * *处理*：如果识别出的时间段与数据库中已有的记录重叠，在校验区显示黄色警告，询问用户是“覆盖”还是“并存”。
3.  **跨日问题**：
      * *处理*：用户输入“昨晚11点玩到凌晨1点”，需正确拆分为两天的记录。

示例prompt：
下午三点到五点，阅读资本论。五点半吃饭一个小时。七点到八点玩游戏。

# 增加专注度记录功能
数据层：
```
// 原有的 TimeEntry 接口
export interface TimeEntry {
  id: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  description: string;
  tags: string[];
  
  // --- 新增字段 ---
  /**
   * 专注度/精力值评分
   * 范围: 1-5 (1: 涣散, 3: 正常, 5: 心流)
   */
  focusScore?: 1 | 2 | 3 | 4 | 5; 
}
```

交互层：
标签详情-细节页。增加是否开启专注评分的选项。默认继承父级设置，但允许子标签单独覆盖（Override）。ui参考待办页是开启进度记录。
如果开启，标签详情增加专注统计页（在关联待办的右边）。
默认显示一周数据。可以切换周/月。可以向前向后切换第几周、第几月。
此标签页展示堆积图。纵轴是累计时间，横轴是日期。以深浅不同的堆积颜色表示专注度。
堆积图下面显示折线图，折线图（Line Chart），显示“平均专注度”的走势。

正在专注页、专注详情页。（如果关联至开启专注评分的专注记录）增加专注度评分ui。
核心交互：5 个墨绿色的圆点或“能量块”。默认未选中。用户可以点击着色1-5个能量块。默认值应为 null 或 undefined。

时间轴页面（所有有时间线的页面）对单个关联至开启专注评分的专注记录，在标题后方显示数字+图标，例如 ⚡️4 或 💧5。

统计分析页面，如果某标签有专注度属性，在标签名后加上平均专注度，用数字+图标显示。

# AI分析洞察功能（暂缓）

设置页面，可以自定义洞察prompt（用户可以修改预设）

统计分析页（日、周、月）最末尾，增加AI洞察按钮。点击开启洞察，使用ai读取当页时间记录，生成洞察报告。生成后将条目保存到统计分析页最下方。
传送给ai的数据类似于
```
{
  "period": "2025-10-01 to 2025-10-07",
  "total_hours": 42.5,
  "tags": [
    {"name": "Research/训诂学", "hours": 15, "avg_focus": 4.2},
    {"name": "Life/琐事", "hours": 8, "avg_focus": null}
  ],
  "todos": [
    {"name": "study/读资本论", "hours": 15, "avg_focus": 4.2},
    {"name": "毕业论文/文献综述", "hours": 8, "avg_focus": null}
  ]
  "records": [
    {
      "id": "entry_001",
      "startTime": "2025-12-01T09:00:00",
      "endTime": "2025-12-01T11:30:00",
      "durationMinutes": 150,
      "tag": "学术研究/文献阅读",
      "todo": "毕业论文/文献综述",
      "description": "阅读《广韵》声类考证相关论文，做笔记",
      "focusScore": 5,
      "note": "状态极佳，完全进入心流，手机静音了"
    },
    {
      "id": "entry_002",
      "startTime": "2025-12-01T14:00:00",
      "endTime": "2025-12-01T15:30:00",
      "durationMinutes": 90,
      "tag": "生活/杂务",
      "todo": "",
      "description": "处理课题组财务报销单据，填表",
      "focusScore": 1,
      "note": "系统太卡了，非常烦躁，中间刷了两次朋友圈"
    }
  ]
}
```

不要渲染成一大段纯文本。使用 React Markdown 组件。

专注热力图日历不能点击，不聚焦到今天。点击叉按钮后，日历不会收缩（但保留叉按钮，用来在切换月份时快速返回月历。
任务详情时间线，记录仍然没有专注图标+数字
 
# 快速复制功能 当日时间轴文本化导出 (Daily Timeline to Text)
入口：时间轴页 (Timeline) -> 时间轴拉到最底下，左下角-> “导出/分享”图标。
点击 (Click)：直接将默认格式的文本复制到系统剪贴板，并提示 "已复制到剪贴板"。
示例导出文本如下
```
## 📅 2025-12-07 周日时间记录
**总专注时长**: 8h 15m | **平均专注**: 4.2

- 09:00 - 10:30 (90m) **[学术/文献]** 广韵声母考证 ⚡️5 @文献综述撰写 +3（23/100）
- 10:45 - 11:45 (60m) **[工作/开发]** LumosTime 需求撰写 ⚡️4
- 4:00 - 16:00 (120m) **[杂务行政]** 报销填表 ⚡️1 (状态不佳)
```
在设置中增加一个清空数据按钮。删除所有专注记录和待办事项。


# 20251207
```
📄 LumosTime 功能需求文档：Scope (领域) 维度
1. 核心概念与目标 (Concept & Goals)
1.1 背景
当前系统仅依赖 Tag（标签）来分类时间。这导致用户在不同项目中执行相同动作（如“阅读”）时，必须创建冗余标签（如“语言学阅读”、“代码文档阅读”），造成统计维度混淆。

1.2 目标
引入 Scope (领域) 维度，构建矩阵式时间管理模型。

Tag (动作)：回答 "What am I doing?" (Verb) —— 例：阅读、编程、写作。

Scope (领域)：回答 "What is this for?" (Context/Domain) —— 例：计算语言学、Lumos开发、生活。

1.3 命名规范
中文名：领域

英文变量/UI：Scope

数据实体：Scope

2. 数据结构设计 (Schema Design)
在 src/types.ts 中进行扩展。Scope 与 Tag 是平级关系，不存在父子嵌套。

TypeScript

// 1. 新增 Scope 实体
export interface Scope {
  id: string;
  name: string;          // e.g., "计算语言学"
  description?: string;  // 简短描述
  isArchived: boolean;   // 归档状态
  order: number;         // 排序权重
}

// 2. 更新 Todo (待办)
export interface Todo {
  id: string;
  title: string;
  // ...原有字段
  
  // 关联配置 (Pre-configuration)
  // 当开始此待办时，自动填入以下信息：
  defaultScopeId?: string;  // 默认领域 (e.g., Lumos开发) -- NEW
}

// 3. 更新 TimeEntry (时间记录)
export interface TimeEntry {
  id: string;
  // ...原有字段
  
  tagId: string;       // 必填：动作 (Verb)
  scopeId?: string;    // 选填：领域 (Context) -- NEW
  
  // 注意：Scope 是独立的，不依赖 Tag 的 Category
}

3. 交互流程 (User Experience)
3.1 领域管理 (Scope)
位置：导航栏 -> 领域管理 (Scope)。【在tags右边新增】
以卡片式布局排列。每个卡片展示信息：当月投入/总投入。
点击卡片后可进入领域详情。右上角有管理领域按钮。
管理领域页面，参考标签批量管理页，可以新建、编辑、排序、归档

领域详情模仿待办详情和标签详情的ui。
第一个tab为细节。可以编辑领域各项属性。名称（包括icon）、颜色、描述、是否开启专注度评分。
第二个tab为时间线。展示热力图、所有与之相关的专注记录。
第三个tab为关联待办。
第四个tab（如果开启了专注度评分），显示专注统计。（热力图和堆积图）
第五个tab：交叉分析。
交叉分析 (Matrix / Sankey)
核心问题：“我在做‘语言学’这个领域时，主要是在干什么？”
结果示例：阅读 (60%)、写作 (20%)、数据清洗 (20%)。

（标签详情页，同样新建一个tab，为交叉分析）
去掉交叉分析的标题，直接展示图表。
领域详情内，交叉分析页参考统计分析页的标签统计分析，列出一级、二级标签，每个标签的颜色要与标签的颜色一致，色值完全对应。（图1参考图2）

标签详情内，交叉分析页参考统计分析页的标签统计分析，只不过只有一级领域。每个领域的颜色要与领域颜色一致，色值完全对应。（图3参考图2）

正在专注页，ASSOCIATED TODO下选择无，不需要斜杠圈圈的icon。

3.2 记录时间 (Tracking Interaction)
这是体现“正交性”的核心界面。

A. 正在专注页
关联标签下新增关联领域按钮，ui模仿关联标签分类，默认可不选（即选择无）。

B. 从待办开始 (Start from Todo)
当用户点击待办事项的“开始”按钮：

系统读取该 Todo 预设的 defaultScopeId。
待办详情-细节页，增加关联领域选择。ui模仿关联标签分类。默认可不选（即选择无）。

然后用户可以点击悬浮窗。可以进入正在专注页。

3.3 补录与编辑 (Manual Entry)
✓关联标签下新增关联领域按钮，ui模仿关联标签分类，默认可不选（即选择无）。

4. 示例数据 调整
5. 时间线视图条目优化。
✓所有时间线（时间轴、标签\分类\待办\领域详情页内的时间线）中带有关联领域信息的条目，都显示其关联领域（模仿关联标签、关联待办的ui，位置在关联标签的下面），用符号“%”引导icon+领域标题。
时间轴文本导出功能，增加领域信息。

补充
1. 专注记录关联领域、待办关联领域都是可以选择多个领域的
除了更改数据结构外，前端交互页：正在专注页/修改专注页/待办详情页等可以关联领域的地方，都要设置成可以多选的胶囊（不要更改原来的ui，只更改是否可多选及数据传递的逻辑）


2. 新增目标版块（属于领域下辖模块）
【数据层】
新增 Goal 实体。注意，Goal 是挂载在 Scope 之上的。

TypeScript

export interface Goal {
  id: string;
  title: string;        // e.g., "Q1 广韵文献攻坚"
  
  // 🔗 关联逻辑
  scopeId: string;      // 必填：隶属于哪个领域 (e.g., 🚩 专业输入)
  filterTags?: string[]; // 选填：仅计算该领域下特定动作 (e.g., 仅计算 [阅读] 标签)
  
  // 📅 时间维度 (Time-bound)
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD
  
  // 🎯 核心指标 (Metrics)（参考目标类型）
  metric: 
    | 'duration_raw'      // 原始时长 
    | 'task_count'        // 待办数量 
    | 'duration_weighted' // 有效时长 (专注度加权) 
    | 'frequency_days'    // 活跃天数 
    | 'duration_limit';   // 时长上限 (反向) 
  // 状态
  status: 'active' | 'completed' | 'failed' | 'archived';
  
  // 📝 奖励/备注 (Gamification)
  motivation?: string;  // e.g., "完成奖励自己一套新香具"
}

五种目标类型分别为：
1. 投入型目标 (Duration Goal) 在 [startDate, endDate] 期间，累计投入的时间达到某一阈值即完成目标。（计算关联专注记录的时长）
2. 任务型目标 (Task Goal) 在 [startDate, endDate] 期间，完成的待办数量达到某一阈值即完成目标。（计算关联专注待办的个数）
3. 强度目标：有效时长 (Effective/Deep Hours) 
$$Progress = \sum (Duration \times \frac{FocusScore}{5})$$
在[startDate, endDate] 期间加入专注度指标的加权有效时长达到某一阈值，即完成目标。
4. 活跃天数目标：在 [startDate, endDate] 期间，有活动记录的天数达到某一阈值即完成目标。（计算关联专注记录的天数）
5. 熔断目标：限额/戒律 (Ceiling/Limit)：在 [startDate, endDate] 期间，投入时长不超过某一阈值即完成目标。这个进度条用暗红色表示。其他的都用墨绿色。

【交互层】
一、目标设置页
领域详情页-新增“目标”tab-新建目标-生成新的目标卡片。
目标卡片右上角有编辑、删除按钮。
点击编辑，设置目标起止时间（八位数字日期，不设下拉框）、目标类型、目标阈值（动态设置说明文字，引导用户设置阈值）
编辑完成后，卡片显示进度条完成进度。

二、领域页面
如果领域下有目标，在领域条目的下方，紧接着显示目标的名称和进度（在一张卡片内，不要分隔。如果有多个目标，就显示多个）

【特殊场景】
中途修改目标：允许用户修改 targetValue。逻辑：如果把目标从 100h 改为 80h，进度百分比需实时重算。
目标重叠：允许一个 Scope 有多个目标（例如既有“年度目标”也有“月度目标”）。在计算时，同一条 TimeEntry 会同时为这两个目标贡献进度。



✓3. 预设领域重置：
🚩 专业输入（操千曲而后晓声，观千剑而后识器。）（绿色）
🏛️ 博士课题（修辞立其诚，所以居业也。）（蓝色）
🦉 博雅通识（风檐展书读，古道照颜色。）（橙色）
⚡️ AI玩具（满眼生机转化钧，天工人巧日争新。）（粉色）


✓4. 重写示例数据。新增更多示例数据，要跨月份，有多种属性（专注度、关联领域、关联待办等）丰富一些，展示软件使用效果。

✓5. 领域详情页/分类/标签详情页，把关联待办和交叉分析合并成一个tab“关联”，用两个卡片在一个tab中呈现现有的信息。（无论是否有关联待办，都要呈现这一个卡片）

~6. 专注悬浮窗，关联到领域的专注要在悬浮窗中显示关联领域%+icon+领域名称，ui和关联待办一样，显示不全可使用省略号。~
✓todo页，关联到领域的待办要在条目卡片中有体现，用%引导领域icon+标题。ui和关联标签一样，显示完整icon。

✓7. 正在专注页，DEFAULT SCOPE改成：ASSOCIATED SCOPE。
下面的待选择SCOPE，模仿待选择ASSOCIATED TODO标签的格式，一行四个，一个格子内呈现一个领域icon+名称，太长用省略号。（修改专注详情页同步修改）


```



Q: 我修改了 React 代码，怎么更新 APK？ 每次修改完前端代码后，请按以下顺序操作（无需重新打包 APK，除非你添加了新的原生插件）：

npm run build (重新生成 dist)
npx cap sync (将新的 dist 同步到 android 目录)
在 Android Studio 中点击绿色的 Run ▶️ 按钮（如果是真机调试），或者重新 Build APK。

# 20251208 

任务页面，可以切换两种布局方式（切换按钮在左下角收起展开边栏的上面）
松散模式就是现在这个样子，唯一不同的是关联领域显示完整的icon+领域名。
紧凑模式只显示关联标签和关联领域的icon，不显示完整名称。而且不显示待办的详情。去除ui中的卡片设置，每个任务尽量只占一行。每个任务之间只用分隔线区分，不要加边框。

分类详情和领域详情中关联待办的地方，待办应该按照完成状态排序。未完成的在前面，完成的在后面。已完成任务应当显示完成于哪一天。标题、完成时间、专注时长在一行显示，如果显示不下，就自适应省略标题文字。

搜索功能
自动关联
在设置页面增加“自动关联”功能。用户开始某一标签计时时，可以默认关联到某一领域。可以自定义规则。

## 目标高级筛选功能
1. 需求背景 (Context)
现状：目前目标（Goal）仅与领域（Scope）绑定。

痛点（颗粒度问题）：Scope 的范围往往涵盖多种性质的活动。

例：🧘 身心安顿 领域包含了“高强度运动（跑步）”和“静止休息（冥想）”。

若用户设立一个“运动 100 小时”的目标，系统会将“冥想”时间也误算在内，导致数据虚高/失效。

目标：在 Goal 实体中引入**“组合式过滤器 (Composite Filters)”**，允许用户通过标签、待办、属性等多个维度，精确定义“什么才算达成目标”。

2. 筛选维度定义 (Filter Dimensions)
如果是**“数个数”**（完成待办），数据源是 Todo 表，那只能用待办的属性筛选。

如果是**“算时间/天数”**（投入精力），数据源是 TimeEntry 表，那就要用记录的属性（包含关联的待办）筛选。

模式,适用指标,核心数据源,可用的筛选维度
A. 待办模式,待办个数 (Count),Todo 表,仅限 待办分类 (Todo Category)
B. 记录模式,时长 (Duration)天数 (Days)有效时长 (Focus),TimeEntry 表,标签 (Tag)待办来源 (Todo Source)

2. 模式 A：待办模式 (Task Mode)
场景：我想统计我完成了多少个任务。 逻辑：只关心结果，不关心过程（花了多少时间）。

2.1 筛选逻辑
唯一筛选器：待办清单/分类 (Todo Category)

用户故事：

“我要统计‘博士论文’这个清单里，完成了多少个任务。”

“我要统计‘生活杂务’清单里，勾掉了多少项。”

3. 模式 B：记录模式 (Record Mode)
场景：我想统计我投入了多少时间，或者坚持了多少天。 逻辑：关心过程。数据来源于每一次的时间记录 TimeEntry。
标签筛选 (Tag Filter)：限定动作。

“只统计 [跑步] 的时间。”

“统计所有时间，除了 [睡觉]。”

4. 交互流程设计 (UI Interaction)
界面应当根据用户的选择动态变化，不要把所有选项一股脑展示出来。

步骤 1：定性 (设置指标)
用户选择：🎯 目标类型

🔘 完成待办数量 ---> 进入流程 A

🔘 投入时长 / 打卡天数 ---> 进入流程 B

步骤 2：定量 (设置筛选)
流程 A (选了待办数量)
界面显示：胶囊式选择清单

文案：限定待办清单 (可选)

（此处不显示标签筛选，因为标签属于时间记录，跟待办本身没关系）

流程 B (选了时长/天数)
界面显示：两个折叠面板。

限定动作 (Tags)

包含标签... 
（包括一级分类和二级分类）（可多选）（胶囊点选模式）

## 搜索功能
入口：设置→搜索全部
交互层：
一个搜索框，可选择搜索类型：全部/部分（默认为全部）
如果用户点击按钮切换到部分，下面出现选择框:
记录/分类/标签/待办/领域（用可多选的胶囊点选模式）
点击搜索后，列出所有匹配条目。
点击条目，可跳转到对应的详情页

## 同步逻辑
当前客户端应用的最后一次数据修改的时间，为本地版本时间。
以本地版本时间对比云端版本时间，如果本地更新，以本地覆盖云端，否则，以云端覆盖本地。
请确认以上逻辑是否正确。现在的问题是每一次点击同步，都是上传本地数据，而不能拉取云端数据。




请确认点击加号添加补记时，默认结束时间的逻辑。如果是以前的日期，那么补记结束时间是23：59。如果是今天，补记结束时间应该是现在的时间。

补记的时候，老是出现bug，1是输入时间数字时，数字会异常跳跃，而不是清空输入框之后等待用户输入。二是老是会出现超过24小时的记录，不知道后台是怎么运算的，经常写着写着，时间就超过24小时了，比如 九点到十点的记录，系统可能却读取了跨天的九点和第二天的十点。

# 20251210
记住时间轴排序状态，切换到其他tab或退出应用之后，仍然保持用户选择的状态

数据统计页面中，增加一种类型的图，横向是周，纵向是各种标签，矩阵中是散点，有活动有颜色，没活动灰色。类似于图中的情况，但是不打勾。
之前的饼图合一，日周月年切换的按钮做到页面内。

标签/分类/待办/领域管理等页面增加页面最末尾空白，因为手机输入法会挡住输入框

只是改成备注文字→自动关联标签。如果有

## 关键字功能
1. 在二级标签（活动）中增加关键字功能。体现为在标签详情页中，细节tab中，可以添加关键字。可添加多个。系统自动为每个关键字分配颜色（淡色系，系统中已经设置的）。
关键字的胶囊ui参考以下代码，只是在每个胶囊的右侧添加一个小叉，用于删除关键字。
```
<button class="
                            px-2 py-2 rounded-lg text-[10px] font-medium text-center border transition-colors flex items-center justify-center gap-1.5 truncate
                            bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100
                        "><span>🎓</span><span class="truncate">论文进度</span></button>
```

2. 有关键字的标签（activity），新增一个“关键字”tab。
首先显示日历（复用时间线/专注中的日历），热力图的颜色由每天时间记录所对应的关键字决定。
- 如果当日无activity记录，不着色。
- 如果当日有activity记录，无关键字匹配，着灰色。
- 如果当日有一个匹配关键字的activity记录，着对应关键字的颜色。
- 如果当日有n个匹配关键字的记录，将当日的格子横向地分成n份，每份着对应关键字的颜色。

热力图下面，
以（细tab中设置的）关键字为分组。关键字关联的记录从专注记录备注中寻找。如果匹配到，则记录为该关键字中一个条目。每一组关键字，首先呈现关键字（在这个月）的所有条目的时间、总个数。点击按钮后，以列表形式呈现关键字条目。列表形式参考下面代码，只是把待办改成专注记录。
```
<div class="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm"><h3 class="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Associated Todos</h3><div class="space-y-0 text-sm"><div class="group flex items-center gap-3 py-2 border-b border-stone-100 last:border-0 hover:bg-stone-50 md:-mx-2 md:px-2 transition-colors cursor-pointer"><div class="w-4 h-4 shrink-0 rounded-[4px] border-2 flex items-center justify-center transition-colors border-stone-300 group-hover:border-stone-400"></div><span class="flex-1 font-medium truncate min-w-0 text-stone-700">Can Unconfident LLM Annotations Be Used for Confident Conclusions?</span></div><div class="group flex items-center gap-3 py-2 border-b border-stone-100 last:border-0 hover:bg-stone-50 md:-mx-2 md:px-2 transition-colors cursor-pointer"><div class="w-4 h-4 shrink-0 rounded-[4px] border-2 flex items-center justify-center transition-colors border-stone-300 group-hover:border-stone-400"></div><span class="flex-1 font-medium truncate min-w-0 text-stone-700">Beyond Tokens in Language Models: Interpreting Activations through Text Genre Chunks</span></div><div class="group flex items-center gap-3 py-2 border-b border-stone-100 last:border-0 hover:bg-stone-50 md:-mx-2 md:px-2 transition-colors cursor-pointer"><div class="w-4 h-4 shrink-0 rounded-[4px] border-2 flex items-center justify-center transition-colors border-stone-300 group-hover:border-stone-400"></div><span class="flex-1 font-medium truncate min-w-0 text-stone-700">Information-Theoretic Generative Clustering of Documents</span></div><div class="group flex items-center gap-3 py-2 border-b border-stone-100 last:border-0 hover:bg-stone-50 md:-mx-2 md:px-2 transition-colors cursor-pointer"><div class="w-4 h-4 shrink-0 rounded-[4px] border-2 flex items-center justify-center transition-colors border-stone-300 group-hover:border-stone-400"></div><span class="flex-1 font-medium truncate min-w-0 text-stone-700">渐构</span><span class="text-xs text-stone-300 font-serif whitespace-nowrap shrink-0">共 41m</span></div></div></div>

```

3. 手动补记页面，监听备注输入栏，当用户在备注中输入关键字时，提醒用户是否快速关联到对应标签（activity）.关联提醒的样式参考以下代码。标题为：是否关联到以下标签？
如果用户点击确认，则在页面上面的标签（activity）选择处，自动选择。
关联提醒的div位置在备注框的上方，在关联领域选择的下方。

```
<div class="p-3 bg-purple-50 border border-purple-100 rounded-xl animate-in slide-in-from-top-2"><div class="flex items-start gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lightbulb text-purple-600 mt-0.5 flex-shrink-0" aria-hidden="true"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path><path d="M9 18h6"></path><path d="M10 22h4"></path></svg><div class="flex-1"><p class="text-xs font-bold text-purple-900 mb-2">是否关联到以下领域？</p><div class="flex flex-wrap gap-2"><button class="flex items-center gap-1 px-2 py-1 bg-white border border-purple-200 rounded-lg text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors active:scale-95"><span>🥦</span><span>健康生活</span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-check" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg></button></div></div></div></div>
```

将手动补记中的开始时间输入下方的“到现在”，改成“到上尾”快速定位到上一条记录的结束时间。


在数据统计页面-饼状图的标签分布饼状图和分布时长统计图的下面，紧接着增加：待办专注时长分布统计图。以所有对应时间段内（根据用户所选择的日、周、月、年，与标签分布统计饼图保持一致）关联到待办的专注记录为整体，统计不同关联待办时长的分布。
饼图的样式保持和上方的标签分布饼状图和分布时长统计图保持一致，直接复制代码不要改。下面的分布时长统计，显示二级结构：待办分类+具体待办。

用户点击手动补记按钮的加号时，弹出的专注详情页面请，自动下移，将光标定位到备注框内，方便用户输入。