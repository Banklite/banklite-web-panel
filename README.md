# Panel web — BankLite

[![CI](https://github.com/Banklite/banklite-web-panel/actions/workflows/ci.yml/badge.svg)](https://github.com/Banklite/banklite-web-panel/actions/workflows/ci.yml)
[![Deploy](https://github.com/Banklite/banklite-web-panel/actions/workflows/deploy.yml/badge.svg)](https://github.com/Banklite/banklite-web-panel/actions/workflows/deploy.yml)

Frontend unico de **BankLite** (banca digital con microservicios), proyecto de *Arquitectura y Modelamiento de Software*, Universidad Cooperativa de Colombia. Es la unica interfaz del sistema: clientes y administradores operan desde aqui y el panel consume las APIs de los microservicios.

## Que incluye

| Seccion | Carpeta |
|---|---|
| Inicio de sesion | `app/login` |
| Banca del cliente: movimientos, transferencias, QR, tarjetas, clave dinamica, perfil | `app/cliente` |
| Administracion: usuarios, cuentas, libro contable, transferencias, tarjetas, fraude, cumplimiento | `app/admin` |
| Identidad y KYC | `app/identidad` |
| Cuentas | `app/cuentas` |
| Libro contable | `app/ledger` |
| Transferencias | `app/transferencias` |
| Tarjetas | `app/tarjetas` |
| Fraude | `app/fraude` |

Toda la comunicacion con el backend esta en `lib/api.ts`; la sesion (JWT) en `lib/auth.ts`.

## Tecnologias

Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS. Node.js 20, Docker.

## Despliegue

Desplegado en Render como `banklite-panel-ucc`. Las URL de los microservicios se configuran como variables de entorno en la plataforma, no en el codigo.

## Variables de entorno

Copia `.env.example` a `.env.local`. El ejemplo trae las URL de los servicios desplegados; para trabajar contra servicios locales usa los valores de la tabla. Cada variable apunta a un microservicio (o a su ruta en el API Gateway):

| Variable | Servicio | Valor local |
|---|---|---|
| `NEXT_PUBLIC_IDENTITY_API_URL` | identity-service | `http://localhost:8001` |
| `NEXT_PUBLIC_ACCOUNT_API_URL` | account-service | `http://localhost:8002` |
| `NEXT_PUBLIC_LEDGER_API_URL` | ledger-service | `http://localhost:8003` |
| `NEXT_PUBLIC_TRANSFER_API_URL` | transfer-service | `http://localhost:8004` |
| `NEXT_PUBLIC_CARD_API_URL` | card-service | `http://localhost:8005` |
| `NEXT_PUBLIC_FRAUD_API_URL` | fraud-service | `http://localhost:8006` |
| `NEXT_PUBLIC_NOTIFICATION_API_URL` | notification-service | `http://localhost:8007` |
| `NEXT_PUBLIC_COMPLIANCE_API_URL` | compliance-service | `http://localhost:8008` |

Las variables `NEXT_PUBLIC_*` se incrustan al compilar: si cambian, hay que volver a construir.

## Instalacion y ejecucion

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

Compilacion de produccion:

```bash
npm run build
npm start
```

Con Docker:

```bash
docker build -t banklite-web-panel .
docker run -p 3000:3000 banklite-web-panel
```

## CI/CD y estrategia de ramas

Los workflows estan en `.github/workflows/`:

| Archivo | Cuando corre | Que hace |
|---|---|---|
| `ci.yml` | Cada `push` a una rama y cada `pull request` hacia `main` | Instala dependencias, construye la aplicacion y comprueba que la imagen Docker construye |
| `deploy.yml` | Cada cambio integrado en `main` (o a mano) | Ejecuta `ci.yml`; si pasa, publica la imagen en GitHub Container Registry y avisa al hosting |

Los jobs de `deploy.yml` estan encadenados con `needs`: si la aplicacion no compila, no se despliega. El Deploy Hook, si se usa, esta en GitHub Secrets como `DEPLOY_HOOK_URL`.

Estrategia de ramas: `main` es la rama desplegada; cada cambio se hace en una rama corta, se abre un pull request hacia `main` y se fusiona con el check de CI en verde.

## Repositorios del proyecto

`banklite-identity-service`, `banklite-account-service`, `banklite-ledger-service`, `banklite-transfer-service`, `banklite-card-service`, `banklite-fraud-service`, `banklite-notification-service`, `banklite-compliance-service`. Gateway: `banklite-api-gateway`. Panel web: este repositorio.
