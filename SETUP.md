# 🚀 Guía de Setup - ZEN Platform

Guía completa para configurar el proyecto ZEN en un nuevo equipo.

---

## 📋 Requisitos Previos

### Software Necesario

- **Node.js**: v20.x o superior (recomendado v20.19+)
- **npm**: v10.x o superior (incluido con Node.js)
- **Git**: Para clonar el repositorio
- **PostgreSQL**: Acceso a base de datos Supabase (no requiere instalación local)

### Cuentas y Servicios Externos

- **Supabase**: Proyecto configurado con base de datos PostgreSQL
- **Stripe**: Cuenta de desarrollo (opcional, para pagos)
- **Resend**: API key para envío de emails (opcional)
- **Google Cloud**: Credenciales OAuth (opcional, para Google Drive)

---

## 🔧 Instalación

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd zen-platform
```

### 2. Instalar Dependencias

```bash
npm install
```

Este comando ejecutará automáticamente `prisma generate` gracias al script `postinstall`.

### 3. Configurar Variables de Entorno

Crear archivo `.env.local` en la raíz del proyecto:

```bash
cp .env.example .env.local  # Si existe un ejemplo
# O crear manualmente
```

---

## 🔐 Variables de Entorno

### Variables Requeridas (Críticas)

```env
# Base de Datos
DATABASE_URL=postgresql://user:password@host:port/database?pgbouncer=true
DIRECT_URL=postgresql://user:password@host:port/database

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Variables Opcionales (Recomendadas)

```env
# Supabase Service Role (para operaciones admin)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe (para módulo de pagos)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend (para envío de emails)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@zenly.mx
RESEND_REPLY_TO=hello@zenly.mx

# Google OAuth (para integración Google Drive)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_GOOGLE_API_KEY=your-api-key
NEXT_PUBLIC_GOOGLE_APP_ID=your-app-id

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Feature Flags
ALLOW_NEW_STUDIOS=false
ANALYTICS_INCLUDE_OWNER=false
```

### Explicación de Variables

#### Base de Datos

- **`DATABASE_URL`**: URL de conexión con pgbouncer (para queries en runtime)
- **`DIRECT_URL`**: URL de conexión directa (para migraciones y DDL)

> ⚠️ **Importante**: En Supabase, `DATABASE_URL` usa el pooler (pgbouncer) y `DIRECT_URL` es la conexión directa. Ambas son necesarias.

#### Supabase

- **`NEXT_PUBLIC_SUPABASE_URL`**: URL pública de tu proyecto Supabase
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Clave anónima pública (segura para cliente)
- **`SUPABASE_SERVICE_ROLE_KEY`**: Clave de servicio (solo servidor, nunca exponer)

#### Stripe

- **`STRIPE_SECRET_KEY`**: Clave secreta de Stripe (formato: `sk_test_...` o `sk_live_...`)
- **`STRIPE_WEBHOOK_SECRET`**: Secreto del webhook (formato: `whsec_...`)

> 💡 Para desarrollo local, usar claves de test (`sk_test_`). Para webhooks locales: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

#### Resend

- **`RESEND_API_KEY`**: API key de Resend
- **`RESEND_FROM_EMAIL`**: Email remitente (debe estar verificado en Resend)
- **`RESEND_REPLY_TO`**: Email para respuestas

#### Google OAuth

- **`GOOGLE_CLIENT_ID`**: Client ID de Google Cloud Console
- **`GOOGLE_CLIENT_SECRET`**: Client Secret de Google Cloud Console
- **`NEXT_PUBLIC_GOOGLE_API_KEY`**: API Key para Google Drive API
- **`NEXT_PUBLIC_GOOGLE_APP_ID`**: App ID de Google

> 💡 Las credenciales también pueden configurarse en la base de datos (`platform_config`), pero las variables de entorno tienen prioridad.

---

## 🗄️ Configuración de Base de Datos

### 1. Aplicar Migraciones

```bash
npm run db:migrate
```

O si prefieres sincronizar el schema sin crear migraciones:

```bash
npm run db:push
```

> ⚠️ **Nota**: `db:push` sincroniza el schema directamente. Usar `db:migrate` en producción.

### 2. Ejecutar Seeds (Datos Iniciales)

```bash
# Seed completo (en orden)
npm run db:seed                    # Seed maestro (platform core)
npm run db:seed-demo-users        # Usuarios demo
npm run db:seed-catalogo          # Catálogo de ejemplo
npm run db:seed-promise-pipeline  # Pipeline de promesas
npm run db:seed-social            # Redes sociales

# O usar script completo
bash scripts/01-setup-complete.sh
```

### 3. Verificar Seeds

```bash
npm run db:verify-seeds
```

### 4. Resetear Base de Datos (Desarrollo)

```bash
npm run db:reset
```

> ⚠️ **Cuidado**: Esto elimina todos los datos y vuelve a aplicar migraciones + seeds.

---

## 🚀 Ejecutar el Proyecto

### Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

### Producción

```bash
npm run build
npm start
```

---

## 📦 Scripts Disponibles

### Desarrollo

```bash
npm run dev              # Servidor de desarrollo
npm run build            # Build de producción
npm run start            # Servidor de producción
npm run lint             # Linter
```

### Base de Datos

```bash
npm run db:push          # Sincronizar schema (sin migraciones)
npm run db:migrate       # Crear y aplicar migraciones
npm run db:studio        # Abrir Prisma Studio
npm run db:seed          # Seed maestro
npm run db:seed-demo-users      # Seed usuarios demo
npm run db:seed-catalogo        # Seed catálogo
npm run db:seed-promise-pipeline # Seed pipeline
npm run db:seed-social          # Seed redes sociales
npm run db:verify-seeds         # Verificar seeds
npm run db:reset                # Reset DB + migraciones + seeds
npm run db:execute-sql <file>   # Ejecutar SQL manual
```

