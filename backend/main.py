import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI()


origins = [
    "http://localhost:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],    
)

async def health_check():
    return {"status": "ok"}

app.get("/health")(health_check)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)