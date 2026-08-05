import { ChatSession, Prisma } from '@prisma/client';
import { BaseRepository } from '../../../database/repositories/base.repository.js';

export class ChatSessionRepository extends BaseRepository<
  ChatSession,
  Prisma.ChatSessionUncheckedCreateInput,
  Prisma.ChatSessionUncheckedUpdateInput
> {
  protected get modelDelegate() {
    return this.db.chatSession;
  }

  public async findBySessionIdentifier(sessionIdentifier: string): Promise<ChatSession | null> {
    return this.db.chatSession.findUnique({
      where: { sessionIdentifier },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }
}

export default ChatSessionRepository;
