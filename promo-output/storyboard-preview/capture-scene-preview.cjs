const { app, BrowserWindow } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');

const previewPath = path.join(__dirname, 'scene-01-from-a-start.html');
const outputPath = path.join(__dirname, 'scene-01-at-5s.png');

async function capturePreview() {
  await app.whenReady();

  const window = new BrowserWindow({
    width: 1080,
    height: 1920,
    show: true,
    webPreferences: {
      backgroundThrottling: false,
      zoomFactor: 1,
    },
  });

  await window.loadFile(previewPath);
  await window.webContents.executeJavaScript(`
    document.documentElement.style.width = '1080px';
    document.documentElement.style.height = '1920px';
    document.body.style.width = '1080px';
    document.body.style.height = '1920px';
  `);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const animationCount = await window.webContents.executeJavaScript(`
    (() => {
    const animations = document.getAnimations();
    animations.forEach((animation) => {
      animation.currentTime = 5000;
      animation.pause();
    });
    document.getElementById('progress').value = '5';
    document.getElementById('timeLabel').value = '5.0 / 10.0';
    return animations.length;
    })();
  `);
  const frameState = await window.webContents.executeJavaScript(`
    (() => {
      const phone = document.querySelector('.phone');
      const progress = document.getElementById('progress');
      return {
        opacity: getComputedStyle(phone).opacity,
        transform: getComputedStyle(phone).transform,
        progress: progress.value,
      };
    })();
  `);
  console.log(`Captured ${animationCount} animations at 5 seconds: ${JSON.stringify(frameState)}`);

  await window.webContents.insertCSS(`
    .headline .first, .headline .second { opacity: 0 !important; transform: translateY(-10px) !important; }
    .thread { height: 53% !important; opacity: 1 !important; }
    .time-dot { opacity: 1 !important; transform: scale(1) !important; }
    .phone { opacity: 1 !important; transform: translateX(-50%) translateY(0) scale(1) !important; }
    .tile.target { transform: scale(1) !important; background: #fff !important; }
    .tile.target::after { opacity: 0 !important; transform: scale(1.22) !important; }
    .floating-timer { opacity: 1 !important; transform: scale(1) !important; }
    .timeline, .caption, .brand { opacity: 0 !important; }
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
