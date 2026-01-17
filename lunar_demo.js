import { Solar, Lunar } from 'lunar-javascript';
import * as fs from 'fs';

// 获取当前时间
const now = new Date();
const solar = Solar.fromDate(now);
const lunar = solar.getLunar();

let output = '';
const log = (str) => { output += str + '\n'; console.log(str); };

log('--------------------------------------------------');
log('🌙 Lunar-Javascript 功能演示 (Cyber Almanac Demo)');
log('--------------------------------------------------');

log('\n【📅 基础日期】');
log(`阳历：${solar.toFullString()}`);
log(`阴历：${lunar.toString()}`);
log(`八字：${lunar.getBaZi().join(' ')}`);
log(`五行：${lunar.getBaZiWuXing().join(' ')}`);
log(`纳音：${lunar.getBaZiNaYin().join(' ')}`);

log('\n【📜 今日老黄历】');
log(`宜：${lunar.getDayYi().join('、')}`);
log(`忌：${lunar.getDayJi().join('、')}`);
log(`冲煞：冲${lunar.getDayChongDesc()} 煞${lunar.getDaySha()}`);
log(`彭祖百忌：${lunar.getPengZuGan()} ${lunar.getPengZuZhi()}`);

log('\n【🕋 诸神方位】');
log(`财神：${lunar.getDayPositionCai()} (利求财)`);
log(`喜神：${lunar.getDayPositionXi()} (利婚恋/喜事)`);
log(`福神：${lunar.getDayPositionFu()} (利祈福)`);
log(`阳贵神：${lunar.getDayPositionYangGui()}`);
log(`阴贵神：${lunar.getDayPositionYinGui()}`);

log('\n【🌤️ 节气与物候】');
const prevJie = lunar.getPrevJieQi(true);
const nextJie = lunar.getNextJieQi(true);
log(`上一节气：${prevJie.getName()} (${prevJie.getSolar().toYmdHms()})`);
log(`下一节气：${nextJie.getName()} (${nextJie.getSolar().toYmdHms()})`);
log(`七十二候：${lunar.getHou()} (${lunar.getWuHou()})`);

log('\n【🌌 星宿】');
log(`星宿：${lunar.getXiu()}宿${lunar.getXiuLuck()} (${lunar.getXiuSong()})`);

log('\n--------------------------------------------------');

fs.writeFileSync('demo_result.txt', output);
