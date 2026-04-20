const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

// rota teste
app.get('/', (req, res) => {
  res.send('OK 🚀');
});

// 🔥 rota de debug
app.get('/teste', async (req, res) => {
  let browser;
  let page;

  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    page = await browser.newPage();

    // =========================
    // 🔐 LOGIN
    // =========================
    await page.goto('https://web.diariodeobra.app/#/login');

    await page.waitForSelector('input[name="email"]', { timeout: 20000 });

    await page.type('input[name="email"]', process.env.EMAIL);
    await page.type('input[name="password"]', process.env.SENHA);

    await page.click('button[type="submit"]');

    await new Promise(r => setTimeout(r, 6000));

    console.log('Login OK');

    // =========================
    // 🏢 SELECIONAR EMPRESA (ROBUSTO)
    // =========================
    await page.waitForFunction(() => {
      return document.body.innerText.includes('Acessar');
    }, { timeout: 20000 });

    await page.evaluate(() => {
      const nomeEmpresa = "BMB TECNOLOGIA SOLUÇÕES E SERVIÇOS LTDA";

      const blocos = Array.from(document.querySelectorAll('*'));

      const empresa = blocos.find(el =>
        el.innerText && el.innerText.includes(nomeEmpresa)
      );

      if (empresa) {
        let el = empresa;

        for (let i = 0; i < 5; i++) {
          const btn = el.querySelector('button');
          if (btn) {
            btn.click();
            return;
          }
          el = el.parentElement;
          if (!el) break;
        }
      }
    });

    await new Promise(r => setTimeout(r, 7000));

    console.log('Empresa selecionada');

    // =========================
    // 🔍 DEBUG DA TELA
    // =========================
    const textoTela = await page.evaluate(() => document.body.innerText);

    console.log('TELA ATUAL:', textoTela.slice(0, 500));

    // =========================
    // 📸 SCREENSHOT
    // =========================
    const screenshot = await page.screenshot({
      encoding: 'base64',
      fullPage: true
    });

    await browser.close();

    res.send({
      status: 'ok',
      mensagem: 'Debug após selecionar empresa',
      tela: textoTela.substring(0, 500),
      screenshot
    });

  } catch (erro) {
    console.error('ERRO:', erro);

    let screenshot = null;

    if (page) {
      try {
        screenshot = await page.screenshot({
          encoding: 'base64'
        });
      } catch (e) {}
    }

    if (browser) await browser.close();

    res.status(500).send({
      erro: erro.message,
      screenshot
    });
  }
});

// start
app.listen(process.env.PORT || 3000, () => {
  console.log('Servidor rodando 🚀');
});
