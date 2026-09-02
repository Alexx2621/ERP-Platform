import { StorefrontProduct } from "./storefront-product.entity";

describe("StorefrontProduct entity", () => {
  it("unpublish/republish toggle status", () => {
    const publication = StorefrontProduct.create({
      id: "sp-1",
      tenantId: "tenant-1",
      storefrontId: "sf-1",
      productId: "product-1",
      status: "PUBLISHED",
      publishedAt: new Date(0),
    });

    publication.unpublish();
    expect(publication.status).toBe("UNPUBLISHED");

    const now = new Date();
    publication.republish(now);
    expect(publication.status).toBe("PUBLISHED");
    expect(publication.publishedAt).toBe(now);
  });
});
