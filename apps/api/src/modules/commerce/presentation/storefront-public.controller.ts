import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ThrottlerGuard } from "@nestjs/throttler";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import type { Request } from "express";
import type { Storefront } from "../domain/storefront.entity";
import type { Cart } from "../domain/cart.entity";
import type { CartLine } from "../domain/cart-line.entity";
import { GetOrCreateCartUseCase } from "../application/use-cases/get-or-create-cart.use-case";
import { GetCartUseCase } from "../application/use-cases/get-cart.use-case";
import { AddCartLineUseCase } from "../application/use-cases/add-cart-line.use-case";
import { UpdateCartLineQuantityUseCase } from "../application/use-cases/update-cart-line-quantity.use-case";
import { RemoveCartLineUseCase } from "../application/use-cases/remove-cart-line.use-case";
import { ListPublishedProductsUseCase } from "../application/use-cases/list-published-products.use-case";
import { GetPublishedProductUseCase } from "../application/use-cases/get-published-product.use-case";
import { CheckoutUseCase } from "../application/use-cases/checkout.use-case";
import { GetCommerceOrderUseCase } from "../application/use-cases/get-commerce-order.use-case";
import { addDecimal, multiplyDecimal } from "../domain/decimal";
import { PublicStorefrontContextGuard } from "./public-storefront-context.guard";
import { CurrentStorefront } from "./current-storefront.decorator";
import { AddCartLineDto, CartLineResponseDto, CartResponseDto, UpdateCartLineQuantityDto } from "./dto/cart.dto";
import { CheckoutDto } from "./dto/checkout.dto";
import { CommerceOrderResponseDto } from "./dto/commerce-order.dto";
import { PublicProductDetailResponseDto, PublicProductSummaryResponseDto } from "./dto/public-catalog.dto";
import { handleCommerceError } from "./commerce-error.mapper";
import "./commerce-request";

class CreateCartDto {
  @ApiPropertyOptional({ description: "A returning shopper's existing cart token, if any." })
  @IsOptional()
  @IsString()
  cartId?: string;
}

class CheckoutRequestDto extends CheckoutDto {
  @ApiProperty() @IsString() @IsNotEmpty() cartId!: string;
}

/**
 * The public, anonymous, rate-limited side of Commerce (docs/ROADMAP.md
 * §11 "Rate limits, anti-abuse e idempotency") — this is the only surface
 * the Next.js storefront app ever calls. Every route resolves its tenant/
 * company/storefront scope purely from `:storefrontCode`
 * (`PublicStorefrontContextGuard`); nothing here trusts a header or a
 * request body for that. See `StorefrontsController` for the authenticated
 * admin side.
 */
@ApiTags("Commerce (public storefront)")
@Controller("api/v1/storefront/:storefrontCode")
@UseGuards(ThrottlerGuard, PublicStorefrontContextGuard)
export class StorefrontPublicController {
  constructor(
    private readonly getOrCreateCart: GetOrCreateCartUseCase,
    private readonly getCart: GetCartUseCase,
    private readonly addCartLine: AddCartLineUseCase,
    private readonly updateCartLineQuantity: UpdateCartLineQuantityUseCase,
    private readonly removeCartLine: RemoveCartLineUseCase,
    private readonly listPublishedProducts: ListPublishedProductsUseCase,
    private readonly getPublishedProduct: GetPublishedProductUseCase,
    private readonly checkout: CheckoutUseCase,
    private readonly getCommerceOrder: GetCommerceOrderUseCase,
  ) {}

  @Get("products")
  @ApiOperation({ summary: "List this storefront's published products." })
  @ApiResponse({ status: HttpStatus.OK, type: [PublicProductSummaryResponseDto] })
  async listProducts(@Param("storefrontCode") storefrontCode: string, @Query("limit") limit?: string): Promise<PublicProductSummaryResponseDto[]> {
    try {
      const summaries = await this.listPublishedProducts.execute({ storefrontCode, limit: limit ? Number(limit) : 100 });
      return summaries.map(PublicProductSummaryResponseDto.fromSummary);
    } catch (error) {
      handleCommerceError(error);
    }
  }

  @Get("products/:productId")
  @ApiOperation({ summary: "Get a published product's detail, including its variants." })
  @ApiResponse({ status: HttpStatus.OK, type: PublicProductDetailResponseDto })
  async getProduct(@Param("storefrontCode") storefrontCode: string, @Param("productId") productId: string): Promise<PublicProductDetailResponseDto> {
    try {
      const detail = await this.getPublishedProduct.execute({ storefrontCode, productId });
      return PublicProductDetailResponseDto.fromDetail(detail);
    } catch (error) {
      handleCommerceError(error);
    }
  }

