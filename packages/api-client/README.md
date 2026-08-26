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
y pruebas. Mientras OpenAPI no esté disponible, los contratos se mantienen a
mano en este paquete como única fuente para los consumidores TypeScript.
