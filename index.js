const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

// =========================
// 🚀 HEALTH CHECK
// =========================
app.get('/', (req, res) => {
  res.send('OK 🚀');
});

// =========================
// 🔥 TESTE PRINCIPAL (DINÂMICO)
// =========================
app.all('/teste', async (req, res) => {
  let browser;
  let page;

  try {
    // =========================
    // 📦 RECEBE DADOS
    // =========================
    const obra = req.body.obra;

    if (!obra) {
      return res.status(400).json({
        erro: "Envie a obra no JSON. Ex: { \"obra\": \"ET 12345\" }"
      });
    }

    console.log('📦 Obra recebida:', obra);

    // =========================
    // 🚀 INICIA PUPPETEER
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

    // =========================
    // 🔐 LOGIN
    // =========================
    console.log('🔐 Acessando login...');

    await page.goto('https://web.diariodeobra.app/#/login', {
      waitUntil: 'domcontentloaded'
    });

    await page.waitForSelector('input[name="email"]', { timeout: 30000 });

    await page.type('input[name="email"]', process.env.EMAIL || '', { delay: 30 });
    await page.type('input[name="password"]', process.env.SENHA || '', { delay: 30 });

    await page.waitForSelector('button[type="submit"]', { timeout: 30000 });

    await page.click('button[type="submit"]');

    // espera sair do login (forma confiável)
    await page.waitForFunction(() => {
      return !document.querySelector('input[name="email"]');
    }, { timeout: 30000 });

    console.log('✅ Login realizado');

    // =========================
    // 🔍 BUSCA DA OBRA
    // =========================
    console.log('🔍 Buscando obra:', obra);

    await page.waitForTimeout(3000);

    const inputSelector = 'input[type="text"], input[placeholder*="Buscar"], input';

    await page.waitForSelector(inputSelector, { timeout: 30000 });

    await page.click(inputSelector, { clickCount: 3 });
    await page.keyboard.press('Backspace');

    await page.type(inputSelector, obra, { delay: 80 });

    await page.keyboard.press('Enter');

    console.log('⏎ Busca enviada');

    await page.waitForTimeout(5000);

    // =========================
    // 🔍 DEBUG TELA
    // =========================
    const tela = await page.evaluate(() => document.body.innerText);

    const screenshot = await page.screenshot({
      encoding: 'base64',
      fullPage: true
    });

    await browser.close();

    // =========================
    // 📤 RESPOSTA
    // =========================
    res.json({
      status: "ok",
      obra,
      preview: tela.substring(0, 500),
      screenshot
    });

  } catch (erro) {
    console.error('❌ ERRO:', erro);

    let screenshot = null;

    try {
      if (page && !page.isClosed()) {
        screenshot = await page.screenshot({ encoding: 'base64' });
      }
    } catch (e) {}

    if (browser) await browser.close();

    res.status(500).json({
      erro: erro.message,
      screenshot
    });
  }
});

// =========================
// 🚀 START SERVER
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT} 🚀`);
});
