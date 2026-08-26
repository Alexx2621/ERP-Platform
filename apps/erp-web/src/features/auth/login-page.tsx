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

const loginSchema = z.object({
  email: z.email("Ingresa un correo válido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

type LoginValues = z.infer<typeof loginSchema>;

interface LoginPageProps {
  navigate: (path: AppPath, replace?: boolean) => void;
}

export function LoginPage({ navigate }: LoginPageProps) {
  const { login } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await login(values);
      navigate("/tenants", true);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    }
  });

  return (
    <AuthShell>
      <div className="w-full">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
          Acceso seguro
        </p>
        <h2 className="mt-4 text-[clamp(2rem,5vw,3.15rem)] font-extrabold leading-[1.03] tracking-[-0.055em]">
          Bienvenido de nuevo.
        </h2>
        <p className="mt-4 text-[14px] font-medium leading-6 text-[var(--muted-strong)]">
          Ingresa para continuar a tus espacios de trabajo.
        </p>

        <form className="mt-9 grid gap-5" onSubmit={onSubmit} noValidate>
          {submitError ? <ErrorNotice message={submitError} /> : null}
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
            autoComplete="current-password"
            placeholder="8 caracteres o más"
            error={errors.password?.message}
            {...register("password")}
          />
          <Button type="submit" busy={isSubmitting} className="mt-2 w-full">
            Ingresar
            {!isSubmitting ? <ArrowRight size={17} weight="bold" aria-hidden="true" /> : null}
          </Button>
        </form>

        <p className="mt-7 text-center text-[13px] font-semibold text-[var(--muted-strong)]">
          ¿Aún no tienes cuenta?{" "}
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="font-extrabold text-[var(--accent)] underline-offset-4 hover:underline"
          >
            Crear cuenta
          </button>
        </p>
      </div>
    </AuthShell>
  );
}
