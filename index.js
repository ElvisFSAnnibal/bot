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
// 🔥 TESTE
// =========================
app.all('/teste', async (req, res) => {
  let browser;
  let page;

  try {
    console.log('🚀 Iniciando Puppeteer...');

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
    // 🔐 LOGIN (CORRIGIDO)
    // =========================
    console.log('🔐 Indo para login...');

    // ❌ removido networkidle2 (ERA O PROBLEMA)
    await page.goto('https://web.diariodeobra.app/#/login', {
      waitUntil: 'domcontentloaded'
    });

    await page.waitForSelector('input[name="email"]', { timeout: 30000 });

    await page.type('input[name="email"]', process.env.EMAIL || '', { delay: 30 });
    await page.type('input[name="password"]', process.env.SENHA || '', { delay: 30 });

    await page.waitForSelector('button[type="submit"]', { timeout: 30000 });

    console.log('🔑 Fazendo login...');

    await page.click('button[type="submit"]');

    // 🔥 espera real de mudança de tela (não tempo fixo)
    await page.waitForFunction(() => {
      return !document.querySelector('input[name="email"]');
    }, { timeout: 30000 });

    console.log('✅ Login realizado');

    // =========================
    // 🏢 EMPRESA
    // =========================
    console.log('🏢 Aguardando tela de empresas...');

    await page.waitForFunction(() => {
      return document.body.innerText.includes('Acessar');
    }, { timeout: 30000 });

    const nomeEmpresa = "BMB TECNOLOGIA SOLUÇÕES E SERVIÇOS LTDA";

    console.log('🎯 Selecionando empresa...');

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

      // fallback
      card.click();
      return true;

    }, nomeEmpresa);

    console.log('👉 Empresa clicada:', clicou);

    await page.waitForTimeout(5000);

    // =========================
    // 🔍 DEBUG
    // =========================
    const textoTela = await page.evaluate(() => document.body.innerText);

    const screenshot = await page.screenshot({
      encoding: 'base64',
      fullPage: true
    });

    await browser.close();

    res.json({
      status: 'ok',
      login: true,
      empresaClicada: clicou,
      preview: textoTela.substring(0, 500),
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
// 🚀 START
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT} 🚀`);
});
