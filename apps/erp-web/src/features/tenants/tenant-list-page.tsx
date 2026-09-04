import { ArrowClockwise, ArrowRight, Buildings, EnvelopeSimpleOpen, Plus } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type { CompanyResponse, PendingInvitationResponse, TenantSummary } from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import type { AppPath } from "../../shared/navigation/router";
import { Button } from "../../shared/ui/button";
import { Modal } from "../../shared/ui/modal";
import { ErrorNotice } from "../../shared/ui/notice";
import { ProductShell } from "../workspace/product-shell";

interface WorkspaceSelection extends TenantSummary {
  companyId?: string;
}

interface TenantListPageProps {
  navigate: (path: AppPath, replace?: boolean) => void;
  onSelect: (selection: WorkspaceSelection) => void;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; tenants: TenantSummary[] };

export function TenantListPage({ navigate, onSelect }: TenantListPageProps) {
  const { getAccessToken } = useAuth();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [openingSlug, setOpeningSlug] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<PendingInvitationResponse[] | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [companyPicker, setCompanyPicker] = useState<{ tenant: TenantSummary; companies: CompanyResponse[] } | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoadState({ status: "loading" });

    void getAccessToken()
      .then((token) => apiClient.listTenants(token, controller.signal))
      .then((tenants) => setLoadState({ status: "ready", tenants }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setLoadState({ status: "error", message: getErrorMessage(error) });
      });

    void getAccessToken()
      .then((token) => apiClient.listPendingInvitations(token, controller.signal))
      .then(setInvitations)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        // A failure to load invitations must not block the primary tenant
        // list — the section simply stays hidden rather than surfacing a
        // second error notice on this screen.
        setInvitations([]);
      });

    return () => controller.abort();
  }, [attempt, getAccessToken]);

  const acceptInvitation = async (invitation: PendingInvitationResponse) => {
    setAcceptError(null);
    setAcceptingId(invitation.membershipId);
    try {
      const token = await getAccessToken();
      await apiClient.acceptMembershipInvitation(token, invitation.membershipId, {
        tenantSlug: invitation.tenantSlug,
      });
      setInvitations((current) =>
        (current ?? []).filter((item) => item.membershipId !== invitation.membershipId),
      );
      setAttempt((value) => value + 1);
    } catch (error) {
      setAcceptError(getErrorMessage(error));
    } finally {
      setAcceptingId(null);
    }
  };

  /**
   * `GET /tenants/current` never invents a `companyId` on its own — it only
   * ever echoes back one the caller already supplied — so opening a tenant
   * must discover its companies itself via `GET /tenants/companies` first.
   * Zero or one company resolves immediately (the common case, kept a
   * single click); two or more prompts the picker below. Without this, a
   * tenant reopened from this list (as opposed to right after onboarding,
   * which already knows its own `companyId` from the provisioning
   * response) permanently lost its company context — every company-scoped
   * module then only ever showed "selecciona una empresa", real bug found
   * against a real tenant with a real company already provisioned.
   */
  const openTenant = async (tenant: TenantSummary) => {
    setOpenError(null);
    setOpeningSlug(tenant.slug);
    try {
      const token = await getAccessToken();
      const companies = await apiClient.listCompanies(token, tenant.slug);
      if (companies.length > 1) {
        setCompanyPicker({ tenant, companies });
        return;
      }
      const companyId = companies[0]?.id;
      if (companyId) {
        await apiClient.getTenantContext(token, tenant.slug, companyId);
      }
      onSelect({ ...tenant, companyId });
      navigate("/workspace");
    } catch (error) {
      setOpenError(getErrorMessage(error));
    } finally {
      setOpeningSlug(null);
    }
  };

  const selectCompany = async (companyId: string) => {
    if (!companyPicker) return;
    const { tenant } = companyPicker;
    setOpenError(null);
    setOpeningSlug(tenant.slug);
    try {
      const token = await getAccessToken();
      await apiClient.getTenantContext(token, tenant.slug, companyId);
      setCompanyPicker(null);
      onSelect({ ...tenant, companyId });
      navigate("/workspace");
    } catch (error) {
      setOpenError(getErrorMessage(error));
    } finally {
      setOpeningSlug(null);
    }
  };

  return (
    <ProductShell
      eyebrow="Contexto empresarial"
      title="Tus espacios"
      description="Selecciona el tenant donde quieres trabajar. La plataforma validará tu membresía antes de entrar."
      navigate={navigate}
      action={
        <Button type="button" onClick={() => navigate("/onboarding")}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Nuevo espacio
        </Button>
      }
    >
      <section className="pt-8" aria-live="polite">
        {invitations && invitations.length > 0 ? (
          <section aria-labelledby="pending-invitations-title" className="mb-7 grid gap-3">
            <h2
              id="pending-invitations-title"
              className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-[var(--muted-strong)]"
            >
              Invitaciones pendientes
            </h2>
            {acceptError ? <ErrorNotice message={acceptError} /> : null}
            <ul className="grid gap-2.5">
              {invitations.map((invitation) => (
                <li
                  key={invitation.membershipId}
                  className="flex items-center gap-4 rounded-[12px] border border-[var(--accent)] bg-[var(--accent-soft)] px-5 py-4"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-[var(--paper)] text-[var(--accent)]">
                    <EnvelopeSimpleOpen size={20} weight="duotone" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-extrabold tracking-[-0.02em] text-[var(--accent-soft-text)]">
                      {invitation.tenantName}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--accent-soft-muted)]">
                      {invitation.tenantSlug}
                    </span>
                  </span>
                  <Button
                    type="button"
                    className="shrink-0"
                    busy={acceptingId === invitation.membershipId}
                    disabled={acceptingId !== null && acceptingId !== invitation.membershipId}
                    onClick={() => void acceptInvitation(invitation)}
                  >
                    Aceptar
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {openError ? (
          <div className="mb-5">
            <ErrorNotice message={openError} />
          </div>
        ) : null}

        {loadState.status === "loading" ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[0, 1].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-[12px] border border-[var(--line)] bg-[var(--paper)]"
              />
            ))}
          </div>
        ) : null}

        {loadState.status === "error" ? (
          <div className="max-w-[580px]">
            <ErrorNotice message={loadState.message} />
            <Button
              type="button"
              variant="secondary"
              className="mt-4"
              onClick={() => setAttempt((value) => value + 1)}
            >
              <ArrowClockwise size={17} weight="bold" aria-hidden="true" />
              Reintentar
            </Button>
          </div>
        ) : null}

        {loadState.status === "ready" && loadState.tenants.length === 0 ? (
          <div className="grid min-h-72 place-items-center rounded-[12px] border border-dashed border-[var(--line-strong)] bg-[var(--paper)] px-6 text-center">
            <div className="max-w-[420px]">
              <Buildings
                size={34}
                weight="duotone"
                className="mx-auto text-[var(--accent)]"
                aria-hidden="true"
              />
              <h2 className="mt-5 text-[20px] font-extrabold tracking-[-0.035em]">
                Todavía no tienes un espacio
              </h2>
              <p className="mt-2 text-[13px] font-medium leading-6 text-[var(--muted-strong)]">
                Crea el primer tenant, su organización y una empresa opcional para comenzar.
              </p>
              <Button type="button" className="mt-5" onClick={() => navigate("/onboarding")}>
                Configurar ahora
                <ArrowRight size={17} weight="bold" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : null}

        {loadState.status === "ready" && loadState.tenants.length > 0 ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {loadState.tenants.map((tenant) => (
              <li key={tenant.tenantId}>
                <button
                  type="button"
                  disabled={openingSlug !== null}
                  onClick={() => void openTenant(tenant)}
                  className="group flex min-h-32 w-full items-center gap-4 rounded-[12px] border border-[var(--line)] bg-[var(--paper)] p-5 text-left transition-[border-color,transform,background-color] duration-150 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[var(--field)] disabled:cursor-wait disabled:opacity-60"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-[var(--accent-soft)] text-[var(--accent-soft-text)]">
                    <Buildings size={22} weight="duotone" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-extrabold tracking-[-0.02em]">
                      {tenant.name}
                    </span>
                    <span className="mt-1 block truncate font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                      {tenant.slug}
                    </span>
                  </span>
                  <ArrowRight
                    size={18}
                    weight="bold"
                    className="text-[var(--muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <Modal
        open={companyPicker !== null}
        onOpenChange={(open) => !openingSlug && !open && setCompanyPicker(null)}
        title="Elige una empresa"
        description={
          companyPicker
            ? `${companyPicker.tenant.name} tiene varias empresas activas. Selecciona con cuál quieres trabajar.`
            : undefined
        }
      >
        <ul className="grid gap-2.5">
          {companyPicker?.companies.map((company) => (
            <li key={company.id}>
              <button
                type="button"
                disabled={openingSlug !== null}
                onClick={() => void selectCompany(company.id)}
                className="group flex w-full items-center gap-4 rounded-[12px] border border-[var(--line)] bg-[var(--paper)] p-4 text-left transition-[border-color,background-color] duration-150 hover:border-[var(--accent)] hover:bg-[var(--field)] disabled:cursor-wait disabled:opacity-60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-extrabold tracking-[-0.02em]">
                    {company.name}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                    {company.code}
                  </span>
                </span>
                <ArrowRight
                  size={16}
                  weight="bold"
                  className="text-[var(--muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </ProductShell>
  );
}
