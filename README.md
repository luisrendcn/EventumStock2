# EventumStock2

Sistema de inventario con backend Node.js, PostgreSQL, Redis, PWA de administracion y e-commerce.

## Ejecutar con Docker

Requisitos:

- Docker Desktop instalado.
- Git instalado para clonar el repositorio.

Pasos en otro computador:

```bash
git clone https://github.com/luisrendcn/EventumStock2.git
cd EventumStock2
cp .env.example .env
docker compose up --build
```

En Windows PowerShell, si `cp` no esta disponible:

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Servicios disponibles:

- Backend: http://localhost:3001
- Health check: http://localhost:3001/health
- E-commerce: http://localhost:5174
- PWA admin: http://localhost:5175

Docker levanta automaticamente:

- `backend`: API Node.js en el puerto `3001`.
- `postgres`: base de datos con schema y seed inicial.
- `redis`: reservas temporales y expiracion.
- `ecommerce`: tienda servida por Nginx en el puerto `5174`.
- `pwa`: panel de administracion servido por Nginx en el puerto `5175`.

## Correos reales con Gmail

El archivo `.env` no se sube a Git. Cada computador debe configurar sus propios secretos.

Para enviar correos reales, edita `.env` y completa:

```env
NOTIFICATION_EMAIL_TO=mandingasricas@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu_correo@gmail.com
SMTP_PASS=tu_contrasena_de_aplicacion_de_16_caracteres
SMTP_FROM="EventumStock <tu_correo@gmail.com>"
```

La cuenta Gmail debe tener verificacion en dos pasos y una contrasena de aplicacion. No uses la contrasena normal de Gmail.

Despues de cambiar `.env`, reinicia los contenedores:

```bash
docker compose up --build
```

## Desarrollo local sin Docker

Para trabajar como desarrollador puedes seguir usando Node.js localmente:

```bash
npm install
npm run dev
```

Los frontends se ejecutan desde sus carpetas:

```bash
cd ecommerce
npm install
npm run dev -- --host 127.0.0.1
```

```bash
cd pwa
npm install
npm run dev -- --host 127.0.0.1
```
