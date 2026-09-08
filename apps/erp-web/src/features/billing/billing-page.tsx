import {
  ArrowSquareOut,
  CheckCircle,
  ClockCounterClockwise,
  CreditCard,
  Sparkle,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import type {
  BillingActivityResponse,
  PlanResponse,
  TenantSubscriptionResponse,
  TenantSummary,
} from "@erp/api-client";
import { apiClient } from "../../shared/api/client";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import { formatDateTime } from "../../shared/format/date";
import { formatMoney } from "../../shared/format/money";
import type { AppPath } from "../../shared/navigation/router";
import { Button } from "../../shared/ui/button";
import { Card, CardBody, CardHeader } from "../../shared/ui/card";
import { ErrorNotice, SetupNotice } from "../../shared/ui/notice";
import { PageLoading } from "../../shared/ui/page-loading";
import { StatusBadge } from "../../shared/ui/status-badge";
import { TONE } from "../../shared/ui/tone-colors";
import { ProductShell } from "../workspace/product-shell";
import { activityLabel, subscriptionStatusLabel, subscriptionStatusTone } from "./billing-shared";

interface WorkspaceSelection extends TenantSummary {
  companyId?: string;
}

interface BillingPageProps {
  selection: WorkspaceSelection;
  navigate: (path: AppPath, replace?: boolean) => void;
}

export function BillingPage({ selection, navigate }: BillingPageProps) {
  const { getAccessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [subscription, setSubscription] = useState<TenantSubscriptionResponse | null>(null);
  const [activity, setActivity] = useState<BillingActivityResponse[]>([]);
  const [checkoutKey, setCheckoutKey] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const accessToken = await getAccessToken();
        const [plansResult, subscriptionResult, activityResult] = await Promise.all([
          apiClient.listPlans(signal),
          apiClient.getTenantSubscription(accessToken, selection.slug, signal),
          apiClient.listBillingActivity(accessToken, selection.slug, signal),
        ]);
        setPlans(plansResult);
        setSubscription(subscriptionResult);
        setActivity(activityResult);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadError(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    },
    [getAccessToken, selection.slug],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const startCheckout = useCallback(
    async (planKey: string) => {
      setCheckoutError(null);
      setCheckoutKey(planKey);
      try {
        const accessToken = await getAccessToken();
        const returnUrl = window.location.href;
        const result = await apiClient.createCheckoutSession(accessToken, selection.slug, {
          planKey,
          successUrl: returnUrl,
          cancelUrl: returnUrl,
        });
        window.location.href = result.checkoutUrl;
      } catch (error) {
        setCheckoutError(getErrorMessage(error));
        setCheckoutKey(null);
      }
    },
    [getAccessToken, selection.slug],
  );

  const currentPlan = plans.find((plan) => plan.key === subscription?.planKey) ?? null;

  return (
    <ProductShell
      eyebrow="Cuenta"
      title="Facturación"
      description="Plan activo, planes disponibles y el historial real de movimientos de tu suscripción."
      navigate={navigate}
    >
      {isLoading ? (
        <PageLoading />
      ) : loadError ? (
        <ErrorNotice message={loadError} />
      ) : (
        <div className="grid gap-5">
          <Card>
            <CardHeader
              icon={CreditCard}
              tone={TONE.emerald}
              title="Suscripción actual"
              description={subscription ? undefined : "Este espacio todavía no tiene un plan activo."}
            />
            <CardBody>
              {subscription ? (
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="grid gap-1">
                    <p className="text-[16px] font-extrabold text-[var(--ink)]">
                      {currentPlan?.name ?? subscription.planKey}
                    </p>
                    <StatusBadge
                      tone={subscriptionStatusTone(subscription.status)}
                      pulse={subscription.status === "PENDING"}
                    >
                      {subscriptionStatusLabel(subscription.status)}
                    </StatusBadge>
                    <p className="text-[12.5px] font-medium text-[var(--muted)]">
                      {subscription.seatCount} {subscription.seatCount === 1 ? "usuario" : "usuarios"}
                      {subscription.currentPeriodEnd
                        ? ` · Próxima renovación: ${formatDateTime(subscription.currentPeriodEnd)}`
                        : null}
                    </p>
                    {subscription.status === "PENDING" ? (
                      <p className="text-[12px] font-medium text-[var(--muted)]">
                        Todavía no se ha confirmado ningún cobro — completa el pago en Recurrente
                        para activar este plan. Ningún módulo se habilita hasta que Recurrente lo
                        confirme.
                      </p>
                    ) : null}
                  </div>
                  {currentPlan ? (
                    <p className="text-[20px] font-extrabold text-[var(--ink)]">
                      {formatMoney(currentPlan.basePriceAmount, currentPlan.currency)}
                      <span className="text-[12px] font-semibold text-[var(--muted)]">/mes</span>
                    </p>
                  ) : null}
                </div>
              ) : (
                <SetupNotice
                  title="Sin suscripción activa"
                  description="Elige uno de los planes disponibles abajo para activar tu suscripción real con Recurrente."
                />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={Sparkle} tone={TONE.blue} title="Planes disponibles" description="Precios en Quetzales (GTQ)." />
            <CardBody>
              {checkoutError ? (
                <div className="mb-4">
                  <ErrorNotice message={checkoutError} />
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {plans.map((plan) => {
                  const isThisPlan = plan.key === subscription?.planKey;
                  // A checkout being created writes the row immediately so
                  // Recurrente has something to correlate its webhook
                  // against — the plan is only genuinely "current" once a
                  // real charge activated it. Treating PENDING the same as
                  // ACTIVE here was a real bug: a shopper who started
                  // checkout and came back without paying (or without
                  // finishing) saw this plan marked "Plan actual" with a
                  // checkmark, with no way to retry — indistinguishable
                  // from having actually subscribed, even though no app
                  // access was ever granted (that only happens from a real
                  // webhook, see HandleRecurrenteWebhookUseCase).
                  const isCurrent =
                    isThisPlan && (subscription?.status === "ACTIVE" || subscription?.status === "PAST_DUE");
                  const isPendingHere = isThisPlan && subscription?.status === "PENDING";
                  return (
                    <div
                      key={plan.key}
                      className={`grid gap-3 rounded-[14px] border p-4 ${
                        isCurrent
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : "border-[var(--line)] bg-[var(--paper)]"
                      }`}
                    >
                      <div>
                        <p className={`text-[14px] font-extrabold ${isCurrent ? "text-[var(--accent-soft-text)]" : "text-[var(--ink)]"}`}>
                          {plan.name}
                        </p>
                        <p className={`mt-0.5 text-[11.5px] font-medium leading-4 ${isCurrent ? "text-[var(--accent-soft-muted)]" : "text-[var(--muted)]"}`}>
                          {plan.description}
                        </p>
                      </div>
                      <p className={`text-[18px] font-extrabold ${isCurrent ? "text-[var(--accent-soft-text)]" : "text-[var(--ink)]"}`}>
                        {plan.isSelfServe ? (
                          <>
                            {formatMoney(plan.basePriceAmount, plan.currency)}
                            <span className="text-[11px] font-semibold text-[var(--muted)]">/mes</span>
                          </>
                        ) : (
                          "A medida"
                        )}
                      </p>
                      <p className="text-[11px] font-semibold text-[var(--muted)]">
                        {plan.includesAppKeys.length} {plan.includesAppKeys.length === 1 ? "módulo incluido" : "módulos incluidos"}
                      </p>
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--accent-soft-text)]">
                          <CheckCircle size={16} weight="fill" aria-hidden="true" />
                          Plan actual
                        </span>
                      ) : isPendingHere ? (
                        <div className="grid gap-2">
                          <StatusBadge tone={subscriptionStatusTone("PENDING")} pulse>
                            {subscriptionStatusLabel("PENDING")}
                          </StatusBadge>
                          <Button
                            type="button"
                            variant="secondary"
                            busy={checkoutKey === plan.key}
                            onClick={() => void startCheckout(plan.key)}
                          >
                            Completar pago
                          </Button>
                        </div>
                      ) : plan.isSelfServe ? (
                        <Button
                          type="button"
                          variant="secondary"
                          busy={checkoutKey === plan.key}
                          onClick={() => void startCheckout(plan.key)}
                        >
                          {subscription ? "Cambiar a este plan" : "Suscribirse"}
                        </Button>
                      ) : (
                        <p className="text-[11.5px] font-semibold text-[var(--muted)]">
                          Contacta a tu representante comercial para activarlo.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              icon={ClockCounterClockwise}
              tone={TONE.slate}
              title="Movimientos"
              description="Historial real de eventos reportados por Recurrente para esta suscripción."
            />
            <CardBody>
              {activity.length === 0 ? (
                <p className="text-[12.5px] font-medium text-[var(--muted)]">Todavía no hay movimientos registrados.</p>
              ) : (
                <ul className="grid gap-2">
                  {activity.map((event) => (
                    <li
                      key={event.id}
                      className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--line)] px-3.5 py-2.5"
                    >
                      <span className="text-[13px] font-semibold text-[var(--ink)]">{activityLabel(event.eventType)}</span>
                      <span className="shrink-0 text-[11.5px] font-medium text-[var(--muted)]">
                        {formatDateTime(event.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--muted)]">
            <ArrowSquareOut size={13} aria-hidden="true" />
            Los pagos se procesan de forma segura en Recurrente — este sistema nunca almacena datos de tarjeta.
          </p>
        </div>
      )}
    </ProductShell>
  );
}
