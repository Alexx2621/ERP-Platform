import { InMemoryCustomerRepository } from "../../test-support/in-memory-customer.repository";
import { CreateCustomerUseCase } from "./create-customer.use-case";
import { FindCustomerByEmailUseCase } from "./find-customer-by-email.use-case";

describe("FindCustomerByEmailUseCase", () => {
  it("finds a customer by email, case-insensitively", async () => {
    const customers = new InMemoryCustomerRepository();
    const createCustomer = new CreateCustomerUseCase(customers);
    const findByEmail = new FindCustomerByEmailUseCase(customers);

    const created = await createCustomer.execute({ tenantId: "t1", companyId: "c1", code: "CUST-1", name: "Ada", email: "Ada@Example.com" });

    const found = await findByEmail.execute("t1", "c1", "ada@example.com");
    expect(found?.id).toBe(created.id);
  });

  it("returns null when no customer has that email", async () => {
    const customers = new InMemoryCustomerRepository();
    const findByEmail = new FindCustomerByEmailUseCase(customers);
    expect(await findByEmail.execute("t1", "c1", "nobody@example.com")).toBeNull();
  });

  it("is scoped by company — the same email in a different company is not found", async () => {
    const customers = new InMemoryCustomerRepository();
    const createCustomer = new CreateCustomerUseCase(customers);
    const findByEmail = new FindCustomerByEmailUseCase(customers);
    await createCustomer.execute({ tenantId: "t1", companyId: "c1", code: "CUST-1", name: "Ada", email: "ada@example.com" });

    expect(await findByEmail.execute("t1", "c2", "ada@example.com")).toBeNull();
  });
});
