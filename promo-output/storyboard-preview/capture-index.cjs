/** @file capture-index.cjs @input index.html @output storyboard-index.png */
const { app, BrowserWindow } = require('electron');
const path = require('path');
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const window = new BrowserWindow({ width: 1440, height: 1024, show: false });
  await window.loadFile(path.join(__dirname, 'index.html'));
  require('fs').writeFileSync(path.join(__dirname, 'storyboard-index.png'), (await window.webContents.capturePage()).toPNG());
  console.log('Captured storyboard index');
  await window.destroy(); app.quit();
});
