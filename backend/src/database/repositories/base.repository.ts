import { PrismaClient } from '@prisma/client';
import { prisma } from '../client/index.js';
import { calculatePagination, PaginatedResult } from './pagination.js';

export abstract class BaseRepository<
  T,
  CreateInput,
  UpdateInput,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  FindManyArgs extends { where?: any; select?: any; include?: any; orderBy?: any; take?: number; skip?: number } = any
> {
  protected readonly db: PrismaClient = prisma;

  // Each module repository must define its delegate (e.g. prisma.user)
  protected abstract get modelDelegate(): {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findUnique(args: { where: { id: string }; select?: any; include?: any }): Promise<T | null>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findFirst(args?: { where?: any; select?: any; include?: any; orderBy?: any }): Promise<T | null>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findMany(args?: any): Promise<T[]>;
    create(args: { data: CreateInput }): Promise<T>;
    createMany?(args: { data: CreateInput[] }): Promise<{ count: number }>;
    update(args: { where: { id: string }; data: UpdateInput }): Promise<T>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateMany?(args: { where?: any; data: UpdateInput }): Promise<{ count: number }>;
    delete(args: { where: { id: string } }): Promise<T>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deleteMany?(args?: { where?: any }): Promise<{ count: number }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    count(args?: { where?: any }): Promise<number>;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async findById(id: string, options?: { select?: any; include?: any }): Promise<T | null> {
    return this.modelDelegate.findUnique({
      where: { id },
      ...options,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async findFirst(options?: { where?: any; select?: any; include?: any; orderBy?: any }): Promise<T | null> {
    return this.modelDelegate.findFirst(options);
  }

  public async findMany(options?: FindManyArgs): Promise<T[]> {
    return this.modelDelegate.findMany(options);
  }

  public async create(data: CreateInput): Promise<T> {
    return this.modelDelegate.create({ data });
  }

  public async createMany(data: CreateInput[]): Promise<{ count: number }> {
    if (!this.modelDelegate.createMany) {
      throw new Error('createMany operation is not supported by this database delegate.');
    }
    return this.modelDelegate.createMany({ data });
  }

  public async update(id: string, data: UpdateInput): Promise<T> {
    return this.modelDelegate.update({
      where: { id },
      data,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async updateMany(where: any, data: UpdateInput): Promise<{ count: number }> {
    if (!this.modelDelegate.updateMany) {
      throw new Error('updateMany operation is not supported by this database delegate.');
    }
    return this.modelDelegate.updateMany({ where, data });
  }

  public async delete(id: string): Promise<T> {
    return this.modelDelegate.delete({
      where: { id },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async deleteMany(where?: any): Promise<{ count: number }> {
    if (!this.modelDelegate.deleteMany) {
      throw new Error('deleteMany operation is not supported by this database delegate.');
    }
    return this.modelDelegate.deleteMany({ where });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async exists(where: any): Promise<boolean> {
    const result = await this.count(where);
    return result > 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async count(where?: any): Promise<number> {
    return this.modelDelegate.count({ where });
  }

  public async paginate(
    page: number,
    limit: number,
    options?: Omit<FindManyArgs, 'take' | 'skip'>,
  ): Promise<PaginatedResult<T>> {
    const totalItems = await this.count(options?.where);
    const meta = calculatePagination(totalItems, page, limit);

    const skip = (meta.currentPage - 1) * limit;
    const items = await this.modelDelegate.findMany({
      ...options,
      take: limit,
      skip,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    return { items, meta };
  }
}

export default BaseRepository;
