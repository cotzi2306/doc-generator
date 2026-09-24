# frontend/Dockerfile
# Etapa 1: Construcción (Node)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa 2: Servidor Web (Nginx)
FROM nginx:alpine
# Copiar configuración para React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copiar la carpeta 'dist' generada por Vite
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]