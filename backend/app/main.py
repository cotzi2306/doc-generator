from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app import models

# Importar los routers
from app.routers import auth_routes, users_routes, docs_routes

# Crear tablas en SQLite
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="SaaS Documentos API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# Conectar los endpoints al archivo principal
app.include_router(auth_routes.router)
app.include_router(users_routes.router)
app.include_router(docs_routes.router)

@app.get("/")
def read_root():
    return {"status": "Backend Operativo"}