  @Post("carts")
  @ApiOperation({ summary: "Get-or-create a cart. Pass `cartId` in the body to reuse a returning shopper's cart; omit it for a brand-new one." })
  @ApiResponse({ status: HttpStatus.CREATED, type: CartResponseDto })
  async createCart(@CurrentStorefront() storefront: Storefront, @Body() body: CreateCartDto): Promise<CartResponseDto> {
    try {
      const cart = await this.getOrCreateCart.execute({ storefront, cartId: body?.cartId ?? null });
      return this.buildCartResponse(cart, []);
    } catch (error) {
      handleCommerceError(error);
    }
  }

  @Get("carts/:cartId")
  @ApiOperation({ summary: "Get a cart and its lines." })
  @ApiResponse({ status: HttpStatus.OK, type: CartResponseDto })
  async getCartRoute(@CurrentStorefront() storefront: Storefront, @Param("cartId") cartId: string): Promise<CartResponseDto> {
    try {
      const { cart, lines } = await this.getCart.execute({ storefront, cartId });
      return this.buildCartResponse(cart, lines);
    } catch (error) {
      handleCommerceError(error);
    }
  }

  @Post("carts/:cartId/lines")
  @ApiOperation({ summary: "Add a product (or increase its quantity) to the cart. Price is always resolved server-side." })
  @ApiResponse({ status: HttpStatus.CREATED, type: CartResponseDto })
  async addLine(@CurrentStorefront() storefront: Storefront, @Param("cartId") cartId: string, @Body() dto: AddCartLineDto): Promise<CartResponseDto> {
    try {
      await this.addCartLine.execute({ storefront, cartId, productId: dto.productId, productVariantId: dto.productVariantId, quantity: dto.quantity });
      const { cart, lines } = await this.getCart.execute({ storefront, cartId });
      return this.buildCartResponse(cart, lines);
    } catch (error) {
      handleCommerceError(error);
    }
  }

  @Put("carts/:cartId/lines/:lineId")
  @ApiOperation({ summary: "Set a cart line's quantity." })
  @ApiResponse({ status: HttpStatus.OK, type: CartResponseDto })
  async updateLine(
    @CurrentStorefront() storefront: Storefront,
    @Param("cartId") cartId: string,
    @Param("lineId") lineId: string,
    @Body() dto: UpdateCartLineQuantityDto,
  ): Promise<CartResponseDto> {
    try {
      await this.updateCartLineQuantity.execute({ storefront, cartId, cartLineId: lineId, quantity: dto.quantity });
      const { cart, lines } = await this.getCart.execute({ storefront, cartId });
      return this.buildCartResponse(cart, lines);
    } catch (error) {
      handleCommerceError(error);
    }
  }

  @Delete("carts/:cartId/lines/:lineId")
  @ApiOperation({ summary: "Remove a cart line." })
  @ApiResponse({ status: HttpStatus.OK, type: CartResponseDto })
  async removeLine(@CurrentStorefront() storefront: Storefront, @Param("cartId") cartId: string, @Param("lineId") lineId: string): Promise<CartResponseDto> {
    try {
      await this.removeCartLine.execute({ storefront, cartId, cartLineId: lineId });
      const { cart, lines } = await this.getCart.execute({ storefront, cartId });
      return this.buildCartResponse(cart, lines);
    } catch (error) {
      handleCommerceError(error);
    }
  }

  @Post("checkout")
  @ApiOperation({ summary: "Convert a cart into a real order — see docs/DECISIONS.md ADR-011 for the payment/fulfillment model." })
  @ApiResponse({ status: HttpStatus.CREATED, type: CommerceOrderResponseDto })
  async checkoutRoute(@CurrentStorefront() storefront: Storefront, @Body() dto: CheckoutRequestDto, @Req() request: Request): Promise<CommerceOrderResponseDto> {
    try {
      const { order } = await this.checkout.execute({
        storefront,
        correlationId: request.correlationId,
        cartId: dto.cartId,
        guestName: dto.guestName,
        guestEmail: dto.guestEmail,
        paymentReference: dto.paymentReference ?? null,
      });
      return CommerceOrderResponseDto.fromDomain(order);
    } catch (error) {
      handleCommerceError(error);
    }
  }

  @Get("orders/:orderId")
  @ApiOperation({ summary: "Order confirmation lookup." })
  @ApiResponse({ status: HttpStatus.OK, type: CommerceOrderResponseDto })
  async getOrder(@CurrentStorefront() storefront: Storefront, @Param("orderId") orderId: string): Promise<CommerceOrderResponseDto> {
    try {
      const order = await this.getCommerceOrder.execute({ storefront, orderId });
      return CommerceOrderResponseDto.fromDomain(order);
    } catch (error) {
      handleCommerceError(error);
    }
  }

  private buildCartResponse(cart: Cart, lines: CartLine[]): CartResponseDto {
    let subtotal = "0.0000";
    const lineDtos = lines.map((line) => {
      const lineSubtotal = multiplyDecimal(line.quantity, line.unitPrice);
      subtotal = addDecimal(subtotal, lineSubtotal);
      return CartLineResponseDto.fromDomain(line, lineSubtotal);
    });
    return CartResponseDto.fromDomain(cart, lineDtos, subtotal);
  }
}
