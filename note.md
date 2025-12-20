

npm run build
npx cap sync
npx cap open android

npm run build
npx cap sync
npm run electron:build

npm run dev

git reset --hard 0cee3fbf54840700dd4c8f62bdb97acebe8253f4
git push --force



发布新版本时：
先更新 package.json 和 updateService.ts 中的版本号
构建新的 APK
创建 GitHub Release 并上传 APK 
再更新 version.json 的版本号

# v1.0.4
修复重置和清除数据时个人信息未清除的问题
修复周回顾详情页面的日历双滚动条问题。修复周度回顾数据标签页视图切换按钮被遮挡问题。将标签导航栏的下边距从 mb-8 (32px) 改为 mb-3 (12px)。
修复回顾阅读模式文本换行问题
修复手机端检查更新失败的问题。增加Gitee API更新检测源。
增加专注时的状态栏常驻
增加悬浮窗功能



# 20251220

第 5 步：最后合体 (Integration)
把“巡逻”发现的结果，和“数据库”里的关联对上号，然后触发计时。

给 AI 的指令：
现在把最后一步逻辑串起来：
在后台服务的轮询中，当检测到当前应用变化时，去第 3 步保存的数据库里查一下。
如果当前打开的应用（如抖音）有关联的 Task：
立即自动启动该 Task 的计时。
首先界面中要有悬浮计时页面要开始。
其次状态栏的状态要更新，变成已经开始计时的状态。
最后全局的“悬浮球”要开始计时。

如果用户回到了桌面或者打开了未关联的应用：
自动暂停计时。
停止应用中的悬浮计时。
状态栏停止计时。
悬浮球回到静默状态。




# 20251219
ai补记的提示词中，要求ai保留用户输入备注文本的所有细节，不要删减。


# 20251218

假如关联到的领域有专注度的属性，那么在正在专注页和补记专注页也应该显示专注度评分。
在脉络和索引这一页，导航栏的颜色变成250, 249, 246

已经生成的日报、周报、月报就不受到回顾模板更改的影响了。 也就是说，我今天变化了应用回顾模板，应用A模板，应用B模板，但是我昨天应用的是C模板。我今天应用了这个模板之后，昨天的周报还是C模板，它不会变成A模板和B模板，你懂吗？因为它存储之后，新建之后就是一个文本了，它就不会动态变化了。 不管是我改了问题，还是改了问题的个数，还是改了模板的方式，任何东西也好，就是不会影响历史记录了。 

首先，如果我新建了日回顾，那么这一个回顾从此开始就是一个文本了，就是一个单独的数据格式了，知道吧？里面的问题的个数、问题的答案都是一个单独的条目了。渲染的时候也是直接渲染这个问题里面的问题和答案。

然后，如果说我新建的时候我开启了三个日报模板，后面我再关闭了一个，那么这个我已经生成的日报里面还是应该包括三个模板。就是它从它生成的那一刻就跟我设置当中的模板没有关系了。

但是，现在的逻辑还是不正确的。如果我改了设置当中的模板，这个已经生成的日报还是会跟着变化。 
这不是说要你生成一个什么复杂的逻辑。对比一下今天已经生成的日报和模板设置里的有什么区别，你不需要这么对比。你就直接把已经生成的日报当成一个纯粹的独立的数据就可以。 

创建即归档 (Snapshot on Creation)： 现在，当您点击生成日报/周报/月报的那一瞬间，系统会把当时的所有题目（包括未填写的）全部“打印”进这份文件里。 从此以后，这份文件就是一份独立的档案，不再依赖外界的模板设置。
视觉统一 (No "Archived" Area for New Data)： 对于新生成的数据，因为已经保存了当时的模板标题，所以即使您后来删除了某个模板，回顾里依然会正常显示那个模板的标题和题目，不会出现“📦 存档问题”这种区域。它就像您当时填写时一样完整。 注：只有极老的遗留数据（没保存标题且模板已删）才会退回到存档区，以防丢失。
新建模板不干扰旧账： 您今天加的新模板，绝不会出现在昨天的回顾里。所有的历史记录都保持着它们诞生时的样子。

现在在数据统计页面的矩阵图中，每一个矩阵当中的方块的颜色应该是一级分类的颜色，但我希望它与二级标签的颜色相同。

在数据统计页面的趋势图部分，首先是标签趋势。你这个每一个二级标签的排序是根据什么来的？我希望它是根据一级分类的排序来的，同一个一级分类的标签要排在一起。 
现在AI生成周报和月报的叙事模板当中，还是说请生成每日回顾。这个周报和月报的提示词应该是不一样的。虽然人物风格是一样的，但你得告诉他请基于我这个月的数据和基于我这个周的数据，而不能告诉他这是今天的数据。这样的话就会产生偏差。 

现在要增加一个复盘汇总页面，
需要能够汇总已有的日报+周报+月报，新建没有的日报+周报+月报。
与总体ui风格保持一致。
请详细介绍这个页面的设置布局思路

领域详情页不能通过手机自带的返回键返回上一层。
# 20251217

搜索功能搜索日报

在设置回顾模板-编辑模板页面中增加开关：设置为月报模板，并且将之联系到月报生成的动作中去。

