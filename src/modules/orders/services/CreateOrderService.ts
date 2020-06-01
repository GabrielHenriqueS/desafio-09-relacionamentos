import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not find');
    }

    const findProducts = await this.productsRepository.findAllById(products);

    if (findProducts.length === 0) {
      throw new AppError('Could not find products');
    }

    const productsNotAvailable = products.filter(
      product =>
        findProducts.filter(p => p.id === product.id)[0].quantity <
        product.quantity,
    );

    if (productsNotAvailable.length) {
      throw new AppError('Quantity of products is not available');
    }

    const productsQuantityUpdate = products.map(product => ({
      id: product.id,
      quantity:
        findProducts.filter(p => p.id === product.id)[0].quantity -
        product.quantity,
    }));

    await this.productsRepository.updateQuantity(productsQuantityUpdate);

    const productsFormatted = products.map(product => ({
      product_id: product.id,
      quantity: product.quantity,
      price: findProducts.filter(
        productFiltered => productFiltered.id === product.id,
      )[0].price,
    }));

    const order = await this.ordersRepository.create({
      customer,
      products: productsFormatted,
    });

    return order;
  }
}

export default CreateOrderService;
