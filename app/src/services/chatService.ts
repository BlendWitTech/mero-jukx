import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { logger } from '../utils/logger';

// Get API URL, ensuring it includes /api/v1
const getApiUrl = () => {
  const viteApiUrl = import.meta.env.VITE_API_URL;
  if (viteApiUrl) {
    // If VITE_API_URL is set, use it (it should already include /api/v1)
    // Remove trailing slash if present
    return viteApiUrl.endsWith('/') ? viteApiUrl.slice(0, -1) : viteApiUrl;
  }
  // If not set, use relative URL (will use Vite proxy)
  return '/api/v1';
};

const API_URL = getApiUrl();

export interface Chat {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  description: string | null;
  avatar_url: string | null;
  organization_id: string;
  created_by_user_id: string | null;
  status: 'active' | 'archived' | 'deleted';
  created_at: string;
  updated_at: string;
  members?: ChatMember[];
  last_message?: Message;
  unread_count?: number;
}

export interface ChatMember {
  id: number;
  chat_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'left' | 'removed';
  last_read_at: string | null;
  unread_count: number;
  notifications_enabled: boolean;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string | null;
  };
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  type: 'text' | 'attachment' | 'call_start' | 'call_end' | 'system';
  content: string | null;
  parent_message_id: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  read_status?: {
    delivered_at: string | null;
    read_at: string | null;
  };
}

export interface MessageAttachment {
  id: number;
  message_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  thumbnail_url: string | null;
  created_at: string;
}

export interface MessageReaction {
  id: number;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

class ChatService {
  private socket: Socket | null = null;

  getSocket(): Socket | null {
    return this.socket;
  }

