from fastapi import FastAPI, Request
import uvicorn
import asyncio
import json
from datetime import datetime
from playwright_rdo import preencher_rdo

app = FastAPI()
fila = asyncio.Queue()

LOG_FILE = "/home/ubuntu/rdo-bot/bot.log"

def log(msg: str):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    linha = f"[{timestamp}] {msg}"
    print(linha)
    with open(LOG_FILE, "a") as f:
        f.write(linha + "\n")

async def processar_fila():
    while True:
        dados = await fila.get()
        try:
            await preencher_rdo(dados)
        except Exception as e:
            log(f"Erro na fila: {e}")
        finally:
            fila.task_done()

@app.on_event("startup")
async def startup():
    asyncio.create_task(processar_fila())

@app.get("/")
def health():
    return {"status": "online"}

@app.post("/webhook")
async def webhook(request: Request):
    payload = await request.json()
    dados = payload.get("Data", payload)
    et = dados.get('ET', 'desconhecida')
    log(f"Webhook recebido - ET: {et}")
    log(f"Payload: {json.dumps(dados, ensure_ascii=False)}")
    await fila.put(dados)
    return {"status": "ok", "mensagem": "Na fila para processar"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
