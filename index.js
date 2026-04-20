const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

// 🔽 teste
app.get('/', (req, res) => {
  res.send('OK 🚀');
});

// 🔥 endpoint principal
app.post('/preencher', async (req, res) => {
  try {
    const { obra } = req.body;

    console.log('Recebido:', req.body);

    // =========================
    // 🧠 TRATAR NOME DA OBRA
    // =========================
    let nomeObra = obra || "";

    if (!nomeObra.toUpperCase().startsWith("ET")) {
      nomeObra = "ET " + nomeObra;
    }

    nomeObra = nomeObra.trim();

    console.log("Buscando obra:", nomeObra);

    const browser = await puppeteer.launch({
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

    console.log('Login realizado');

    // =========================
    // 🏢 SELECIONAR EMPRESA
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

    console.log('Obra selecionada');

    // =========================
    // 🧪 DEBUG
    // =========================
    await page.screenshot({ path: '/tmp/debug.png' });

    await browser.close();

    res.send({ status: 'ok', obra: nomeObra });

  } catch (erro) {
    console.error('ERRO:', erro);
    res.status(500).send({ erro: erro.message });
  }
});

// 🚀 start
app.listen(process.env.PORT || 3000, () => {
  console.log('Servidor rodando 🚀');
});
