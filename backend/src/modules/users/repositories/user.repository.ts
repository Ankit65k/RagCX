import { User, Prisma } from '@prisma/client';
import { BaseRepository } from '../../../database/repositories/base.repository.js';

export class UserRepository extends BaseRepository<
  User,
  Prisma.UserCreateInput,
  Prisma.UserUpdateInput
> {
  protected get modelDelegate() {
    return this.db.user;
  }

  public async findByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({
      where: { email },
    });
  }

  public async findActive(): Promise<User[]> {
    return this.db.user.findMany({
      where: { isActive: true },
    });
  }

  public async activate(id: string): Promise<User> {
    return this.db.user.update({
      where: { id },
      data: { isActive: true },
    });
  }

  public async deactivate(id: string): Promise<User> {
    return this.db.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

export default UserRepository;
