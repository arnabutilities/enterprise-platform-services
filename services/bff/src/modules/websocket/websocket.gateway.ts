import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Logger, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { v4 as uuid } from 'uuid';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  requestId?: string;
  roles?: string[];
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3002',
    credentials: true,
  },
  namespace: '/realtime',
})
@Injectable()
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly connections = new Map<string, AuthenticatedSocket>();

  handleConnection(socket: AuthenticatedSocket) {
    const requestId = (socket.handshake.headers['x-request-id'] as string) || uuid();
    socket.requestId = requestId;
    socket.userId = socket.handshake.auth?.userId;

    this.connections.set(socket.id, socket);
    this.logger.log(
      `[${requestId}] WebSocket connected: ${socket.id} (user: ${socket.userId || 'anonymous'})`,
    );

    if (!this.validateWebSocketConnection(socket)) {
      socket.disconnect();
      return;
    }

    socket.emit('connection_established', { requestId });
  }

  handleDisconnect(socket: AuthenticatedSocket) {
    this.connections.delete(socket.id);
    this.logger.log(`[${socket.requestId}] WebSocket disconnected: ${socket.id}`);
  }

  private validateWebSocketConnection(socket: AuthenticatedSocket): boolean {
    const token = socket.handshake.auth?.token;

    if (!token) {
      this.logger.warn(`[${socket.requestId}] WebSocket connection rejected: No auth token`);
      return false;
    }

    // Token validation logic - would integrate with JWT strategy
    // Example: JwtService.verify(token)

    return true;
  }

  @SubscribeMessage('analytics:subscribe')
  handleAnalyticsSubscribe(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: any,
  ) {
    if (!this.validateUserPermissions(socket, 'analytics:read')) {
      throw new WsException('Unauthorized: Missing analytics:read permission');
    }

    socket.join(`analytics:${data.dashboardId}`);
    this.logger.log(
      `[${socket.requestId}] User ${socket.userId} subscribed to analytics:${data.dashboardId}`,
    );

    return { status: 'subscribed', dashboardId: data.dashboardId };
  }

  @SubscribeMessage('notifications:subscribe')
  handleNotificationsSubscribe(@ConnectedSocket() socket: AuthenticatedSocket) {
    socket.join(`notifications:${socket.userId}`);
    this.logger.log(`[${socket.requestId}] User ${socket.userId} subscribed to notifications`);

    return { status: 'subscribed' };
  }

  @SubscribeMessage('metrics:subscribe')
  handleMetricsSubscribe(@ConnectedSocket() socket: AuthenticatedSocket, @MessageBody() data: any) {
    if (!this.validateUserPermissions(socket, 'metrics:read')) {
      throw new WsException('Unauthorized: Missing metrics:read permission');
    }

    socket.join(`metrics:${data.metricType}`);
    this.logger.log(
      `[${socket.requestId}] User ${socket.userId} subscribed to metrics:${data.metricType}`,
    );

    return { status: 'subscribed', metricType: data.metricType };
  }

  private validateUserPermissions(socket: AuthenticatedSocket, permission: string): boolean {
    const userRoles = socket.roles || [];
    // Permission validation logic
    // Example: rolePermissionMap[permission].includes(userRoles)
    return true;
  }

  broadcastAnalyticsUpdate(dashboardId: string, data: any) {
    this.server.to(`analytics:${dashboardId}`).emit('analytics:update', {
      timestamp: new Date().toISOString(),
      data,
    });
  }

  broadcastNotification(userId: string, notification: any) {
    this.server.to(`notifications:${userId}`).emit('notification', {
      timestamp: new Date().toISOString(),
      ...notification,
    });
  }

  broadcastMetricsUpdate(metricType: string, data: any) {
    this.server.to(`metrics:${metricType}`).emit('metrics:update', {
      timestamp: new Date().toISOString(),
      data,
    });
  }
}
