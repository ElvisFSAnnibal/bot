const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

// =========================
// HEALTH CHECK
// =========================
app.get('/', (req, res) => {
  res.send('OK 🚀');
});

// =========================
// TESTE PRINCIPAL
// =========================
app.all('/teste', async (req, res) => {
  let browser;
  let page;

  try {
    // =========================
    // CAPTURA OBRA (JSON OU RAW)
    // =========================
    let obra = req.body?.obra;

    if (!obra) {
      let raw = '';
      await new Promise(resolve => {
        req.on('data', chunk => raw += chunk);
        req.on('end', resolve);
      });

      try {
        obra = JSON.parse(raw).obra;
      } catch {
        obra = raw;
      }
    }

    console.log('📦 Obra recebida:', obra);

    // =========================
    // PUPPETEER
    // =========================
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    page = await browser.newPage();
    page.setDefaultTimeout(30000);

    // LOGIN
    await page.goto('https://web.diariodeobra.app/#/login', {
      waitUntil: 'domcontentloaded'
    });

    await page.type('input[name="email"]', process.env.EMAIL || '');
    await page.type('input[name="password"]', process.env.SENHA || '');

    await page.click('button[type="submit"]');

    await page.waitForTimeout(5000);

    console.log('✅ Login realizado');

    // BUSCA OBRA
    await page.waitForTimeout(3000);

    const inputSelector = 'input[type="text"]';

    await page.type(inputSelector, obra, { delay: 50 });
    await page.keyboard.press('Enter');

    await page.waitForTimeout(5000);

    const tela = await page.evaluate(() => document.body.innerText);

    const screenshot = await page.screenshot({
      encoding: 'base64',
      fullPage: true
    });

    await browser.close();

    res.json({
      status: 'ok',
      obra,
      preview: tela.substring(0, 500),
      screenshot
    });

  } catch (erro) {
    console.error('❌ ERRO:', erro);

    if (browser) await browser.close();

    res.status(500).json({
      erro: erro.message
    });
  }
});

// START
app.listen(process.env.PORT || 3000, () => {
  console.log('Servidor rodando 🚀');
});
