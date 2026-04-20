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
// 🔥 TESTE PRINCIPAL
// =========================
app.all('/teste', async (req, res) => {
  let browser;
  let page;

  try {
    console.log('🚀 Iniciando Puppeteer...');

    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process'
      ]
    });

    page = await browser.newPage();

    page.setDefaultTimeout(30000);

    // =========================
    // 🔐 LOGIN
    // =========================
    console.log('🔐 Acessando login...');

    await page.goto('https://web.diariodeobra.app/#/login', {
      waitUntil: 'networkidle2'
    });

    await page.waitForSelector('input[name="email"]');

    await page.type('input[name="email"]', process.env.EMAIL || '');
    await page.type('input[name="password"]', process.env.SENHA || '');

    await page.click('button[type="submit"]');

    // espera transição de tela
    await page.waitForTimeout(5000);

    console.log('✅ Login realizado');

    // =========================
    // 🏢 TELA DE EMPRESA
    // =========================
    console.log('🏢 Aguardando lista de empresas...');

    await page.waitForFunction(() => {
      return document.body.innerText.includes('Acessar');
    }, { timeout: 30000 });

    // =========================
    // 🧠 SELEÇÃO DE EMPRESA
    // =========================
    const nomeEmpresa = "BMB TECNOLOGIA SOLUÇÕES E SERVIÇOS LTDA";

    console.log('🎯 Tentando selecionar empresa...');

    const clicou = await page.evaluate((nomeEmpresa) => {
      const elements = Array.from(document.querySelectorAll('div, section, article'));

      const card = elements.find(el =>
        el.innerText && el.innerText.includes(nomeEmpresa)
      );

      if (!card) return false;

      card.scrollIntoView({ block: 'center' });

      const btn = card.querySelector('button');

      if (btn) {
        btn.click();
        return true;
      }

      return false;
    }, nomeEmpresa);

    console.log('👉 Clique empresa:', clicou);

    await page.waitForTimeout(5000);

    // =========================
    // 🔍 DEBUG DA TELA FINAL
    // =========================
    const textoTela = await page.evaluate(() => document.body.innerText);

    console.log('📄 TELA ATUAL (preview):', textoTela.slice(0, 500));

    // =========================
    // 📸 SCREENSHOT
    // =========================
    const screenshot = await page.screenshot({
      encoding: 'base64',
      fullPage: true
    });

    await browser.close();

    res.json({
      status: 'ok',
      login: true,
      empresaClicada: clicou,
      telaPreview: textoTela.substring(0, 500),
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
