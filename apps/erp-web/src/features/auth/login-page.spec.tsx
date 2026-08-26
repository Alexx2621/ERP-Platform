import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "../../shared/api/client";
import { AuthProvider } from "../../shared/auth/auth-context";
import { LoginPage } from "./login-page";

const session = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  accessExpiresAt: "2099-01-01T00:00:00.000Z",
  refreshExpiresAt: "2099-01-02T00:00:00.000Z",
  user: { id: "user-1", email: "ana@example.com", displayName: "Ana" },
};

describe("LoginPage", () => {
  it("shows accessible validation before calling the API", async () => {
    const user = userEvent.setup();
    const loginMock = vi.spyOn(apiClient, "login");
    render(
      <AuthProvider>
        <LoginPage navigate={vi.fn()} />
      </AuthProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(await screen.findByText("Ingresa un correo válido.")).toBeInTheDocument();
    expect(screen.getByText("La contraseña debe tener al menos 8 caracteres.")).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("creates a session and advances to tenant selection", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "login").mockResolvedValue(session);
    const navigate = vi.fn();
    render(
      <AuthProvider>
        <LoginPage navigate={navigate} />
      </AuthProvider>,
    );

    await user.type(screen.getByLabelText("Correo electrónico"), "ana@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "Password1");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(navigate).toHaveBeenCalledWith("/tenants", true);
  });
});
