import { Session, Prisma } from '@prisma/client';
import { BaseRepository } from '../../../database/repositories/base.repository.js';

export class SessionRepository extends BaseRepository<
  Session,
  Prisma.SessionUncheckedCreateInput,
  Prisma.SessionUncheckedUpdateInput
> {
  protected get modelDelegate() {
    return this.db.session;
  }

  public async findByRefreshToken(hashedRefreshToken: string): Promise<Session | null> {
    return this.db.session.findUnique({
      where: { hashedRefreshToken },
    });
  }

  public async revoke(id: string): Promise<Session> {
    return this.db.session.update({
      where: { id },
      data: { isRevoked: true },
    });
  }

  public async revokeAll(userId: string): Promise<Prisma.BatchPayload> {
    return this.db.session.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  public async findActiveSessions(userId: string): Promise<Session[]> {
    return this.db.session.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivity: 'desc' },
    });
  }
}

export default SessionRepository;
