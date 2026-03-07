import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { User } from '../database/entities/users.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { OrganizationMember, OrganizationMemberStatus } from '../database/entities/organization_members.entity';

import { ConfigService } from '@nestjs/config';
import { getAllowedOrigins } from '../common/utils/cors.utils';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  organizationId?: string;
  user?: User;
}

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      const configService = new ConfigService();
      const allowed = getAllowedOrigins(configService);
      const isAllowed = !origin || allowed.some(a => {
        if (typeof a === 'string') return a === origin;
        if (a instanceof RegExp) return a.test(origin);
        return false;
      });
      callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
    },
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly connectedUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepository: Repository<OrganizationMember>,
  ) { }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractTokenFromSocket(client);
      if (!token) {
        this.logger.warn(`Client ${client.id} disconnected: No token provided`);
        client.disconnect();
        return;
      }

      let payload: any;
      try {
        payload = this.jwtService.verify(token);
      } catch (error) {
        this.logger.warn(`Client ${client.id} disconnected: Invalid token - ${error.message}`);
        client.disconnect();
        return;
      }

      if (!payload || !payload.sub) {
        this.logger.warn(`Client ${client.id} disconnected: Invalid token payload`);
        client.disconnect();
        return;
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        this.logger.warn(`Client ${client.id} disconnected: User not found`);
        client.disconnect();
        return;
      }

      // Get user's current organization from query params
      const organizationId = client.handshake.query.organizationId as string;
      if (!organizationId) {
        this.logger.warn(`Client ${client.id} disconnected: No organization ID`);
        client.disconnect();
        return;
      }

      // Verify user has access to this organization via OrganizationMember
      const member = await this.memberRepository.findOne({
        where: {
          user_id: user.id,
          organization_id: organizationId,
          status: OrganizationMemberStatus.ACTIVE,
        },
      });

      if (!member) {
        this.logger.warn(`Client ${client.id} disconnected: No access to organization`);
        client.disconnect();
        return;
      }

      client.userId = user.id;
      client.organizationId = organizationId;
      client.user = user;

      // Track connected user
      if (!this.connectedUsers.has(user.id)) {
        this.connectedUsers.set(user.id, new Set());
      }
      this.connectedUsers.get(user.id)!.add(client.id);

      // Join user to their organization room
      client.join(`org:${organizationId}`);
      client.join(`user:${user.id}`);

      // Get user's chats and join those rooms
      const chatsResult = await this.chatService.findAll(user.id, organizationId, {});
      for (const chat of chatsResult.chats) {
        client.join(`chat:${chat.id}`);
      }

      this.logger.log(`Client ${client.id} connected: User ${user.id} in organization ${organizationId}`);

      // Notify others in the organization that user is online
      client.to(`org:${organizationId}`).emit('user:online', {
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
      });
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSockets = this.connectedUsers.get(client.userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(client.userId);

          // Notify others that user is offline
          if (client.organizationId) {
            client.to(`org:${client.organizationId}`).emit('user:offline', {
              user_id: client.userId,
            });
          }
        }
      }
    }
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chat_id: string; message: SendMessageDto },
  ) {
    try {
      if (!client.userId || !client.organizationId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const { chat_id, message } = data;
      const savedMessage = await this.chatService.sendMessage(
        client.userId,
        client.organizationId,
        chat_id,
        message,
      );

      // Emit to all members of the chat
      this.server.to(`chat:${chat_id}`).emit('message:new', {
        message: savedMessage,
        chat_id: chat_id,
      });

      return { success: true, message: savedMessage };
    } catch (error) {
      this.logger.error('Error sending message:', error);
      client.emit('error', { message: error.message || 'Failed to send message' });
    }
  }

  @SubscribeMessage('message:delivered')
  async handleMessageDelivered(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { message_ids: string[] },
  ) {
    try {
      if (!client.userId || !client.organizationId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const { message_ids } = data;
      await this.chatService.markMessagesAsDelivered(client.userId, message_ids);

      // Notify senders that their messages were delivered
      const messages = await this.chatService['messageRepository'].find({
        where: { id: In(message_ids) },
        relations: ['sender'],
      });

      const uniqueSenders = [...new Set(messages.map(m => m.sender_id))];
      for (const senderId of uniqueSenders) {
        this.server.to(`user:${senderId}`).emit('message:delivered', {
          message_ids,
          delivered_to: client.userId,
          delivered_at: new Date(),
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Error marking messages as delivered:', error);
      client.emit('error', { message: error.message || 'Failed to mark messages as delivered' });
    }
  }

  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chat_id: string; message_ids: string[] },
  ) {
    try {
      if (!client.userId || !client.organizationId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const { chat_id, message_ids } = data;
      await this.chatService.markMessagesAsRead(client.userId, chat_id, message_ids);

      return { success: true };
    } catch (error) {
      this.logger.error('Error marking messages as read:', error);
      client.emit('error', { message: error.message || 'Failed to mark messages as read' });
    }
  }

  @SubscribeMessage('message:typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chat_id: string; is_typing: boolean },
  ) {
    try {
      if (!client.userId || !client.organizationId) {
        return;
      }

      const { chat_id, is_typing } = data;

      // Emit typing status to all other members of the chat
      client.to(`chat:${chat_id}`).emit('message:typing', {
        chat_id,
        user_id: client.userId,
        user: {
          id: client.user?.id,
          first_name: client.user?.first_name,
          last_name: client.user?.last_name,
        },
        is_typing,
      });
    } catch (error) {
      this.logger.error('Error handling typing:', error);
    }
  }

  @SubscribeMessage('chat:join')
  async handleJoinChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chat_id: string },
  ) {
    try {
      if (!client.userId || !client.organizationId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const { chat_id } = data;

      // Verify user has access to this chat
      const hasAccess = await this.chatService.hasChatAccess(client.organizationId);
      if (!hasAccess) {
        client.emit('error', { message: 'Chat feature not available' });
        return;
      }

      // Join the chat room
      client.join(`chat:${chat_id}`);

      this.logger.log(`User ${client.userId} joined chat ${chat_id}`);

      return { success: true, chat_id };
    } catch (error) {
      this.logger.error('Error joining chat:', error);
      client.emit('error', { message: error.message || 'Failed to join chat' });
    }
  }

  @SubscribeMessage('chat:leave')
  async handleLeaveChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chat_id: string },
  ) {
    try {
      const { chat_id } = data;
      client.leave(`chat:${chat_id}`);
      this.logger.log(`User ${client.userId} left chat ${chat_id}`);
      return { success: true, chat_id };
    } catch (error) {
      this.logger.error('Error leaving chat:', error);
    }
  }

  // Helper method to extract token from socket
  private extractTokenFromSocket(client: Socket): string | null {
    // Try authorization header first
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try auth object
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token as string;
    }

    // Try query parameter
    if (client.handshake.query?.token) {
      return client.handshake.query.token as string;
    }

    return null;
  }

  // Method to broadcast a message to all chat members (called from ChatService)
  broadcastMessage(chatId: string, message: any) {
    this.logger.log(`Broadcasting message ${message.id} to chat ${chatId}`);
    this.server.to(`chat:${chatId}`).emit('message:new', {
      message,
      chat_id: chatId,
    });
  }

  // Method to notify chat members when a new member is added
  async notifyChatMemberAdded(chatId: string, userId: string, member: any) {
    this.server.to(`chat:${chatId}`).emit('chat:member:added', {
      chat_id: chatId,
      user_id: userId,
      member,
    });
  }

  // Method to notify chat members when a member is removed
  async notifyChatMemberRemoved(chatId: string, userId: string) {
    this.server.to(`chat:${chatId}`).emit('chat:member:removed', {
      chat_id: chatId,
      user_id: userId,
    });
  }

  // Method to notify chat members when chat is updated
  async notifyChatUpdated(chatId: string, updates: any) {
    this.server.to(`chat:${chatId}`).emit('chat:updated', {
      chat_id: chatId,
      updates,
    });
  }

  // Call signaling handlers
  @SubscribeMessage('call:offer')
  async handleCallOffer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; otherUserId: string; callType: 'audio' | 'video'; offer: any },
  ) {
    try {
      if (!client.userId || !client.organizationId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const { chatId, otherUserId, callType, offer } = data;

      // Verify user has access to this chat
      const hasAccess = await this.chatService.hasChatAccess(client.organizationId);
      if (!hasAccess) {
        client.emit('error', { message: 'Chat feature not available' });
        return;
      }

      // Get other user's name
      const otherUser = await this.userRepository.findOne({ where: { id: otherUserId } });
      const otherUserName = otherUser
        ? `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() || otherUser.email
        : 'User';

      // Send call offer to the other user
      this.server.to(`user:${otherUserId}`).emit('call:incoming', {
        chatId,
        otherUserId: client.userId,
        otherUserName: client.user
          ? `${client.user.first_name || ''} ${client.user.last_name || ''}`.trim() || client.user.email
          : 'User',
        callType,
        offer,
      });

      this.logger.log(`Call offer from ${client.userId} to ${otherUserId} in chat ${chatId}`);
    } catch (error) {
      this.logger.error('Error handling call offer:', error);
      client.emit('error', { message: error.message || 'Failed to initiate call' });
    }
  }

  @SubscribeMessage('call:answer')
  async handleCallAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; otherUserId: string; answer: any },
  ) {
    try {
      if (!client.userId || !client.organizationId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const { chatId, otherUserId, answer } = data;

      // Send answer to the caller
      this.server.to(`user:${otherUserId}`).emit('call:answer', {
        answer,
      });

      this.logger.log(`Call answer from ${client.userId} to ${otherUserId} in chat ${chatId}`);
    } catch (error) {
      this.logger.error('Error handling call answer:', error);
      client.emit('error', { message: error.message || 'Failed to answer call' });
    }
  }

  @SubscribeMessage('call:ice-candidate')
  async handleIceCandidate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; candidate: any },
  ) {
    try {
      if (!client.userId || !client.organizationId) {
        return;
      }

      const { chatId, candidate } = data;

      // Forward ICE candidate to all other members in the chat
      client.to(`chat:${chatId}`).emit('call:ice-candidate', {
        candidate,
      });
    } catch (error) {
      this.logger.error('Error handling ICE candidate:', error);
    }
  }

  @SubscribeMessage('call:end')
  async handleCallEnd(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; otherUserId: string },
  ) {
    try {
      if (!client.userId || !client.organizationId) {
        return;
      }

      const { chatId, otherUserId } = data;

      // Notify the other user that the call ended
      this.server.to(`user:${otherUserId}`).emit('call:ended', {
        chatId,
      });

      this.logger.log(`Call ended by ${client.userId} in chat ${chatId}`);
    } catch (error) {
      this.logger.error('Error handling call end:', error);
    }
  }

  @SubscribeMessage('call:reject')
  async handleCallReject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; otherUserId: string },
  ) {
    try {
      if (!client.userId || !client.organizationId) {
        return;
      }

      const { chatId, otherUserId } = data;

      // Notify the caller that the call was rejected
      this.server.to(`user:${otherUserId}`).emit('call:rejected', {
        chatId,
      });

      this.logger.log(`Call rejected by ${client.userId} in chat ${chatId}`);
    } catch (error) {
      this.logger.error('Error handling call reject:', error);
    }
  }
}

