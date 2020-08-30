import csvParse from 'csv-parse';
import fs from 'fs';
import { getCustomRepository, In } from 'typeorm';
// import parse from 'csv-parse';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import CategoriesRepository from '../repositories/CategoriesRepository';

interface CsvTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}
class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const categoriesRepository = getCustomRepository(CategoriesRepository);
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const transactionsReadStream = fs.createReadStream(filePath);
    const parsers = csvParse({
      delimiter: ',',
      from: 2,
    });

    const parseCSV = transactionsReadStream.pipe(parsers);

    const transactions: CsvTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value || !category) return;

      categories.push(category);

      transactions.push({
        title,
        type,
        value,
        category,
      });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const existenCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existenCategoriesTitle = existenCategories.map(
      category => category.title,
    );

    const addCategoriesTitle = categories
      .filter(catory => !existenCategoriesTitle.includes(catory))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = await categoriesRepository.create(
      addCategoriesTitle.map(title => ({ title })),
    );

    await categoriesRepository.save(newCategories);

    const mergeCategories = [...newCategories, ...existenCategories];

    const createTransaction = await transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: mergeCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createTransaction);
    // console.log('[addCategoriesTitle]', addCategoriesTitle);
    // console.log('[transactions]', transactions);

    await fs.promises.unlink(filePath);
    return createTransaction;
  }
}

export default ImportTransactionsService;
