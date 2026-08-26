import { ArrowRight } from "@phosphor-icons/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { getErrorMessage } from "../../shared/api/error-message";
import { useAuth } from "../../shared/auth/auth-context";
import type { AppPath } from "../../shared/navigation/router";
import { Button } from "../../shared/ui/button";
import { FormField } from "../../shared/ui/form-field";
import { ErrorNotice } from "../../shared/ui/notice";
import { AuthShell } from "./auth-shell";

const registerSchema = z.object({
  displayName: z.string().trim().min(2, "Ingresa tu nombre completo.").max(120),
  email: z.email("Ingresa un correo válido."),
  password: z
    .string()
    .min(8, "Usa al menos 8 caracteres.")
    .max(128)
    .regex(/[A-Z]/, "Incluye al menos una mayúscula.")
    .regex(/[a-z]/, "Incluye al menos una minúscula.")
    .regex(/[0-9]/, "Incluye al menos un número."),
});

type RegisterValues = z.infer<typeof registerSchema>;

interface RegisterPageProps {
  navigate: (path: AppPath, replace?: boolean) => void;
}

export function RegisterPage({ navigate }: RegisterPageProps) {
  const { register: createAccount } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await createAccount(values);
      navigate("/onboarding", true);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    }
  });

  return (
    <AuthShell>
      <div className="w-full">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
          Nueva cuenta
        </p>
        <h2 className="mt-4 text-[clamp(2rem,5vw,3.15rem)] font-extrabold leading-[1.03] tracking-[-0.055em]">
          Prepara tu espacio.
        </h2>
        <p className="mt-4 text-[14px] font-medium leading-6 text-[var(--muted-strong)]">
          Crea tu identidad de acceso. Después configuraremos la organización.
        </p>

        <form className="mt-8 grid gap-4.5" onSubmit={onSubmit} noValidate>
          {submitError ? <ErrorNotice message={submitError} /> : null}
          <FormField
            label="Nombre completo"
            type="text"
            autoComplete="name"
            placeholder="María López"
            error={errors.displayName?.message}
            {...register("displayName")}
          />
          <FormField
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            placeholder="nombre@empresa.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <FormField
            label="Contraseña"
            type="password"
            autoComplete="new-password"
            placeholder="Mayúscula, minúscula y número"
            error={errors.password?.message}
            {...register("password")}
          />
          <Button type="submit" busy={isSubmitting} className="mt-2 w-full">
            Crear cuenta
            {!isSubmitting ? <ArrowRight size={17} weight="bold" aria-hidden="true" /> : null}
          </Button>
        </form>

        <p className="mt-7 text-center text-[13px] font-semibold text-[var(--muted-strong)]">
          ¿Ya tienes una cuenta?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="font-extrabold text-[var(--accent)] underline-offset-4 hover:underline"
          >
            Ingresar
          </button>
        </p>
      </div>
    </AuthShell>
  );
}
