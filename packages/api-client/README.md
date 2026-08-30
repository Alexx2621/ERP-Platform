# `@erp/api-client`

Cliente TypeScript reutilizable para los contratos HTTP estables de identidad y
tenancy. No contiene estado de sesión ni depende de React.

```ts
import { ApiClient } from "@erp/api-client";

const api = new ApiClient({ baseUrl: "/api/v1" });
const session = await api.login({
  email: "owner@example.com",
  password: "Password1",
});
```

El constructor acepta una implementación de `fetch` para SSR, runtimes no web
y pruebas.

## Tipos generados desde OpenAPI

`src/generated/openapi-types.ts` se genera con `openapi-typescript` contra el
spec real publicado por `apps/api` en `GET /api/docs-json`
(`pnpm --filter @erp/api-client run generate-types`, requiere un servidor
`apps/api` corriendo en `http://127.0.0.1:3000`). El archivo se versiona en
Git — a diferencia del cliente de Prisma, regenerarlo requiere un servidor
HTTP vivo, no solo un archivo de schema, así que no hay manera de producirlo
en un `pnpm install` limpio o en CI sin levantar toda la infraestructura.

`src/contracts.ts` deriva cada tipo público desde
`components["schemas"][...]` de ese archivo generado, salvo dos excepciones
documentadas en la cabecera del propio archivo: los campos de valor JSON
genuinamente dinámico (`value`, `data`, `previousValues`, `newValues`,
`defaultValue`, que OpenAPI solo puede describir como objeto vacío) se
sobrescriben a `unknown`, y `ApiErrorEnvelope` describe el filtro de
excepciones HTTP global, no un DTO de Nest/Swagger.

Tras cualquier cambio a un DTO o controller de `apps/api` que afecte su forma
pública, regenerar este archivo y volver a compilar `@erp/api-client` y
`apps/erp-web` para confirmar que el cambio es intencional.
