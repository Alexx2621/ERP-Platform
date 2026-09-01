import { useEffect, useState } from "react";
import type { TenantSummary } from "@erp/api-client";
import { useAuth } from "../shared/auth/auth-context";
import { useRouter } from "../shared/navigation/router";
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
import { PlatformAdminPage } from "../features/platform-admin/platform-admin-page";

interface WorkspaceSelection extends TenantSummary {
  companyId?: string;
}

export function App() {
  const { session } = useAuth();
  const { path, navigate } = useRouter();
  const [selection, setSelection] = useState<WorkspaceSelection | null>(null);
  const isAuthPath = path === "/login" || path === "/register";

  useEffect(() => {
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
        path === "/purchasing") &&
      !selection
    ) {
      navigate("/tenants", true);
    }
    if (session && path === "/platform-admin" && !session.user.isPlatformAdmin) {
      navigate("/tenants", true);
    }
  }, [isAuthPath, navigate, path, selection, session]);

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

  if (path === "/workspace" && selection) {
    return <WorkspacePage selection={selection} navigate={navigate} />;
  }

  if (path === "/roles" && selection) {
    return <RolesPermissionsPage selection={selection} navigate={navigate} />;
  }

  if (path === "/settings" && selection) {
    return <SettingsPage selection={selection} navigate={navigate} />;
  }

  if (path === "/apps" && selection) {
    return <AppsPage selection={selection} navigate={navigate} />;
  }

  if (path === "/catalog" && selection) {
    return <CatalogPage selection={selection} navigate={navigate} />;
  }

  if (path === "/contacts" && selection) {
    return <ContactsPage selection={selection} navigate={navigate} />;
  }

  if (path === "/commercial" && selection) {
    return <CommercialPage selection={selection} navigate={navigate} />;
  }

  if (path === "/inventory" && selection) {
    return <InventoryPage selection={selection} navigate={navigate} />;
  }

  if (path === "/sales" && selection) {
    return <SalesPage selection={selection} navigate={navigate} />;
  }

  if (path === "/purchasing" && selection) {
    return <PurchasingPage selection={selection} navigate={navigate} />;
  }

  if (path === "/platform-admin" && session.user.isPlatformAdmin) {
    return <PlatformAdminPage navigate={navigate} />;
  }

  return <TenantListPage navigate={navigate} onSelect={setSelection} />;
}