  connect(organizationId: string, token: string): Socket {
    // Reuse existing socket if it's connected
    if (this.socket?.connected) {
      if (import.meta.env.MODE === 'development') {
        logger.log('[ChatService] Reusing existing socket connection, socket ID:', this.socket.id);
      }
      return this.socket;
    }

    // If socket exists but not connected, wait for reconnection instead of creating new one
    if (this.socket && !this.socket.connected) {
      if (import.meta.env.MODE === 'development') {
        logger.log('[ChatService] Socket exists but not connected, will reconnect automatically');
      }
      // Return existing socket - socket.io will handle reconnection
      return this.socket;
    }

    // For WebSocket, we need the base URL without /api/v1
    // If API_URL is relative (/api/v1), use window.location.origin
    // If API_URL is absolute and includes /api/v1, remove it
    let socketUrl: string;
    if (API_URL.startsWith('/')) {
      // Relative URL - use current origin
      socketUrl = window.location.origin;
    } else if (API_URL.includes('/api/v1')) {
      // Absolute URL with /api/v1 - remove it
      socketUrl = API_URL.replace('/api/v1', '');
    } else if (API_URL.includes('/api')) {
      // Absolute URL with /api - remove it
      socketUrl = API_URL.replace('/api', '');
    } else {
      // Fallback: use API_URL as-is (already a base URL with no /api path)
      socketUrl = API_URL;
    }

    if (import.meta.env.MODE === 'development') {
      logger.log('[ChatService] Connecting to socket:', `${socketUrl}/chat`);
    }

    // Connect to /chat namespace (as defined in backend ChatGateway)
    // Socket.io automatically handles namespaces, so we connect to the base URL with namespace
    this.socket = io(`${socketUrl}/chat`, {
      auth: {
        token,
      },
      query: {
        organizationId,
        token, // Also pass in query for fallback
      },
      extraHeaders: {
        Authorization: `Bearer ${token}`, // Also pass in headers
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      // Remove forceNew to allow connection reuse
    });

    // Add connection event listeners for debugging (only in development)
    this.socket.on('connect', () => {
      if (import.meta.env.MODE === 'development') {
        logger.log('[ChatService] Socket connected to chat namespace, socket ID:', this.socket?.id);
      }
    });

    this.socket.on('connect_error', (error) => {
      // Only log connection errors in development
      if (import.meta.env.MODE === 'development') {
        logger.error('[ChatService] Connection error:', error);
      }
    });

    this.socket.on('disconnect', (reason) => {
      // Only log disconnects in development (unless it's an error)
      if (import.meta.env.MODE === 'development' || reason === 'io server disconnect') {
        // Suppress "io server disconnect" logs - this is expected behavior
        if (import.meta.env.MODE === 'development' && reason !== 'io server disconnect') {
          logger.log('[ChatService] Socket disconnected:', reason);
        }
      }
    });

    // Don't add a global message:new listener here - let components add their own
    // This prevents duplicate handling

    return this.socket;
  }

  disconnect() {
    // Only disconnect if explicitly called (e.g., on logout)
    if (this.socket) {
      if (import.meta.env.MODE === 'development') {
        logger.log('[ChatService] Disconnecting socket');
      }
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Mark messages as read for a chat
   * This calls the backend API which marks messages as read
   */
  async markMessagesAsRead(organizationId: string, chatId: string): Promise<void> {
    try {
      // Call getMessages with a small limit to trigger the backend mark-as-read logic
      // The backend automatically marks messages as read when getMessages is called
      await axios.get(`${API_URL}/chats/${chatId}/messages`, {
        params: { limit: 1 },
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
        },
      });
    } catch (error) {
      logger.error('[ChatService] Error marking messages as read:', error);
      // Don't throw - this is not critical
    }
  }

  async getChats(organizationId: string, params?: { type?: string; page?: number; limit?: number }): Promise<{
    chats: Chat[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const response = await axios.get(`${API_URL}/chats`, {
        params,
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
        },
      });
      return response.data;
    } catch (error: any) {
      // Handle 403 (no chat access) gracefully - return empty result
      // Don't log 403 errors - they're expected for users without chat access
      if (error?.response?.status === 403) {
        return {
          chats: [],
          total: 0,
          page: params?.page || 1,
          limit: params?.limit || 50,
        };
      }
      // Only log unexpected errors in development
      if (import.meta.env.MODE === 'development') {
        logger.error('[ChatService] Error fetching chats:', error);
      }
      // Re-throw other errors
      throw error;
    }
  }

  async getChat(organizationId: string, chatId: string): Promise<Chat> {
    const response = await axios.get(`${API_URL}/chats/${chatId}`, {
      headers: {
        Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
      },
    });
    return response.data;
  }

  async getMessages(
    organizationId: string,
    chatId: string,
    params?: { page?: number; limit?: number; before?: string },
  ): Promise<{
    messages: Message[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await axios.get(
      `${API_URL}/chats/${chatId}/messages`,
      {
        params,
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
        },
      },
    );
    return response.data;
  }

  async createChat(organizationId: string, data: {
    type: 'direct' | 'group';
    name?: string;
    description?: string;
    member_ids?: string[];
  }): Promise<Chat> {
    const response = await axios.post(`${API_URL}/chats`, data, {
      headers: {
        Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
      },
    });
    return response.data;
  }

  async sendMessage(
    organizationId: string,
    chatId: string,
    data: {
      type: 'text' | 'attachment';
      content?: string;
      reply_to_id?: string;
      attachments?: Array<{
        file_name: string;
        file_url: string;
        file_type: string;
        file_size: string;
        thumbnail_url?: string;
      }>;
    },
  ): Promise<Message> {
    const response = await axios.post(
      `${API_URL}/chats/${chatId}/messages`,
      data,
      {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
        },
      },
    );
    return response.data;
  }

  async addMember(organizationId: string, chatId: string, userId: string): Promise<void> {
    await axios.post(
      `${API_URL}/chats/${chatId}/members`,
      { member_ids: [userId] },
      {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
        },
      },
    );
  }

  async removeMember(organizationId: string, chatId: string, memberId: number): Promise<void> {
    await axios.delete(
      `${API_URL}/chats/${chatId}/members/${memberId}`,
      {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
        },
      },
    );
  }

  async updateChat(organizationId: string, chatId: string, data: {
    name?: string;
    description?: string;
    avatar_url?: string;
  }): Promise<Chat> {
    const response = await axios.put(
      `${API_URL}/chats/${chatId}`,
      data,
      {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
        },
      },
    );
    return response.data;
  }

  async deleteChat(organizationId: string, chatId: string): Promise<void> {
    await axios.delete(`${API_URL}/chats/${chatId}`, {
      headers: {
        Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
      },
    });
  }
}

export const chatService = new ChatService();

