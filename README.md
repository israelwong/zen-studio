# 🎨 ZEN Platform

Plataforma modular SaaS para estudios fotográficos.

**Stack:** Next.js 15 + TypeScript 5 + React 19 + Prisma + Supabase + Tailwind 4

---

## 🚀 Inicio Rápido

Para configurar el proyecto en un nuevo equipo, consulta la **[Guía de Setup completa](./SETUP.md)**.

### Setup Básico

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# 3. Aplicar migraciones
npm run db:migrate

# 4. Ejecutar seeds (datos iniciales)
npm run db:seed

# 5. Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 📚 Documentación

- **[SETUP.md](./SETUP.md)** - Guía completa de configuración para nuevos equipos
- **[scripts/README.md](./scripts/README.md)** - Documentación de scripts de utilidad
- **[.cursorrules](./.cursorrules)** - Reglas de desarrollo y convenciones

---

## 🛠️ Scripts Principales

```bash
npm run dev              # Servidor de desarrollo
npm run build            # Build de producción
npm run db:migrate       # Aplicar migraciones
npm run db:seed          # Ejecutar seeds
npm run db:studio        # Abrir Prisma Studio
```

Ver [SETUP.md](./SETUP.md) para la lista completa de scripts.

---

## 🏗️ Arquitectura

- **Multi-tenant**: Sistema de estudios con módulos activables
- **Módulos Core**: Manager, Magic (IA), Marketing (CRM)
- **Módulos Add-ons**: Payment, Conversations, Cloud, Invitation

---

## 📦 Tecnologías

- **Framework**: Next.js 15 (App Router)
- **Lenguaje**: TypeScript 5
- **UI**: React 19 + Tailwind 4 + ZEN Design System
- **Base de Datos**: PostgreSQL (Supabase) + Prisma ORM
- **Autenticación**: Supabase Auth
- **Pagos**: Stripe
- **Emails**: Resend

---

## 🔗 Enlaces

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Supabase Docs](https://supabase.com/docs)
