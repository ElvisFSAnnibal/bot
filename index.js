const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');

const app = express();
app.use(express.json());

// 🔽 rota de teste (abra no navegador)
app.get('/', (req, res) => {
  res.send('OK 🚀');
});

// 🔽 função para baixar imagem (opcional)
async function baixarImagem(url, caminho) {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });

  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(caminho);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

// 🔥 endpoint principal
app.post('/preencher', async (req, res) => {
  try {
    const { atividade, qtd, obs, imagem } = req.body;

    console.log('Recebido:', req.body);

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

    // espera sistema carregar (SPA)
    await page.waitForTimeout(5000);

    console.log('Login realizado');

    // =========================
    // 📍 IR PARA RELATÓRIO
    // =========================
    // ⚠️ COLOQUE A URL REAL AQUI
    await page.goto('COLE_AQUI_URL_DO_RELATORIO', {
      waitUntil: 'networkidle2'
    });

    await page.waitForTimeout(5000);

    // =========================
    // 🔍 BUSCAR ATIVIDADE
    // =========================
    const linhas = await page.$$('tr');

    for (const linha of linhas) {
      const texto = await linha.evaluate(el => el.innerText);

      if (texto && texto.includes(atividade)) {
        console.log('Atividade encontrada:', atividade);

        const botao = await linha.$('button');

        if (botao) {
          await botao.click();
          await page.waitForTimeout(3000);

          // =========================
          // ✏️ PREENCHER CAMPOS
          // =========================
          try {
            // quantidade
            await page.waitForSelector('input[name="quantidade"]', { timeout: 5000 });
            await page.click('input[name="quantidade"]', { clickCount: 3 });
            await page.type('input[name="quantidade"]', String(qtd));
          } catch (e) {
            console.log('Campo quantidade não encontrado');
          }

          // observação
          if (obs) {
            try {
              await page.click('textarea[name="observacao"]');
              await page.type('textarea[name="observacao"]', obs);
            } catch (e) {
              console.log('Campo observação não encontrado');
            }
          }

          // =========================
          // 📸 UPLOAD IMAGEM (opcional)
          // =========================
          if (imagem) {
            try {
              const caminho = '/tmp/imagem.jpg';
              await baixarImagem(imagem, caminho);

              const inputFile = await page.$('input[type="file"]');
              if (inputFile) {
                await inputFile.uploadFile(caminho);
                await page.waitForTimeout(2000);
              }
            } catch (e) {
              console.log('Erro ao enviar imagem:', e.message);
            }
          }

          // =========================
          // 💾 SALVAR
          // =========================
          await page.evaluate(() => {
            const botoes = Array.from(document.querySelectorAll('button'));
            const salvar = botoes.find(b => b.innerText.includes('Salvar'));
            if (salvar) salvar.click();
          });

          await page.waitForTimeout(3000);

          break;
        }
      }
    }

    // screenshot debug
    await page.screenshot({ path: '/tmp/debug.png' });

    await browser.close();

    res.send({ status: 'ok' });

  } catch (erro) {
    console.error('ERRO:', erro);
    res.status(500).send({ erro: erro.message });
  }
});

// 🚀 iniciar servidor
app.listen(process.env.PORT || 3000, () => {
  console.log('Servidor rodando 🚀');
});
