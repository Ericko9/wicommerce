import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AddToCartDto } from './dto/cart.dto';
import { ProductStatus } from '@ucp/database';

export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  imageUrl?: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  totalQuantity: number;
}

@Injectable()
export class CartService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  private getCartKey(tenantId: string, cartId: string) {
    return `cart:${tenantId}:${cartId}`;
  }

  async getCart(tenantId: string, cartId: string): Promise<Cart> {
    const key = this.getCartKey(tenantId, cartId);
    const raw = await this.redis.get(key);
    if (!raw) {
      return { items: [], subtotal: 0, totalQuantity: 0 };
    }
    try {
      return JSON.parse(raw);
    } catch {
      return { items: [], subtotal: 0, totalQuantity: 0 };
    }
  }

  async addItem(tenantId: string, cartId: string, dto: AddToCartDto): Promise<Cart> {
    const product = await this.prisma.product.findFirst({
      where: {
        id: dto.productId,
        tenantId,
        status: ProductStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        variants: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan atau tidak aktif');
    }

    let selectedVariant: any = null;
    if (dto.variantId) {
      selectedVariant = product.variants.find((v) => v.id === dto.variantId);
      if (!selectedVariant) {
        throw new NotFoundException(`Varian ID '${dto.variantId}' tidak ditemukan untuk produk '${product.name}'`);
      }
    }

    const unitPrice =
      selectedVariant?.price !== null && selectedVariant?.price !== undefined
        ? selectedVariant.price
        : product.basePrice;

    const itemName = selectedVariant ? `${product.name} - ${selectedVariant.name}` : product.name;

    const cart = await this.getCart(tenantId, cartId);
    const existingIndex = cart.items.findIndex(
      (i) => i.productId === dto.productId && i.variantId === (dto.variantId || undefined),
    );

    if (existingIndex >= 0) {
      cart.items[existingIndex].quantity += dto.quantity;
      cart.items[existingIndex].subtotal = cart.items[existingIndex].quantity * unitPrice;
    } else {
      cart.items.push({
        productId: product.id,
        variantId: selectedVariant?.id,
        name: itemName,
        price: unitPrice,
        quantity: dto.quantity,
        subtotal: unitPrice * dto.quantity,
        imageUrl: product.images[0]?.url,
      });
    }

    return this.saveCart(tenantId, cartId, cart);
  }

  async updateItemQuantity(
    tenantId: string,
    cartId: string,
    productId: string,
    quantity: number,
    variantId?: string,
  ): Promise<Cart> {
    const cart = await this.getCart(tenantId, cartId);
    const item = cart.items.find(
      (i) => i.productId === productId && i.variantId === (variantId || undefined),
    );

    if (!item) {
      throw new NotFoundException('Item tidak ada di keranjang');
    }

    if (quantity <= 0) {
      cart.items = cart.items.filter(
        (i) => !(i.productId === productId && i.variantId === (variantId || undefined)),
      );
    } else {
      item.quantity = quantity;
      item.subtotal = item.quantity * item.price;
    }

    return this.saveCart(tenantId, cartId, cart);
  }

  async removeItem(
    tenantId: string,
    cartId: string,
    productId: string,
    variantId?: string,
  ): Promise<Cart> {
    const cart = await this.getCart(tenantId, cartId);
    cart.items = cart.items.filter(
      (i) => !(i.productId === productId && i.variantId === (variantId || undefined)),
    );
    return this.saveCart(tenantId, cartId, cart);
  }

  async clearCart(tenantId: string, cartId: string): Promise<Cart> {
    const key = this.getCartKey(tenantId, cartId);
    await this.redis.del(key);
    return { items: [], subtotal: 0, totalQuantity: 0 };
  }

  private async saveCart(tenantId: string, cartId: string, cart: Cart): Promise<Cart> {
    cart.subtotal = cart.items.reduce((acc, i) => acc + i.subtotal, 0);
    cart.totalQuantity = cart.items.reduce((acc, i) => acc + i.quantity, 0);

    const key = this.getCartKey(tenantId, cartId);
    await this.redis.set(key, JSON.stringify(cart), 604800);
    return cart;
  }
}