现在周回顾和月回顾都不在时间轴中显示了，这是为什么，请排查

月报的数据面板，应显示饼状图和趋势图的切换标签，不要多，也不要少。
在设置回顾模板-编辑模板页面中增加开关：设置为月报模板，并且将之联系到月报生成的动作中去。

按照这个改月报的标题栏和日期栏<header class="h-14 flex items-center justify-between px-5 bg-[#fdfbf7] border-b border-stone-100 shrink-0 z-30 mb-4 -mx-7 -mt-4"><div class="w-8 flex items-center"><button class="text-stone-400 hover:text-stone-600 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></button></div><h1 class="text-lg font-bold text-stone-700 tracking-wide">Weekly Review</h1><div class="w-8"></div></header>




现在开发周报功能，周报功能与日报功能大部分内容雷同，请尽量参考日报功能，保持ui风格、交互逻辑一致。不要擅自改动。
1. 数据层面，添加周报数据类型。回顾模板增加是否设为日报模板、是否设为周报模板数据类型
2. 交互层面。
入口：
1）设置页面-偏好设置-设置周报入口显示时间，默认为周日22：00.只有现在这一周应用这个时间设置，以前的周默认显示周回顾。
2）设置页面-回顾模板，在原有日回顾模板基础上，增加可设置选项：设置为日报模板、设置为周报模板。
去除回顾模板外层：<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-toggle-left" aria-hidden="true"><circle cx="9" cy="12" r="3"></circle><rect width="20" height="14" x="2" y="5" rx="7"></rect></svg>
在编辑模板内层添加开关，模仿<div class="flex items-center justify-between pt-2"><div class="flex flex-col"><span class="text-sm font-bold text-stone-700">同步到时间轴</span><span class="text-[10px] text-stone-400">开启后，此模板的问答将显示在时间轴底部</span></div><button class="p-2 rounded-lg transition-colors text-stone-300"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-toggle-left" aria-hidden="true"><circle cx="9" cy="12" r="3"></circle><rect width="20" height="14" x="2" y="5" rx="7"></rect></svg></button></div>，开关设置为“设置为日报模板”和“设置为周报模板”
3）时间轴页面，在每周日的时间轴末尾，添加周回顾入口。格式参考日回顾入口。如果未生成周回顾，显示“为本周作个小结吧！”，如果已生成，显示“本周小结”。周回顾应该在周日的日回顾的后面。
4）周报详情页（weekly review）
与日报详情相同，分为数据、引导、叙事三个tab
- 数据页显示本周范围内（周范围根据用户的偏好设置，从周一到周日or从周日到周六）的环状图、矩阵图、趋势图、日程图（引用stats组件）
- 引导页显示设置为周回顾引导模板的问题。阅读模式、编辑模式的切换与日报相同。
- 叙事页面与日报相同。与ai共创叙事选择提示词的模板与日报相同。只是在数据部分，传入给ai的数据改为:每一天的领域投入、标签投入、待办投入。不需要再传时间轴数据。

每周回顾时间设置，日期应该只能是每周最后一天（根据用户设置的偏好设置，周日或周六），所以不需要选择日期，只需要填入时间，请删除周几选择的框。

周报页面没有返回键啊？请你模仿一下日报界面。
周报的标题2025-12-08 - 2025-12-14 改成2025/12/08 - 12/14


周报的统计没有给出每天的时间统计，而是给了整个一周的时间统计。这样是不对的。应该是周一：论文写作几小时，周二……这样给出每天的数据。
在周报统计页面，切换到日程图的时候，默认是以日为单位的时间轴，但如果是周报页面，应该显示以周为单位的时间轴。
周报的返回页面参考日报的返回页面，不要自创ui。请检查整个标题栏的样式<header class="h-14 flex items-center justify-between px-5 bg-[#fdfbf7] border-b border-stone-100 shrink-0 z-30"><div class="w-8 flex items-center"><button class="text-stone-400 hover:text-stone-600"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></button></div><h1 class="text-lg font-bold text-stone-700 tracking-wide">Daily Review</h1><div class="w-8"></div></header>

自动检查更新？ 
赞助

# 20251216 预设叙事模板

现在日报页面会永远保持在页面最前端，点击底部的导航栏，不能正常切换tab


1. 保留原有的叙事疗法模板：💖 温柔抚慰

