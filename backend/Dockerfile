# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente
COPY ./app ./app

# Exponer el puerto
EXPOSE 8000

# Comando para ejecutar FastAPI usando el módulo que está dentro de app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]