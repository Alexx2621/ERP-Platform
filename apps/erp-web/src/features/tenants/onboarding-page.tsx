import { ArrowLeft, ArrowRight, Buildings, Check, Factory } from "@phosphor-icons/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiClient } from "../../shared/api/api-client";
import type { TenantSummary } from "../../shared/api/contracts";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import type { AppPath } from "../../shared/navigation/router";
import { Button } from "../../shared/ui/button";
import { FormField } from "../../shared/ui/form-field";
import { ErrorNotice } from "../../shared/ui/notice";
import { ProductShell } from "../workspace/product-shell";

const codeSchema = z
  .string()
  .trim()
  .min(2, "Usa al menos 2 caracteres.")
  .max(32, "Usa 32 caracteres o menos.")
  .regex(/^[A-Za-z0-9_-]+$/, "Usa letras, números, guiones o guion bajo.");

const onboardingSchema = z
  .object({
    tenantName: z.string().trim().min(2, "Ingresa el nombre del espacio.").max(120),
    tenantSlug: z
      .string()
      .trim()
      .min(3, "Usa al menos 3 caracteres.")
      .max(63)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usa minúsculas, números y guiones simples."),
    organizationName: z.string().trim().min(2, "Ingresa el nombre legal.").max(160),
    organizationCode: codeSchema,
    includeCompany: z.boolean(),
    companyName: z.string(),
    companyCode: z.string(),
  })
  .superRefine((values, context) => {
    if (!values.includeCompany) {
      return;
    }
    const companyNameResult = z.string().trim().min(2).max(160).safeParse(values.companyName);
    if (!companyNameResult.success) {
      context.addIssue({
        code: "custom",
        path: ["companyName"],
        message: "Ingresa el nombre de la empresa.",
      });
    }
    const companyCodeResult = codeSchema.safeParse(values.companyCode);
    if (!companyCodeResult.success) {
      context.addIssue({
        code: "custom",
        path: ["companyCode"],
        message: companyCodeResult.error.issues[0]?.message ?? "Ingresa un código válido.",
      });
    }
  });

type OnboardingValues = z.infer<typeof onboardingSchema>;

interface ProvisionedSelection extends TenantSummary {
  companyId?: string;
}

interface OnboardingPageProps {
  navigate: (path: AppPath, replace?: boolean) => void;
  onProvisioned: (selection: ProvisionedSelection) => void;
}

function toSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function OnboardingPage({ navigate, onProvisioned }: OnboardingPageProps) {
  const { getAccessToken } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      includeCompany: true,
      companyName: "",
      companyCode: "",
    },
  });
  const includeCompany = watch("includeCompany");

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const accessToken = await getAccessToken();
      const response = await apiClient.provisionTenant(accessToken, {
        slug: values.tenantSlug,
        name: values.tenantName.trim(),
        organization: {
          code: values.organizationCode.trim().toUpperCase(),
          name: values.organizationName.trim(),
        },
        company: values.includeCompany
          ? {
              code: values.companyCode.trim().toUpperCase(),
              name: values.companyName.trim(),
            }
          : undefined,
      });
      onProvisioned({
        tenantId: response.tenant.id,
        slug: response.tenant.slug,
        name: response.tenant.name,
        membershipId: response.membership.id,
        companyId: response.company?.id,
      });
      navigate("/workspace", true);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    }
  });

  return (
    <ProductShell
      eyebrow="Alta inicial"
      title="Configura tu operación"
      description="Crea el tenant y su estructura mínima. Los datos quedan separados del resto de organizaciones desde el primer momento."
      action={
        <Button type="button" variant="quiet" onClick={() => navigate("/tenants")}>
          <ArrowLeft size={17} weight="bold" aria-hidden="true" />
          Volver
        </Button>
      }
    >
      <div className="grid gap-8 pt-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form className="grid gap-7" onSubmit={onSubmit} noValidate>
          {submitError ? <ErrorNotice message={submitError} /> : null}

          <fieldset className="rounded-[12px] border border-[var(--line)] bg-[var(--paper)] p-5 sm:p-7">
            <legend className="sr-only">Datos del espacio y la organización</legend>
            <div className="mb-6 flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-[var(--accent-soft)] text-[var(--accent)]">
                <Buildings size={21} weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-[16px] font-extrabold tracking-[-0.025em]">
                  Espacio y organización
                </h2>
                <p className="mt-1 text-[12px] font-medium leading-5 text-[var(--muted)]">
                  El identificador se utilizará para resolver el contexto del tenant.
                </p>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label="Nombre del espacio"
                type="text"
                placeholder="Grupo Aurora"
                autoComplete="organization"
                error={errors.tenantName?.message}
                {...register("tenantName", {
                  onBlur: (event) => {
                    const currentSlug = watch("tenantSlug");
                    if (!currentSlug) {
                      setValue("tenantSlug", toSlug(event.target.value), { shouldValidate: true });
                    }
                  },
                })}
              />
              <FormField
                label="Identificador del espacio"
                type="text"
                placeholder="grupo-aurora"
                autoCapitalize="none"
                spellCheck={false}
                hint="Solo minúsculas, números y guiones."
                error={errors.tenantSlug?.message}
                {...register("tenantSlug", {
                  onChange: (event) =>
                    setValue("tenantSlug", toSlug(event.target.value), { shouldValidate: true }),
                })}
              />
              <FormField
                label="Razón social"
                type="text"
                placeholder="Grupo Aurora, S.A."
                error={errors.organizationName?.message}
                {...register("organizationName")}
              />
              <FormField
                label="Código de organización"
                type="text"
                placeholder="AURORA"
                autoCapitalize="characters"
                error={errors.organizationCode?.message}
                {...register("organizationCode")}
              />
            </div>
          </fieldset>

          <fieldset className="rounded-[12px] border border-[var(--line)] bg-[var(--paper)] p-5 sm:p-7">
            <legend className="sr-only">Empresa inicial</legend>
            <div className="flex items-start justify-between gap-5">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Factory size={21} weight="duotone" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-[16px] font-extrabold tracking-[-0.025em]">
                    Empresa inicial
                  </h2>
                  <p className="mt-1 text-[12px] font-medium leading-5 text-[var(--muted)]">
                    Opcional. Puedes iniciar solo con la organización.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" {...register("includeCompany")} />
                <span className="h-6 w-11 rounded-full bg-[var(--line-strong)] transition-colors peer-checked:bg-[var(--accent)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)] after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
                <span className="sr-only">Crear empresa inicial</span>
              </label>
            </div>
            {includeCompany ? (
              <div className="mt-6 grid gap-5 border-t border-[var(--line)] pt-6 sm:grid-cols-2">
                <FormField
                  label="Nombre comercial"
                  type="text"
                  placeholder="Aurora Guatemala"
                  error={errors.companyName?.message}
                  {...register("companyName")}
                />
                <FormField
                  label="Código de empresa"
                  type="text"
                  placeholder="GT01"
                  autoCapitalize="characters"
                  error={errors.companyCode?.message}
                  {...register("companyCode")}
                />
              </div>
            ) : null}
          </fieldset>

          <div className="flex justify-end">
            <Button type="submit" busy={isSubmitting} className="w-full sm:w-auto">
              Crear espacio
              {!isSubmitting ? <ArrowRight size={17} weight="bold" aria-hidden="true" /> : null}
            </Button>
          </div>
        </form>

        <aside className="h-fit rounded-[12px] border border-[var(--line)] bg-[var(--ink)] p-6 text-[var(--paper)] lg:sticky lg:top-8">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent-light)]">
            Se configurará
          </p>
          <ol className="mt-5 grid gap-4 text-[12px] font-semibold text-white/70">
            {[
              "Tenant aislado",
              "Membresía de propietario",
              "Organización principal",
              includeCompany ? "Empresa inicial" : null,
            ]
              .filter(Boolean)
              .map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/8 text-[var(--accent-light)]">
                    <Check size={13} weight="bold" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
          </ol>
        </aside>
      </div>
    </ProductShell>
  );
}
