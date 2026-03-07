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
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAllowedOrigins } from '../../../../src/common/utils/cors.utils';

@WebSocketGateway({
    namespace: 'board',
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
})
export class BoardGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(BoardGateway.name);

    @WebSocketServer()
    server: Server;

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('joinBoard')
    handleJoinBoard(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { boardId: string },
    ) {
        client.join(`board_${data.boardId}`);
        this.logger.log(`Client ${client.id} joined board ${data.boardId}`);
        return { event: 'joinedBoard', data: { boardId: data.boardId } };
    }

    @SubscribeMessage('leaveBoard')
    handleLeaveBoard(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { boardId: string },
    ) {
        client.leave(`board_${data.boardId}`);
        this.logger.log(`Client ${client.id} left board ${data.boardId}`);
        return { event: 'leftBoard', data: { boardId: data.boardId } };
    }

    broadcastTaskMoved(boardId: string, data: any) {
        this.server.to(`board_${boardId}`).emit('taskMoved', data);
    }

    broadcastTaskUpdated(boardId: string, data: any) {
        this.server.to(`board_${boardId}`).emit('taskUpdated', data);
    }

    broadcastCommentAdded(boardId: string, data: any) {
        this.server.to(`board_${boardId}`).emit('commentAdded', data);
    }
}