### Stripe (Desarrollo Local)

```bash
npm run stripe:listen    # Escuchar webhooks de Stripe
```

### Seguridad

```bash
npm run audit:check      # Verificar vulnerabilidades (moderate+)
npm run audit:fix        # Aplicar fixes automáticos (sin breaking changes)
```

---

## 🧪 Validación de Setup

### Verificar Variables de Entorno

El proyecto incluye validación automática. Si faltan variables requeridas, verás errores al iniciar.

### Verificar Conexión a Base de Datos

```bash
npm run db:studio
```

Si Prisma Studio se abre correctamente, la conexión está funcionando.

### Verificar Supabase

Revisar en la consola del navegador que no haya errores de autenticación de Supabase.

---

## 🔒 Seguridad y Vulnerabilidades

### Verificar Vulnerabilidades

Después de instalar dependencias, es normal ver advertencias de vulnerabilidades:

```bash
npm audit
```

### Manejo de Vulnerabilidades

**⚠️ Importante**: No ejecutar `npm audit fix --force` sin revisar primero, ya que puede romper compatibilidad.

#### Opciones Recomendadas:

1. **Revisar vulnerabilidades específicas:**
   ```bash
   npm audit
   ```

2. **Actualizar solo parches de seguridad (sin breaking changes):**
   ```bash
   npm audit fix
   ```

3. **Actualizar dependencias manualmente:**
   - Revisar el reporte de `npm audit`
   - Identificar paquetes vulnerables
   - Actualizar versiones específicas en `package.json`
   - Ejecutar `npm install` y probar

4. **Dependencias conocidas con vulnerabilidades:**
   - `node-fetch@^2.7.0`: Considerar actualizar a v3 (puede requerir cambios en código)
   - `html2pdf.js@^0.12.0`: Revisar si hay actualizaciones disponibles
   - `ws@^8.18.3`: Verificar si hay parches disponibles

### Notas sobre Vulnerabilidades

- **Desarrollo local**: Las vulnerabilidades en devDependencies generalmente no afectan producción
- **Producción**: Solo las vulnerabilidades en `dependencies` se incluyen en el build final
- **Prioridad**: Enfocarse en vulnerabilidades **critical** y **high** primero
- **Testing**: Después de actualizar, ejecutar tests y verificar que todo funciona

### Scripts de Verificación

Los scripts ya están incluidos en `package.json`:

```bash
npm run audit:check      # Verificar vulnerabilidades (moderate+)
npm run audit:fix        # Aplicar fixes automáticos
```

---

## 🐛 Troubleshooting

### Error: "DATABASE_URL is required"

- Verificar que `.env.local` existe
- Verificar que `DATABASE_URL` está definida
- Reiniciar el servidor de desarrollo

### Error: "Missing Supabase environment variables"

- Verificar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Las variables deben empezar con `NEXT_PUBLIC_` para estar disponibles en el cliente

### Error de Conexión a Base de Datos

- Verificar que `DATABASE_URL` y `DIRECT_URL` son correctas
- En Supabase, usar el pooler para `DATABASE_URL` y conexión directa para `DIRECT_URL`
- Verificar que la IP está permitida en Supabase (Settings > Database > Connection Pooling)

### Error: "Prisma Client not generated"

```bash
npx prisma generate
```

### Migraciones Fracasan

- Usar `DIRECT_URL` para migraciones (no `DATABASE_URL` con pgbouncer)
- Verificar que tienes permisos DDL en la base de datos
- Revisar logs de Supabase para errores específicos

### Stripe Webhooks No Funcionan Localmente

1. Instalar Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Autenticarse: `stripe login`
3. Escuchar webhooks: `npm run stripe:listen`
4. Copiar el webhook secret a `STRIPE_WEBHOOK_SECRET`

### Vulnerabilidades en npm audit

Si ves advertencias de vulnerabilidades después de `npm install`:

1. **No es crítico para desarrollo local**: Puedes continuar trabajando
2. **Revisar antes de producción**: Ejecutar `npm audit` y revisar vulnerabilidades críticas
3. **Actualizar gradualmente**: No usar `npm audit fix --force` sin probar primero
4. Ver sección **"Seguridad y Vulnerabilidades"** arriba para más detalles

---

## 📚 Estructura del Proyecto

```
zen-platform/
├── prisma/
│   ├── schema.prisma          # Schema de Prisma
│   ├── migrations/            # Migraciones
│   └── *.ts                   # Scripts de seed
├── src/
│   ├── app/                   # Next.js App Router
│   ├── components/            # Componentes React
│   ├── lib/                   # Utilidades y lógica
│   └── types/                 # TypeScript types
├── scripts/                   # Scripts de utilidad
├── supabase/                  # SQL de Supabase
└── public/                    # Assets estáticos
```

---

## 🔗 Enlaces Útiles

- **Prisma Docs**: https://www.prisma.io/docs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Stripe Docs**: https://stripe.com/docs
- **Resend Docs**: https://resend.com/docs

---

## ✅ Checklist de Setup

- [ ] Node.js v20+ instalado
- [ ] Repositorio clonado
- [ ] `npm install` ejecutado
- [ ] `.env.local` creado con variables requeridas
- [ ] `DATABASE_URL` y `DIRECT_URL` configuradas
- [ ] Variables de Supabase configuradas
- [ ] Migraciones aplicadas (`npm run db:migrate`)
- [ ] Seeds ejecutados (`npm run db:seed`)
- [ ] Servidor de desarrollo funciona (`npm run dev`)
- [ ] Prisma Studio funciona (`npm run db:studio`)

---

**Última actualización**: 2025-01-25
