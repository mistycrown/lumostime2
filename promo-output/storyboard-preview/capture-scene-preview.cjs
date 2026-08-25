const { app, BrowserWindow } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');

const previewPath = path.join(__dirname, 'scene-01-from-a-start.html');
const outputPath = path.join(__dirname, 'scene-01-at-6s.png');

async function capturePreview() {
  await app.whenReady();

  const window = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: true,
    webPreferences: {
      backgroundThrottling: false,
      zoomFactor: 1,
    },
  });

  await window.loadFile(previewPath);
  await window.webContents.executeJavaScript(`
    document.documentElement.style.width = '1920px';
    document.documentElement.style.height = '1080px';
    document.body.style.width = '1920px';
    document.body.style.height = '1080px';
  `);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const animationCount = await window.webContents.executeJavaScript(`
    (() => {
    const animations = document.getAnimations();
    animations.forEach((animation) => {
      animation.currentTime = 6000;
      animation.pause();
    });
    document.getElementById('progress').value = '6';
    document.getElementById('timeLabel').value = '6.0 / 10.0';
    return animations.length;
    })();
  `);
  const frameState = await window.webContents.executeJavaScript(`
    (() => {
      const appWindow = document.querySelector('.app-window');
      const progress = document.getElementById('progress');
      return {
        opacity: getComputedStyle(appWindow).opacity,
        transform: getComputedStyle(appWindow).transform,
        progress: progress.value,
      };
    })();
  `);
  console.log(`Captured ${animationCount} animations at 6 seconds: ${JSON.stringify(frameState)}`);

  await window.webContents.insertCSS(`
    .app-window { opacity: 1 !important; transform: translateX(0) scale(1) !important; }
    .activity.target { transform: scale(1) !important; }
    .activity.target::after { opacity: 0 !important; transform: translateX(-50%) scale(1.25) !important; }
    .active-record { opacity: 1 !important; transform: translateY(0) scale(1) !important; }
    .time-thread { height: 49% !important; opacity: 1 !important; }
    .copy p, .caption { opacity: 1 !important; transform: translateY(0) !important; }
    .control-bar { display: none !important; }
  `);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const image = await window.webContents.capturePage();
  require('fs').writeFileSync(outputPath, image.toPNG());
  await window.close();
  app.quit();
}

capturePreview().catch((error) => {
  console.error(error);
  app.quit();
  process.exitCode = 1;
});