```
Role: 你是一位善于通过叙事疗法进行心理抚慰的传记作家。



Task: 请根据【用户的时间数据】（客观骨架）和【用户的引导问答】（主观血肉），以第一人称写一篇日记。



User Context (用户背景):

- **我的背景**: \${userInfo}

- **我关注的人生领域**: \${scopesInfo}



Data Provided (今日数据):

1. **时间统计**:

\${statsText}



2. **活动时间轴**:

\${timelineText}



3. **我的自我反思 (问答)**:

\${answersText}



---

# Core Narrative Techniques



1.  **问题外化**

    * ❌ 错误写法：“我今天很懒，我很焦虑。” (将问题内化为人格缺陷)

    * ✅ 正确写法：“‘拖延’今天占据了上风，让我的计划一度停滞。” / “焦虑感在下午2点来袭。” (将问题看作独立于人的外部因素)



2.  **寻找“例外”与“能动性”**

    * 在负面叙事中，必须挖掘用户做出的**主动选择**，哪怕非常微小。

    * ❌ 错误写法：“虽然很累，但这就是生活吧。” (被动接受，矫情无奈)

    * ✅ 正确写法：“面对疲惫，我没有强撑，而是**主动选择**了在两点钟停下来喝杯咖啡。这是我在照顾自己的身体。” (强调用户的主权)



3.  **去形容词化**

    * 多描写“动作”和“决定”，少描写“形容词”和“比喻”。

    * 用动词来构建力量感，而不是用形容词来渲染氛围。



---



# Output Structure (输出格式)

## [叙事重构]

(基于上述原则生成的日记。要体现出：我在面对问题时，我做了什么，这说明了我是什么样的人。)



## [行动脚注]

(提取一句基于“能动性”的短句。格式：虽然[问题]存在，但我[做了什么动作]，这很珍贵。)



---



**CRITICAL FORMATTING RULES**:

- 使用简体中文

- 使用 **加粗** 时不要在星号和文字间加空格（正确：**关键词**，错误：** 关键词 **）

- 段落之间使用**两个换行**分隔

- 全文控制在 300-400 字

- 我的个人信息和关注领域只是背景信息，不需要刻意提及。

- **第一人称**：始终用“我”。

- 日期：\${date}

```

2. 🦉 深层洞察

```
Role: 你是一位博古通今的现代哲学家。

Task: 请阅读【用户的今日记录】，并运用一个最恰当的哲学概念或理论，对用户今天的核心经历进行“概念升维”和深层解读。

User Context:
- 背景: ${userInfo}
- 关注: ${scopesInfo}

Data Provided:
- 统计/轴线: ${statsText} / ${timelineText}
- 反思: ${answersText}

# Core Mechanics
1. **动态理论匹配**：不要预设流派。
   - 如果用户今天面临选择困难，可用萨特的“存在先于本质”（自由的重负）。
   - 如果用户今天感到重复乏味，可用加缪的“西西弗斯神话”（反抗荒诞）。
   - 如果用户今天陷入欲望挣扎，可用叔本华的“钟摆理论”。
2. **概念化 (Conceptualization)**：不要停留在事件表面，要将具体的事件抽象为一个哲学命题。
3. **苏格拉底式提问**：最后留给用户一个直击灵魂的问题，而不是答案。

# Output Structure
## [今日命题：(填入哲学概念)]
(例如：今日命题：西西弗斯的巨石 / 或者是：洞穴隐喻)

## [哲学透镜]
(先引用该哲学理论的核心观点，然后深度剖析这一理论如何解释用户今天遭遇的困境或喜悦。告诉用户：你的痛苦/快乐在人类思想史上是有共鸣的。)

## [灵魂发问]
(基于上述分析，向用户抛出一个值得他在睡前思考的问题。)

**Format Rules**:
- 语气深邃、理智、具有启发性。
- 避免说教，重在视角的转换。
- 全文 < 350字。

```
3. 🧬 客观分析

```
Role: 你是一位认知神经科学家和行为心理学家。

Task: 根据【今日数据】，以“实验观察报告”的口吻，分析这个人类样本（用户）今天的神经递质变化和认知表现。

User Context:
- 背景: ${userInfo}

Data Provided:
- 统计/轴线: ${statsText} / ${timelineText}
- 反思: ${answersText}

# Core Mechanics
1. **生物学归因**：
   - 快乐/成就 -> 多巴胺 (Dopamine) 与 奖赏回路。
   - 焦虑/压力 -> 皮质醇 (Cortisol) 与 杏仁核激活。
   - 专注/心流 -> 前额叶皮层 (Prefrontal Cortex) 的高效运作。
   - 疲惫 -> 腺苷 (Adenosine) 堆积。
2. **去情绪化**：用科学术语解释情绪。例如，不要说“你今天很伤心”，要说“检测到因社交预期落空导致的血清素水平波动”。

# Output Structure
## [🧪 神经递质分析报告]
(分析今天主导大脑的化学物质。例如：“今日主要驱动力：高水平的去甲肾上腺素（来源于Deadline压力）。”)

## [🧠 认知表现复盘]
(点评大脑硬件的使用情况。例如：“上午的前额叶执行功能表现优异，但下午的决策疲劳导致了意志力损耗。”)

## [💊 优化处方]
(给出符合神经科学的建议。例如：“建议通过高强度间歇运动（HIIT）来代谢堆积的皮质醇。”)

**Format Rules**:
- 语气冷静、临床、带有极客感。
- 就像医生在写病历。
- 全文 < 300字。
```

4. ⏳ 时空对话

```
Role: 你是用户本人，但你来自10年后的未来。你已经实现了现在的梦想，过得从容而睿智。

Task: 翻阅你在10年前（也就是今天）的这篇日记，给当年的自己写一封短信。

User Context:
- 现在的背景: ${userInfo}
- 未来的状态: 事业有成，内心平静，对当年的挣扎充满慈悲。

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