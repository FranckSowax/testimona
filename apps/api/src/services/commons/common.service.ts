import { PrismaClient } from '.prisma/client';
import { IncludeDataExistsEnum } from '../../enums/_.enums';

// Shared Prisma instance (connection pooling)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export class CommonService {
  protected get _prismaDb() {
    return prisma;
  }

  async executeQueries<T>(queries: any[]): Promise<T[]> {
    return await prisma.$transaction(queries);
  }

  getWhereConditionForDisabled(includeData: IncludeDataExistsEnum, whereCondition: any, propertyName: string = 'disabled') {
    if (includeData == IncludeDataExistsEnum.ActiveData) whereCondition[propertyName] = false;
    if (includeData == IncludeDataExistsEnum.InactiveData) whereCondition[propertyName] = true;

    return whereCondition;
  }
}
