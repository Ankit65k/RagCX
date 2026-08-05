import { ChatMessage, Prisma } from '@prisma/client';
import { BaseRepository } from '../../../database/repositories/base.repository.js';

export class ChatMessageRepository extends BaseRepository<
  ChatMessage,
  Prisma.ChatMessageUncheckedCreateInput,
  Prisma.ChatMessageUncheckedUpdateInput
> {
  protected get modelDelegate() {
    return this.db.chatMessage;
  }

  public async findConversation(chatSessionId: string): Promise<ChatMessage[]> {
    return this.db.chatMessage.findMany({
      where: { chatSessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  public async createMessage(
    chatSessionId: string,
    role: string,
    message: string,
    sources?: Prisma.InputJsonValue,
    tokenUsage?: Prisma.InputJsonValue,
  ): Promise<ChatMessage> {
    return this.db.chatMessage.create({
      data: {
        chatSessionId,
        role,
        message,
        sources: sources || Prisma.JsonNull,
        tokenUsage: tokenUsage || Prisma.JsonNull,
      },
    });
  }
}

export default ChatMessageRepository;
