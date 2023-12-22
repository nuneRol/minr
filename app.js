const puppeteer = require('puppeteer');
const config = require('./config.json');
const commandLineArgs = require('command-line-args');

let retries = 50;

function printProgress(hash, balance, shared) {
  console.clear();
  console.log("[NativeMiner] Hashrate: ", hash, " -  Balance: ", balance, ` (${shared} shared)`);
}

const { token = null, wallet = null, host = null, port = null, threads = null, autostart = null } = config;
if (!token) {
  throw new Error('Browsercloud account is not registered. Please register and set "token" in the config.json file.');
}

const auto = autostart ? 1 : 0;

// Defina as opções de linha de comando que você deseja aceitar
const optionDefinitions = [
  { name: 'token', type: String },
];

// Analise as opções de linha de comando
const options = commandLineArgs(optionDefinitions);

// Use as opções de linha de comando se fornecidas, caso contrário, use as do arquivo de configuração
const url = `https://nimiq.vercel.app?wallet=${wallet}&host=${host}&port=${port}&threads=${threads}&autostart=${auto}`;

const run = async () => {
  let interval = null;

  console.log('Miner Start!');

  try {
    const browser = await puppeteer.launch({
      headless: 'new', // Use o novo modo headless
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    await page.setDefaultTimeout(60 * 60 * 1000);

    await page.goto(url);

    interval = setInterval(async () => {
      try {
        if (!page.isClosed()) {
          await page.waitForSelector('#hashrate');
          await page.waitForSelector('#balance');
          await page.waitForSelector('#shared');

          let hash = await page.evaluate(() => document.querySelector('#hashrate')?.innerText ?? "0");
          let balance = await page.evaluate(() => document.querySelector('#balance')?.innerText ?? "0");
          let shared = await page.evaluate(() => document.querySelector('#shared')?.innerText ?? "0");

          printProgress(hash, balance, shared);
        } else {
          console.log(`Miner Restart: Page closed.`);
          clearInterval(interval);
          run();
        }
      } catch (error) {
        if (error.message.includes("Protocol error (Runtime.callFunctionOn): Session closed.")) {
          console.log(`Miner Restart: Page closed.`, error.message);
        } else {
          console.log(`Miner Restart: `, error.message);
        }

        clearInterval(interval);
        run();
      }
    }, 3000);

  } catch (error) {
    console.log(`Miner Restart: `, error.message);
    clearInterval(interval);
    run();
  }
}

run();

