import type { TenantSummary } from "@erp/api-client";
import { HomeDashboard } from "../home/home-dashboard";
import type { AppPath } from "../../shared/navigation/router";
import { ProductShell } from "./product-shell";

interface WorkspaceSelection extends TenantSummary {
  companyId?: string;
}

interface WorkspacePageProps {
  selection: WorkspaceSelection;
  navigate: (path: AppPath, replace?: boolean) => void;
}

export function WorkspacePage({ selection, navigate }: WorkspacePageProps) {
  return (
    <ProductShell
      eyebrow={`Tenant / ${selection.slug}`}
      title={selection.name}
      description="Arrastra los widgets para reordenarlos, o usa los controles de cada tarjeta para cambiar su tamaño o quitarla."
      navigate={navigate}
    >
      <HomeDashboard selection={selection} navigate={navigate} />
    </ProductShell>
  );
}
