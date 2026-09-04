import { useEffect, useState, type ReactNode } from "react";
import type { TenantSummary } from "@erp/api-client";
import { useAuth } from "../shared/auth/auth-context";
import { useRouter } from "../shared/navigation/router";
import { CommandPalette } from "../features/command-palette/command-palette";
import { LoginPage } from "../features/auth/login-page";
import { RegisterPage } from "../features/auth/register-page";
import { OnboardingPage } from "../features/tenants/onboarding-page";
import { TenantListPage } from "../features/tenants/tenant-list-page";
import { WorkspacePage } from "../features/workspace/workspace-page";
import { RolesPermissionsPage } from "../features/access-control/roles-permissions-page";
import { SettingsPage } from "../features/configuration/settings-page";
import { AppsPage } from "../features/app-registry/apps-page";
import { CatalogPage } from "../features/catalog/catalog-page";
import { ContactsPage } from "../features/contacts/contacts-page";
import { CommercialPage } from "../features/commercial/commercial-page";
import { InventoryPage } from "../features/inventory/inventory-page";
import { SalesPage } from "../features/sales/sales-page";
import { PurchasingPage } from "../features/purchasing/purchasing-page";
import { PosPage } from "../features/pos/pos-page";
import { CommercePage } from "../features/commerce/commerce-page";
import { AccountingPage } from "../features/accounting/accounting-page";
import { CrmPage } from "../features/crm/crm-page";
import { ManufacturingPage } from "../features/manufacturing/manufacturing-page";
import { PlatformAdminPage } from "../features/platform-admin/platform-admin-page";

interface WorkspaceSelection extends TenantSummary {
  companyId?: string;
}

export function App() {
  const { session, isBootstrapping } = useAuth();
  const { path, navigate } = useRouter();
  const [selection, setSelection] = useState<WorkspaceSelection | null>(null);
  const isAuthPath = path === "/login" || path === "/register";

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }
    if (!session && !isAuthPath) {
      navigate("/login", true);
      return;
    }
    if (session && isAuthPath) {
      navigate("/tenants", true);
      return;
    }
    if (
      session &&
      (path === "/workspace" ||
        path === "/roles" ||
        path === "/settings" ||
        path === "/apps" ||
        path === "/catalog" ||
        path === "/contacts" ||
        path === "/commercial" ||
        path === "/inventory" ||
        path === "/sales" ||
        path === "/purchasing" ||
        path === "/pos" ||
        path === "/commerce" ||
        path === "/accounting" ||
        path === "/crm" ||
        path === "/manufacturing") &&
      !selection
    ) {
      navigate("/tenants", true);
    }
    if (session && path === "/platform-admin" && !session.user.isPlatformAdmin) {
      navigate("/tenants", true);
    }
  }, [isAuthPath, isBootstrapping, navigate, path, selection, session]);

  if (isBootstrapping) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[var(--paper)]">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
          Cargando…
        </p>
      </main>
    );
  }

  if (!session) {
    return path === "/register" ? (
      <RegisterPage navigate={navigate} />
    ) : (
      <LoginPage navigate={navigate} />
    );
  }

  if (path === "/onboarding") {
    return <OnboardingPage navigate={navigate} onProvisioned={setSelection} />;
  }

  let page: ReactNode = <TenantListPage navigate={navigate} onSelect={setSelection} />;

  if (path === "/workspace" && selection) {
    page = <WorkspacePage selection={selection} navigate={navigate} />;
  } else if (path === "/roles" && selection) {
    page = <RolesPermissionsPage selection={selection} navigate={navigate} />;
  } else if (path === "/settings" && selection) {
    page = <SettingsPage selection={selection} navigate={navigate} />;
  } else if (path === "/apps" && selection) {
    page = <AppsPage selection={selection} navigate={navigate} />;
  } else if (path === "/catalog" && selection) {
    page = <CatalogPage selection={selection} navigate={navigate} />;
  } else if (path === "/contacts" && selection) {
    page = <ContactsPage selection={selection} navigate={navigate} />;
  } else if (path === "/commercial" && selection) {
    page = <CommercialPage selection={selection} navigate={navigate} />;
  } else if (path === "/inventory" && selection) {
    page = <InventoryPage selection={selection} navigate={navigate} />;
  } else if (path === "/sales" && selection) {
    page = <SalesPage selection={selection} navigate={navigate} />;
  } else if (path === "/purchasing" && selection) {
    page = <PurchasingPage selection={selection} navigate={navigate} />;
  } else if (path === "/pos" && selection) {
    page = <PosPage selection={selection} navigate={navigate} />;
  } else if (path === "/commerce" && selection) {
    page = <CommercePage selection={selection} navigate={navigate} />;
  } else if (path === "/accounting" && selection) {
    page = <AccountingPage selection={selection} navigate={navigate} />;
  } else if (path === "/crm" && selection) {
    page = <CrmPage selection={selection} navigate={navigate} />;
  } else if (path === "/manufacturing" && selection) {
    page = <ManufacturingPage selection={selection} navigate={navigate} />;
  } else if (path === "/platform-admin" && session.user.isPlatformAdmin) {
    page = <PlatformAdminPage navigate={navigate} />;
  }

  return (
    <>
      {page}
      {selection && path !== "/tenants" ? (
        <CommandPalette
          key={selection.companyId ?? selection.tenantId}
          selection={selection}
          navigate={navigate}
          isPlatformAdmin={session.user.isPlatformAdmin}
        />
      ) : null}
    </>
  );
}
