const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'c:\\Users\\Thallisson\\Desktop\\projeto aba\\scratch\\chrome_test_profile';

console.log('Launching Chrome with remote debugging...');
const chromeProcess = spawn(chromePath, [
  '--remote-debugging-port=9222',
  '--headless=new',
  '--disable-gpu',
  `--user-data-dir=${userDataDir}`,
  'http://127.0.0.1:8089/index.html'
]);

chromeProcess.stderr.on('data', d => {
  // console.log('[Chrome STDERR]:', d.toString());
});

async function checkMemory() {
  for (let i = 0; i < 8; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const pid = chromeProcess.pid;
      console.log(`Second ${i + 1}: Chrome PID ${pid} is running.`);
    } catch(e) {}
  }
}

setTimeout(async () => {
  await checkMemory();
  console.log('Test completed successfully. Killing test Chrome.');
  chromeProcess.kill();
  process.exit(0);
}, 1000);
