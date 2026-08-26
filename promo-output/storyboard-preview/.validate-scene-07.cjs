const fs = require('fs');
const html = fs.readFileSync('scene-07-project-through-time.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!script) throw new Error('inline playback script missing');
new Function(script);
const required = [
  'class="bottle-visual"',
  'class="bottle-star star-1"',
  'class="bottle-star star-10"',
  'src="../../public/stars/star1/01.webp"',
  'src="../../public/stars/star1/10.webp"',
  'class="profile-head"',
  'class="profile-exp"',
  'class="attribute-icon"',
  'M12 7v14',
  '成长属性'
];
for (const value of required) {
  if (!html.includes(value)) throw new Error(`missing: ${value}`);
}
const stars = (html.match(/class="bottle-star /g) || []).length;
const attributes = (html.match(/class="attribute-row /g) || []).length;
if (stars !== 10) throw new Error(`expected 10 falling stars, got ${stars}`);
if (attributes !== 5) throw new Error(`expected 5 attribute rows, got ${attributes}`);
if (html.includes('bottle-img')) throw new Error('static bottle image remains');
console.log(`scene-07 ok; falling-stars=${stars}; attributes=${attributes}; script=valid`);
