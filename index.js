const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');

const app = express();
app.use(express.json());

// 🔽 função para baixar imagem
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
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // LOGIN
    await page.goto('https://web.diariodeobra.app/#/login', {
  waitUntil: 'networkidle2'
});

    await page.type('#email', process.env.EMAIL);
    await page.type('#password', process.env.SENHA);
    await page.click('button[type=submit]');
    await page.waitForNavigation();

    // IR PARA RELATÓRIO
    await page.goto('URL_DO_RELATORIO', {
      waitUntil: 'networkidle2'
    });

    // 🔍 procurar atividade na tabela
    const linhas = await page.$$('tr');

    for (const linha of linhas) {
      const texto = await linha.evaluate(el => el.innerText);

      if (texto.includes(atividade)) {

        // clicar no botão editar
        const botao = await linha.$('button');
        await botao.click();

        // esperar modal
        await page.waitForSelector('input[name="quantidade"]');

        // preencher quantidade
        await page.click('input[name="quantidade"]', { clickCount: 3 });
        await page.type('input[name="quantidade"]', String(qtd));

        // preencher observação
        if (obs) {
          await page.click('textarea[name="observacao"]');
          await page.type('textarea[name="observacao"]', obs);
        }

        // 📸 upload de imagem (se existir)
        if (imagem) {
          const caminho = '/tmp/foto.jpg';

          await baixarImagem(imagem, caminho);

          const inputFile = await page.$('input[type="file"][accept="image/*"]');
          await inputFile.uploadFile(caminho);

          await page.waitForTimeout(2000);
        }

        // salvar modal
        await page.evaluate(() => {
          const botoes = Array.from(document.querySelectorAll('button[type="submit"]'));
          const salvar = botoes.find(b => b.innerText.includes('Salvar'));
          if (salvar) salvar.click();
        });

        await page.waitForTimeout(1500);

        break;
      }
    }

    await browser.close();

    res.send({ status: 'ok' });

  } catch (erro) {
    console.error(erro);
    res.status(500).send({ erro: erro.message });
  }
});

// servidor
app.listen(process.env.PORT || 3000, () => {
  console.log('Servidor rodando 🚀');
});

app.get('/', (req, res) => {
  res.send('OK 🚀');
});
