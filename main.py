from fastapi import FastAPI, Request
import uvicorn
import asyncio
from playwright_rdo import preencher_rdo

app = FastAPI()

@app.get("/")
def health():
    return {"status": "online"}

@app.post("/webhook")
async def webhook(request: Request):
    payload = await request.json()
    dados = payload.get("Data", payload)
    print(f"Webhook recebido - ET: {dados.get('ET')}")
    asyncio.create_task(preencher_rdo(dados))
    return {"status": "ok", "mensagem": "Processando RDO em segundo plano"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
