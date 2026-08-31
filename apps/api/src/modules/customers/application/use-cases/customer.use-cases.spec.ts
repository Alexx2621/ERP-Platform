import { InMemoryCustomerRepository } from "../../test-support/in-memory-customer.repository";
import { CreateCustomerUseCase } from "./create-customer.use-case";
import { UpdateCustomerUseCase } from "./update-customer.use-case";
import { ListCustomersUseCase } from "./list-customers.use-case";
import { SetCustomerStatusUseCase } from "./set-customer-status.use-case";
import { CustomerCodeAlreadyInUseError, CustomerNotFoundError, CustomerTaxIdAlreadyInUseError } from "../errors";

function buildContext() {
  const customers = new InMemoryCustomerRepository();
  return {
    customers,
    createCustomer: new CreateCustomerUseCase(customers),
    updateCustomer: new UpdateCustomerUseCase(customers),
    listCustomers: new ListCustomersUseCase(customers),
    setStatus: new SetCustomerStatusUseCase(customers),
  };
}

describe("Customer use cases", () => {
  it("creates a customer", async () => {
    const { createCustomer } = buildContext();
    const customer = await createCustomer.execute({ tenantId: "t1", companyId: "c1", code: "CUST-01", name: "Acme" });
    expect(customer.code).toBe("CUST-01");
    expect(customer.status).toBe("ACTIVE");
  });

  it("rejects a duplicate code within the same company", async () => {
    const { createCustomer } = buildContext();
    await createCustomer.execute({ tenantId: "t1", companyId: "c1", code: "CUST-01", name: "Acme" });
    await expect(
      createCustomer.execute({ tenantId: "t1", companyId: "c1", code: "CUST-01", name: "Other" }),
    ).rejects.toThrow(CustomerCodeAlreadyInUseError);
  });

  it("allows the same code in a different company", async () => {
    const { createCustomer } = buildContext();
    await createCustomer.execute({ tenantId: "t1", companyId: "c1", code: "CUST-01", name: "Acme" });
    await expect(
      createCustomer.execute({ tenantId: "t1", companyId: "c2", code: "CUST-01", name: "Acme" }),
    ).resolves.toBeDefined();
  });

  it("rejects a duplicate tax id within the same company", async () => {
    const { createCustomer } = buildContext();
    await createCustomer.execute({ tenantId: "t1", companyId: "c1", code: "CUST-01", name: "Acme", taxId: "TAX-1" });
    await expect(
      createCustomer.execute({ tenantId: "t1", companyId: "c1", code: "CUST-02", name: "Other", taxId: "TAX-1" }),
    ).rejects.toThrow(CustomerTaxIdAlreadyInUseError);
  });

  it("allows multiple customers with no tax id in the same company", async () => {
    const { createCustomer } = buildContext();
    await createCustomer.execute({ tenantId: "t1", companyId: "c1", code: "CUST-01", name: "Acme" });
    await expect(
      createCustomer.execute({ tenantId: "t1", companyId: "c1", code: "CUST-02", name: "Other" }),
    ).resolves.toBeDefined();
  });

  it("updates a customer's fields", async () => {
    const { createCustomer, updateCustomer } = buildContext();
    const customer = await createCustomer.execute({ tenantId: "t1", companyId: "c1", code: "CUST-01", name: "Acme" });
    const updated = await updateCustomer.execute({
      tenantId: "t1",
      companyId: "c1",
      id: customer.id,
      name: "Acme Corp",
      email: "billing@acme.test",
    });
    expect(updated.name).toBe("Acme Corp");
    expect(updated.email).toBe("billing@acme.test");
  });

  it("keeps taxId/email unchanged when omitted from an update, and clears them when sent as an empty string", async () => {
    const { createCustomer, updateCustomer } = buildContext();
    const customer = await createCustomer.execute({
      tenantId: "t1",
      companyId: "c1",
      code: "CUST-01",
      name: "Acme",
      taxId: "TAX-1",
      email: "billing@acme.test",
    });

    const keptUpdate = await updateCustomer.execute({ tenantId: "t1", companyId: "c1", id: customer.id, name: "Acme" });
    expect(keptUpdate.taxId).toBe("TAX-1");
    expect(keptUpdate.email).toBe("billing@acme.test");

    const clearedUpdate = await updateCustomer.execute({
      tenantId: "t1",
      companyId: "c1",
      id: customer.id,
      name: "Acme",
      taxId: "",
      email: "",
    });
    expect(clearedUpdate.taxId).toBeNull();
    expect(clearedUpdate.email).toBeNull();
  });

  it("rejects updating a customer from a different company as not found", async () => {
    const { createCustomer, updateCustomer } = buildContext();
    const customer = await createCustomer.execute({ tenantId: "t1", companyId: "c1", code: "CUST-01", name: "Acme" });
    await expect(
      updateCustomer.execute({ tenantId: "t1", companyId: "c2", id: customer.id, name: "X" }),
    ).rejects.toThrow(CustomerNotFoundError);
  });

  it("lists customers scoped to a company", async () => {
    const { createCustomer, listCustomers } = buildContext();
    await createCustomer.execute({ tenantId: "t1", companyId: "c1", code: "CUST-01", name: "Acme" });
    await createCustomer.execute({ tenantId: "t1", companyId: "c2", code: "CUST-02", name: "Other" });
    expect(await listCustomers.execute("t1", "c1")).toHaveLength(1);
  });

  it("toggles status", async () => {
    const { createCustomer, setStatus } = buildContext();
    const customer = await createCustomer.execute({ tenantId: "t1", companyId: "c1", code: "CUST-01", name: "Acme" });
    const updated = await setStatus.execute({ tenantId: "t1", companyId: "c1", id: customer.id, status: "INACTIVE" });
    expect(updated.status).toBe("INACTIVE");
  });
});
