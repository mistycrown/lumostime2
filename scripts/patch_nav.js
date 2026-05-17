const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'src', 'contexts', 'NavigationContext.tsx');
let content = fs.readFileSync(filePath, 'utf8');
const oldStr = "    | 'widget';";
const newStr = "    | 'widget'\n    | 'desktop_widget';";
if (content.includes(oldStr)) {
  content = content.replace(oldStr, newStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('OK: desktop_widget added to SettingsSubmenu');
} else {
  console.log('NOT FOUND - checking content...');
  const idx = content.indexOf("'widget'");
  console.log(JSON.stringify(content.slice(Math.max(0, idx - 20), idx + 30)));
}
