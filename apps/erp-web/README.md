# ERP Web

Frontend React + Vite de la plataforma ERP. Este bloque cubre identidad,
selección de tenant, onboarding y la entrada a un workspace base.

## Desarrollo local

1. Levanta PostgreSQL, Redis y MinIO con `docker compose up -d`.
2. Inicia la API con `pnpm --filter @erp/api start:dev`.
3. Inicia este frontend con `pnpm --filter @erp/erp-web dev`.
4. Abre `http://localhost:5173`.

Vite redirige `/api/*` a `http://localhost:3000` durante desarrollo. Para otro
origen configura `VITE_API_BASE_URL`; consulta `.env.example`.

## Seguridad de sesión

Los access y refresh tokens se mantienen únicamente en memoria. No se escriben
en `localStorage`, `sessionStorage` ni cookies mientras la decisión de
persistencia del cliente siga fuera de ADR-006. Recargar la página cierra la
sesión local. Antes de una operación autenticada, el cliente rota el access
token si está a menos de 30 segundos de expirar.

## Alcance actual

- Registro, login, refresh automático, logout y modelo tipado para `/auth/me`.
- Listado y selección validada de tenants.
- Provisioning de tenant, organización y empresa inicial opcional.
- Workspace de confirmación sin funciones dependientes de RBAC.
- Estados accesibles de validación, carga, error y vacío.
