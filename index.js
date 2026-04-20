const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

// rota teste
app.get('/', (req, res) => {
  res.send('OK 🚀');
});

app.post('/teste', async (req, res) => {
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

    await page.waitForSelector('input[name="email"]', { timeout: 15000 });

    await page.type('input[name="email"]', process.env.EMAIL);
    await page.type('input[name="password"]', process.env.SENHA);

    await page.click('button[type="submit"]');

    await new Promise(r => setTimeout(r, 5000));

    // =========================
    // 🏢 EMPRESA
    // =========================
    await page.evaluate(() => {
      const nomeEmpresa = "BMB TECNOLOGIA SOLUÇÕES E SERVIÇOS LTDA";

      const elementos = Array.from(document.querySelectorAll('*'));

      const empresa = elementos.find(el =>
        el.innerText && el.innerText.includes(nomeEmpresa)
      );

      if (empresa) {
        const botao = empresa.querySelector('button');
        if (botao) botao.click();
      }
    });

    await new Promise(r => setTimeout(r, 5000));

    // =========================
    // 📸 SCREENSHOT
    // =========================
    const screenshot = await page.screenshot({
      encoding: 'base64',
      fullPage: true
    });

    const textoTela = await page.evaluate(() => document.body.innerText);

    await browser.close();

    res.send({
      status: 'ok',
      mensagem: 'Debug realizado',
      tela: textoTela.substring(0, 500),
      screenshot
    });

  } catch (erro) {
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

app.listen(process.env.PORT || 3000, () => {
  console.log('Servidor rodando 🚀');
});
