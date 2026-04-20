const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

// 🔽 rota de teste
app.get('/', (req, res) => {
  res.send('OK 🚀');
});

app.post('/preencher', async (req, res) => {
  let browser;

  try {
    const { obra } = req.body;

    console.log('Recebido:', req.body);

    // =========================
    // 🧠 TRATAR OBRA (ET XXXXX)
    // =========================
    let nomeObra = obra || "";

    if (!nomeObra.toUpperCase().startsWith("ET")) {
      nomeObra = "ET " + nomeObra;
    }

    nomeObra = nomeObra.trim();

    console.log("Buscando obra:", nomeObra);

    // =========================
    // 🚀 INICIAR BROWSER
    // =========================
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // =========================
    // 🔐 LOGIN
    // =========================
    await page.goto('https://web.diariodeobra.app/#/login');

    await page.waitForSelector('input[name="email"]', { timeout: 15000 });

    await page.type('input[name="email"]', process.env.EMAIL);
    await page.type('input[name="password"]', process.env.SENHA);

    await page.click('button[type="submit"]');

    await new Promise(r => setTimeout(r, 5000));

    console.log('Login OK');

    // =========================
    // 🏢 ESCOLHER EMPRESA
    // =========================
    await new Promise(r => setTimeout(r, 4000));

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

    console.log('Empresa selecionada');

    // =========================
    // 🔍 BUSCAR OBRA
    // =========================
    await page.waitForSelector('input[placeholder="Pesquisa"]', { timeout: 15000 });

    await page.click('input[placeholder="Pesquisa"]', { clickCount: 3 });
    await page.type('input[placeholder="Pesquisa"]', nomeObra);

    await new Promise(r => setTimeout(r, 3000));

    // clicar na obra
    await page.evaluate((nomeObra) => {
      const elementos = Array.from(document.querySelectorAll('*'));

      const obra = elementos.find(el =>
        el.innerText && el.innerText.toUpperCase().includes(nomeObra.toUpperCase())
      );

      if (obra) obra.click();
    }, nomeObra);

    await new Promise(r => setTimeout(r, 5000));

    console.log('Tentou entrar na obra');

    // =========================
    // ✅ VALIDAR SE ENTROU
    // =========================
    const entrouNaObra = await page.evaluate((nomeObra) => {
      return document.body.innerText.toUpperCase().includes(nomeObra.toUpperCase());
    }, nomeObra);

    if (!entrouNaObra) {
      throw new Error('Não entrou na obra');
    }

    console.log('Entrou na obra com sucesso');

    // =========================
    // 📸 SCREENSHOT (DEBUG)
    // =========================
    const screenshot = await page.screenshot({
      encoding: 'base64',
      fullPage: true
    });

    await browser.close();

    // =========================
    // 📤 RESPOSTA
    // =========================
    res.send({
      status: 'ok',
      obra: nomeObra,
      mensagem: 'Entrou na obra com sucesso',
      screenshot
    });

  } catch (erro) {
    console.error('ERRO:', erro);

    let screenshot = null;

    try {
      if (browser) {
        const pages = await browser.pages();
        if (pages.length > 0) {
          screenshot = await pages[0].screenshot({
            encoding: 'base64'
          });
        }
        await browser.close();
      }
    } catch (e) {}

    res.status(500).send({
      erro: erro.message,
      screenshot
    });
  }
});

// 🚀 start
app.listen(process.env.PORT || 3000, () => {
  console.log('Servidor rodando 🚀');
});
