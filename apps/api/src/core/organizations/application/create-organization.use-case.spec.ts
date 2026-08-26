import { InMemoryOrganizationRepository } from "../test-support/in-memory-organization.repository";
import { CreateOrganizationUseCase } from "./create-organization.use-case";
import { OrganizationCodeAlreadyInUseError } from "./errors";

describe("CreateOrganizationUseCase", () => {
  it("creates organizations inside the authenticated tenant scope", async () => {
    const repository = new InMemoryOrganizationRepository();
    const useCase = new CreateOrganizationUseCase(repository);

    const organization = await useCase.execute(
      { tenantId: "tenant-a" },
      { code: " main ", name: "Main Group" },
    );

    expect(organization.tenantId).toBe("tenant-a");
    expect(organization.code).toBe("MAIN");
    expect(await repository.findById("tenant-b", organization.id)).toBeNull();
  });

  it("allows the same code in different tenants but rejects it in the same tenant", async () => {
    const repository = new InMemoryOrganizationRepository();
    const useCase = new CreateOrganizationUseCase(repository);
    await useCase.execute({ tenantId: "tenant-a" }, { code: "MAIN", name: "A" });
    await useCase.execute({ tenantId: "tenant-b" }, { code: "MAIN", name: "B" });

    await expect(
      useCase.execute({ tenantId: "tenant-a" }, { code: "main", name: "Duplicate" }),
    ).rejects.toThrow(OrganizationCodeAlreadyInUseError);
  });
});
