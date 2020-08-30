import { getCustomRepository } from 'typeorm';

import TransactionRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import CategoriesRepository from '../repositories/CategoriesRepository';
import AppError from '../errors/AppError';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}
class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    // find/create category
    const categoriesRepository = getCustomRepository(CategoriesRepository);
    const checkCategoryExist = await categoriesRepository.findOne({
      where: { title: category },
    });

    let category_id = '';
    if (checkCategoryExist) {
      category_id = checkCategoryExist.id;
    } else {
      const creatCategory = categoriesRepository.create({
        title: category,
      });
      const { id } = await categoriesRepository.save(creatCategory);
      category_id = id;
    }

    const transactionRepository = getCustomRepository(TransactionRepository);

    // check valide balance
    const balance = await transactionRepository.getBalance();
    if (type === 'outcome' && balance.income < value) {
      throw new AppError(
        'without valid balance to create transaction outcome',
        400,
      );
    }

    const transaction = transactionRepository.create({
      title,
      value,
      type,
      category_id,
    });

    await transactionRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
