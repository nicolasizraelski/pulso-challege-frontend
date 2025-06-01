# NutriChat - Asistente Nutricional Personal

Aplicación web que te ayuda a analizar y obtener información nutricional de tus comidas.

## Demo

Se puede probar la aplicación en: [https://pulso-challege-frontend.vercel.app/](https://pulso-challege-frontend.vercel.app/)

## Requisitos

- Node.js 18 o superior
- PNPM

## Instalación

1. Instalar dependencias:

```bash
pnpm install
```

2. Crear archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Desarrollo

Para correr el proyecto en modo desarrollo:

```bash
pnpm dev
```

La aplicación estará disponible en `http://localhost:3001`

## Backend

El backend debe estar corriendo en `http://localhost:3000` con los siguientes endpoints:

- `POST /analyze-food` - Analiza texto o imagen de comida
- `POST /get-nutrition-info` - Obtiene información nutricional
