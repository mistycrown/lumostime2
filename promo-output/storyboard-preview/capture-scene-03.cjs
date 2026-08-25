/**
 * @file capture-scene-03.cjs
 * @input scene-03-connected-purpose.html
 * @output scene-03-at-9s.png
 * @description Captures a deterministic 1920x1080 approval frame for promo storyboard scene 03.
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false,
    webPreferences: { backgroundThrottling: false }
  });

  await window.loadFile(path.join(__dirname, 'scene-03-connected-purpose.html'));
  await window.webContents.executeJavaScript(`
    document.getAnimations().forEach((animation) => {
      animation.currentTime = 9200;
      animation.pause();
    });
    document.querySelector('.control-bar').style.display = 'none';
  `);
  const image = await window.webContents.capturePage();
  const output = path.join(__dirname, 'scene-03-at-9s.png');
  require('fs').writeFileSync(output, image.toPNG());
  console.log(`Captured scene 03 at 9.2 seconds: ${output}`);
  await window.destroy();
  app.quit();
});
