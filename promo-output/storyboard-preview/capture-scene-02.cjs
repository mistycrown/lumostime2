const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');

const previewPath = path.join(__dirname, 'scene-02-time-becomes-a-thread.html');
const outputPath = path.join(__dirname, 'scene-02-at-8s.png');

async function capturePreview() {
  await app.whenReady();
  const window = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: true,
    webPreferences: { backgroundThrottling: false, zoomFactor: 1 },
  });

  await window.loadFile(previewPath);
  await window.webContents.executeJavaScript(`
    document.documentElement.style.cssText += ';width:1920px;height:1080px';
    document.body.style.cssText += ';width:1920px;height:1080px';
  `);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const state = await window.webContents.executeJavaScript(`
    (() => {
      document.getAnimations().forEach((animation) => { animation.currentTime = 8000; animation.pause(); });
      document.getElementById('progress').value = '8';
      document.getElementById('timeLabel').value = '8.0 / 10.0';
      const activeEntry = document.querySelector('.entry.active');
      return { animations: document.getAnimations().length, opacity: getComputedStyle(activeEntry).opacity };
    })();
  `);
  await window.webContents.insertCSS(`
    .app-window { opacity:1 !important; transform:translateX(0) scale(1) !important; }
    .entry { opacity:1 !important; transform:translateY(0) !important; }
    .record-flow { height:96px !important; opacity:1 !important; }
    .entry.active .pulse { opacity:0 !important; transform:scale(1.9) !important; }
    .copy p,.caption { opacity:1 !important; transform:translateY(0) !important; }
    .control-bar { display:none !important; }
  `);
  await new Promise((resolve) => setTimeout(resolve, 100));
  fs.writeFileSync(outputPath, (await window.webContents.capturePage()).toPNG());
  console.log(`Captured scene 02 at 8 seconds: ${JSON.stringify(state)}`);
  await window.close();
  app.quit();
}

capturePreview().catch((error) => { console.error(error); app.quit(); process.exitCode = 1; });
