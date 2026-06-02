import asyncio
import os
import requests as req
from playwright.async_api import async_playwright
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Credenciais do RDO via variáveis de ambiente
RDO_EMAIL = os.environ.get("RDO_EMAIL")
RDO_SENHA = os.environ.get("RDO_SENHA")

# Status que geram quantidade 1
STATUS_QTD_1 = ["OK", "Obstruído", "IP"]

MAPA_CS = {
    "CS1": "1",
    "CS2": "2",
    "CS3": "3",
    "CS4": "4",
}

MAPA_TLI = {
    "1-2":  "3",
    "3-4":  "4",
    "5-6":  "5",
    "7-8":  "6",
    "9-10": "7",
    "11-12":"8",
}

LOG_FILE = "/home/ubuntu/rdo-bot/bot.log"

def log(msg: str):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    linha = f"[{timestamp}] {msg}"
    print(linha)
    with open(LOG_FILE, "a") as f:
        f.write(linha + "\n")

def baixar_foto(url: str, caminho: str) -> bool:
    if not url or url.strip() == '':
        return False
    try:
        r = req.get(url, timeout=30)
        if r.status_code == 200:
            with open(caminho, 'wb') as f:
                f.write(r.content)
            return True
    except Exception as e:
        log(f"Erro ao baixar foto: {e}")
    return False

async def anexar_foto(modal, url: str, nome_arquivo: str):
    caminho = f"/tmp/{nome_arquivo}"
    if baixar_foto(url, caminho):
        seletor = "input[id^='selector-imagem-']:not([id*='-item-'])"
        await modal.locator(seletor).first.set_input_files(caminho)
        await asyncio.sleep(3)
        os.remove(caminho)

async def preencher_atividade(pagina, num_atv: str, qtd: str, obs: str, fotos: list):
    log(f"  Preenchendo atividade {num_atv}...")
    try:
        tr = pagina.locator("tr").filter(has_text=f"{num_atv} -")
        await tr.locator("a[title='Editar']").click()

        modal = pagina.locator("#AtividadesListaTarefasForm")
        await modal.wait_for(state="visible")

        await modal.locator("input[name='quantidade']").fill(qtd)

        if obs:
            await modal.locator("textarea[name='observacao']").fill(obs)

        for url_foto, nome in fotos:
            if url_foto:
                await anexar_foto(modal, url_foto, nome)

        await modal.locator("button.btn-success:has-text('Salvar')").filter(visible=True).first.click()
        log(f"  ✅ Atividade {num_atv} salva!")
        await asyncio.sleep(2)
    except Exception as e:
        log(f"  ⚠️ Erro na atividade {num_atv}: {e}")
        await pagina.keyboard.press("Escape")

async def preencher_rdo(dados: dict):
    et = str(dados.get('ET', ''))
    log(f"\n=== Iniciando RDO | ET: {et} ===")

    try:
        async with async_playwright() as p:
            navegador = await p.chromium.launch(headless=True)
            pagina = await navegador.new_page()

            log("Acessando Diário de Obra...")
            await pagina.goto("https://web.diariodeobra.app/#/login?idioma=pt", wait_until="networkidle")

            campo_user = pagina.locator('input[name="email"]')
            if await campo_user.count() > 0:
                log("Realizando login...")
                await campo_user.fill(RDO_EMAIL)
                await pagina.locator('input[name="password"]').fill(RDO_SENHA)
                await pagina.click("button[type='submit'].btn-success")
                await pagina.wait_for_load_state("networkidle")
                log("✅ Login realizado!")

            log(f"Buscando ET {et}...")
            await pagina.wait_for_selector("input[placeholder='Pesquisa']")
            await pagina.fill("input[placeholder='Pesquisa']", f"ET {et}")
            await asyncio.sleep(2)
            await pagina.click(".router-link")
            await pagina.click(".td")

            url_edicao = pagina.url + "/editar"
            await pagina.goto(url_edicao)
            await pagina.wait_for_load_state("networkidle")
            await pagina.wait_for_selector("tr")
            log("✅ RDO aberto para edição!")

            for cs_key, prefixo in MAPA_CS.items():
                cs_nova = str(dados.get(cs_key, '') or '')
                if not cs_nova or cs_nova in ('nan', 'None', ''):
                    log(f"\nCS{prefixo} vazia — pulando...")
                    continue

                cs_antiga = str(dados.get(f'{cs_key}_ANTIGA', '') or '')
                foto_cs = dados.get(f'FOTO_{cs_key}', '')
                foto_cs_dados1 = dados.get(f'FOTO_{cs_key}_DADOS1', '') or dados.get('FOTO_CS_DADOS1', '')
                foto_cs_dados2 = dados.get(f'FOTO_{cs_key}_DADOS2', '')

                log(f"\n--- Processando {cs_key}: {cs_antiga} → {cs_nova} ---")

                await preencher_atividade(
                    pagina, f"{prefixo}.1", "1",
                    f"CS {cs_antiga} → {cs_nova}",
                    [(foto_cs, f"cs{prefixo}_poste.jpg")] if foto_cs else []
                )

                fotos_aberta = []
                if foto_cs_dados1:
                    fotos_aberta.append((foto_cs_dados1, f"cs{prefixo}_dados1.jpg"))
                if foto_cs_dados2:
                    fotos_aberta.append((foto_cs_dados2, f"cs{prefixo}_dados2.jpg"))
                await preencher_atividade(pagina, f"{prefixo}.2", "1", "", fotos_aberta)

                for posicao, num_tli in MAPA_TLI.items():
                    status = str(dados.get(f'{prefixo}STATUS_TLI{posicao}', '') or '')
                    tipo = str(dados.get(f'{prefixo}TIPO_TLI{posicao}', '') or '')
                    tli_novo = str(dados.get(f'{prefixo}TLI{posicao}', '') or '')
                    n_serie = str(dados.get(f'{prefixo}N_TLI{posicao}_ANTIGO', '') or '')
                    obs_tli = str(dados.get(f'{prefixo}OBSERVACAO_TLI{posicao}', '') or '')
                    foto_antigo = dados.get(f'{prefixo}FOTO_TLI{posicao}_ANTIGO', '')
                    foto_novo = dados.get(f'{prefixo}FOTO_TLI{posicao}_NOVO', '')
                    foto_obstrucao = dados.get(f'{prefixo}FOTO_OBSTRUCAO_TLI{posicao}', '')

                    if not status:
                        log(f"  TLI {posicao} sem status — pulando...")
                        continue

                    qtd = "1" if status in STATUS_QTD_1 else "0"
                    obs_completa = f"TLI novo: {tli_novo} | Série antigo: {n_serie} | Tipo: {tipo} | Status: {status}"
                    if obs_tli:
                        obs_completa += f" | {obs_tli}"

                    fotos_tli = []
                    if foto_antigo:
                        fotos_tli.append((foto_antigo, f"tli{prefixo}_{posicao}_antigo.jpg"))
                    if foto_novo:
                        fotos_tli.append((foto_novo, f"tli{prefixo}_{posicao}_novo.jpg"))
                    if foto_obstrucao:
                        fotos_tli.append((foto_obstrucao, f"tli{prefixo}_{posicao}_obs.jpg"))

                    await preencher_atividade(
                        pagina, f"{prefixo}.{num_tli}",
                        qtd, obs_completa, fotos_tli
                    )

            await navegador.close()
            log(f"\n=== RDO ET {et} FINALIZADO! ===")

    except Exception as e:
        log(f"❌ Erro geral: {e}")
