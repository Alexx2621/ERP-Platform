import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "../../shared/api/client";
import { CrmPage } from "./crm-page";

const authContext = vi.hoisted(() => ({
  session: {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    accessExpiresAt: "2099-01-01T00:00:00.000Z",
    refreshExpiresAt: "2099-01-02T00:00:00.000Z",
    user: { id: "user-1", email: "owner@example.com", displayName: "Propietaria" },
  },
  getAccessToken: vi.fn().mockResolvedValue("access-token"),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("../../shared/auth/auth-context", () => ({
  useAuth: () => authContext,
}));

const navigate = vi.fn();

const selectionWithoutCompany = {
  tenantId: "tenant-1",
  slug: "grupo-aurora",
  name: "Grupo Aurora",
  membershipId: "membership-1",
};

const selection = { ...selectionWithoutCompany, companyId: "company-1" };

const showModalMock = vi.fn(function show(this: HTMLDialogElement) {
  this.setAttribute("open", "");
});

const closeModalMock = vi.fn(function close(this: HTMLDialogElement) {
  this.removeAttribute("open");
});

const lead = {
  id: "lead-1",
  name: "Grace Hopper",
  companyName: "Hopper Analytics",
  email: "grace@hopper.dev",
  phone: null,
  source: null,
  status: "NEW" as const,
  ownerId: "user-1",
  consentMarketing: false,
  consentedAt: null,
  convertedCustomerId: null,
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
};

const pipeline = {
  id: "pipeline-1",
  code: "SALES",
  name: "Sales Pipeline",
  status: "ACTIVE" as const,
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
};

const stage = { id: "stage-1", pipelineId: "pipeline-1", name: "Qualification", sortOrder: 0, isWon: false, isLost: false };

describe("CrmPage", () => {
  beforeAll(() => {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, writable: true, value: showModalMock });
    Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, writable: true, value: closeModalMock });
  });

  afterAll(() => {
    Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("asks the user to select a company when none is active", () => {
    render(<CrmPage selection={selectionWithoutCompany} navigate={navigate} />);

    expect(screen.getByText("Selecciona una empresa desde el selector de tenant para administrar el CRM.")).toBeInTheDocument();
  });

  it("creates a lead, converts it, creates a pipeline with a stage, and logs an activity", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "listPipelines").mockResolvedValue([]);
    vi.spyOn(apiClient, "listOpportunities").mockResolvedValue([]);
    vi.spyOn(apiClient, "listActivities").mockResolvedValue([]);
    vi.spyOn(apiClient, "listLeads").mockResolvedValue([]);
    const createLead = vi.spyOn(apiClient, "createLead").mockResolvedValue(lead);
    const convertLead = vi.spyOn(apiClient, "convertLead").mockResolvedValue({
      lead: { ...lead, status: "CONVERTED", convertedCustomerId: "customer-1" },
      customerId: "customer-1",
      wasExistingCustomer: false,
    });
    const createPipeline = vi.spyOn(apiClient, "createPipeline").mockResolvedValue(pipeline);
    const addPipelineStage = vi.spyOn(apiClient, "addPipelineStage").mockResolvedValue(stage);
    const createActivity = vi.spyOn(apiClient, "createActivity").mockResolvedValue({
      id: "activity-1",
      type: "NOTE",
      subject: "Deal closed won",
      notes: null,
      relatedLeadId: null,
      relatedOpportunityId: null,
      relatedCustomerId: "customer-1",
      ownerId: "user-1",
      dueAt: null,
      completedAt: null,
      createdAt: "2026-09-02T00:00:00.000Z",
    });

    render(<CrmPage selection={selection} navigate={navigate} />);

    // --- Prospectos: create a lead ---
    await user.click(await screen.findByRole("button", { name: /Nuevo prospecto/i }));
    const leadModal = await screen.findByRole("dialog", { name: "Nuevo prospecto" });
    await user.type(within(leadModal).getByLabelText("Nombre"), "Grace Hopper");
    await user.type(within(leadModal).getByLabelText("Empresa"), "Hopper Analytics");
    await user.type(within(leadModal).getByLabelText("Correo"), "grace@hopper.dev");
    await user.click(within(leadModal).getByRole("button", { name: "Crear" }));

    await waitFor(() =>
      expect(createLead).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", {
        name: "Grace Hopper",
        companyName: "Hopper Analytics",
        email: "grace@hopper.dev",
        phone: undefined,
        source: undefined,
      }),
    );

    // --- Convert the lead ---
    await user.click(await screen.findByRole("button", { name: /Convertir/i }));
    await waitFor(() => expect(convertLead).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", "lead-1"));
    expect(await screen.findByText(/Cliente nuevo creado/)).toBeInTheDocument();

    // --- Pipelines: create a pipeline and a stage ---
    await user.click(screen.getByRole("tab", { name: /Pipelines/i }));
    await user.click(await screen.findByRole("button", { name: /Nuevo pipeline/i }));
    const pipelineModal = await screen.findByRole("dialog", { name: "Nuevo pipeline" });
    await user.type(within(pipelineModal).getByLabelText("Código"), "SALES");
    await user.type(within(pipelineModal).getByLabelText("Nombre"), "Sales Pipeline");
    await user.click(within(pipelineModal).getByRole("button", { name: "Crear" }));

    await waitFor(() =>
      expect(createPipeline).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", { code: "SALES", name: "Sales Pipeline" }),
    );

    vi.spyOn(apiClient, "listPipelineStages").mockResolvedValue([]);
    await user.click(await screen.findByRole("button", { name: /Etapas/i }));
    const stagesModal = await screen.findByRole("dialog", { name: "Etapas · Sales Pipeline" });
    await user.type(within(stagesModal).getByLabelText("Nombre"), "Qualification");
    await user.click(within(stagesModal).getByRole("button", { name: "Agregar" }));

    await waitFor(() =>
      expect(addPipelineStage).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", "pipeline-1", {
        name: "Qualification",
        isWon: false,
        isLost: false,
      }),
    );

    // --- Actividades: log an activity related to the (now real) customer ---
    await user.click(within(stagesModal).getByRole("button", { name: "Cerrar modal" }));

    await user.click(screen.getByRole("tab", { name: /Actividades/i }));
    await user.click(await screen.findByRole("button", { name: /Nueva actividad/i }));
    const activityModal = await screen.findByRole("dialog", { name: "Nueva actividad" });
    await user.type(within(activityModal).getByLabelText("Asunto"), "Deal closed won");
    await user.selectOptions(within(activityModal).getByLabelText("Relacionar con"), "customer");
    await user.type(within(activityModal).getByLabelText("ID de cliente", { exact: false }), "customer-1");
    await user.click(within(activityModal).getByRole("button", { name: "Crear" }));

    await waitFor(() =>
      expect(createActivity).toHaveBeenCalledWith("access-token", "grupo-aurora", "company-1", {
        type: "NOTE",
        subject: "Deal closed won",
        notes: undefined,
        dueAt: undefined,
        relatedLeadId: undefined,
        relatedOpportunityId: undefined,
        relatedCustomerId: "customer-1",
      }),
    );
  }, 20_000);
});
