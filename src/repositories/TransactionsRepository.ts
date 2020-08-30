import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const SumTypes = await this.createQueryBuilder('transactions')
      .select('transactions.type', 'type')
      .addSelect('SUM(transactions.value)', 'sum')
      .groupBy('transactions.type')
      .getRawMany();

    let totalIncome = 0;
    let totalOutcome = 0;
    SumTypes.forEach(sumType => {
      if (sumType.type === 'income') totalIncome = parseInt(sumType.sum, 0);
      if (sumType.type === 'outcome') totalOutcome = parseInt(sumType.sum, 0);
    });

    const balance: Balance = {
      income: totalIncome,
      outcome: totalOutcome,
      total: totalIncome - totalOutcome,
    };
    return balance;
  }
}

export default TransactionsRepository;
