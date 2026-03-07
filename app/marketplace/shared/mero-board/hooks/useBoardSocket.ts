import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@frontend/store/authStore';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../contexts/AppContext';

let socket: Socket | null = null;

export const useBoardSocket = (boardId?: string) => {
    const { accessToken } = useAuthStore();
    const queryClient = useQueryClient();
    const { appSlug } = useAppContext();

    const connect = useCallback(() => {
        if (socket?.connected) return;

        const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
        let socketUrl = API_URL.startsWith('/')
            ? window.location.origin
            : API_URL.replace('/api/v1', '').replace('/api', '');

        socket = io(`${socketUrl}/board`, {
            auth: { token: accessToken },
            transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
            console.log('[BoardSocket] Connected');
            if (boardId) {
                socket?.emit('joinBoard', boardId);
            }
        });

        socket.on('taskMoved', (data) => {
            console.log('[BoardSocket] Task Moved:', data);
            queryClient.invalidateQueries({ queryKey: ['board', appSlug, boardId] });
            queryClient.invalidateQueries({ queryKey: ['tasks', appSlug] });
        });

        socket.on('taskUpdated', (data) => {
            console.log('[BoardSocket] Task Updated:', data);
            queryClient.invalidateQueries({ queryKey: ['board', appSlug, boardId] });
            queryClient.invalidateQueries({ queryKey: ['task', data.taskId] });
        });

        socket.on('taskCreated', (data) => {
            console.log('[BoardSocket] Task Created:', data);
            queryClient.invalidateQueries({ queryKey: ['board', appSlug, boardId] });
        });

        socket.on('boardCreated', () => {
            console.log('[BoardSocket] Board Created');
            queryClient.invalidateQueries({ queryKey: ['boards', appSlug] });
        });

        socket.on('boardUpdated', () => {
            console.log('[BoardSocket] Board Updated');
            queryClient.invalidateQueries({ queryKey: ['boards', appSlug] });
            queryClient.invalidateQueries({ queryKey: ['board', appSlug, boardId] });
        });

        socket.on('boardDeleted', () => {
            console.log('[BoardSocket] Board Deleted');
            queryClient.invalidateQueries({ queryKey: ['boards', appSlug] });
        });

        socket.on('disconnect', () => {
            console.log('[BoardSocket] Disconnected');
        });

        return socket;
    }, [accessToken, boardId, queryClient, appSlug]);

    useEffect(() => {
        if (!accessToken) return;

        const s = connect();

        return () => {
            if (boardId && s) {
                s.emit('leaveBoard', boardId);
            }
        };
    }, [connect, boardId, accessToken]);

    return { socket };
};
