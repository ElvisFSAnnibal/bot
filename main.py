from fastapi import FastAPI, Request
import uvicorn
import asyncio
from playwright_rdo import preencher_rdo

app = FastAPI()
fila = asyncio.Queue()

async def processar_fila():
    while True:
        dados = await fila.get()
        try:
            await preencher_rdo(dados)
        except Exception as e:
            print(f"Erro na fila: {e}")
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
    print(f"Webhook recebido - ET: {dados.get('ET')}")
    await fila.put(dados)
    return {"status": "ok", "mensagem": "Na fila para processar"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
