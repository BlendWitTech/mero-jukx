import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateTicketFromChatDto } from './dto/create-ticket-from-chat.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { TransferTicketToBoardDto } from './dto/transfer-ticket-to-board.dto';

@ApiTags('Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) { }

  @Post()
  @ApiOperation({ summary: 'Create a ticket (regular form)' })
  createTicket(
    @CurrentUser('id') userId: string,
    @CurrentOrganization('id') organizationId: string,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.createTicket(userId, organizationId, dto);
  }

  @Post('from-chat')
  @ApiOperation({ summary: 'Create a ticket by flagging a chat message' })
  createFromChat(
    @CurrentUser('id') userId: string,
    @CurrentOrganization('id') organizationId: string,
    @Body() dto: CreateTicketFromChatDto,
  ) {
    return this.ticketsService.createFromChat(userId, organizationId, dto);
  }

  @Get('access-check')
  @ApiOperation({ summary: 'Check if organization has access to ticket system' })
  @ApiResponse({ status: 200, description: 'Access check result' })
  async checkAccess(@CurrentOrganization('id') organizationId: string) {
    const hasAccess = await this.ticketsService.hasTicketAccess(organizationId);
    return { has_access: hasAccess };
  }

  @Get()
  @ApiOperation({ summary: 'List tickets with filters' })
  findAll(
    @CurrentUser('id') userId: string,
    @CurrentOrganization('id') organizationId: string,
    @CurrentOrganization('accessibleIds') accessibleIds: string[],
    @Query() query: TicketQueryDto,
  ) {
    return this.ticketsService.findAll(userId, organizationId, query, accessibleIds);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket details' })
  findOne(
    @CurrentUser('id') userId: string,
    @CurrentOrganization('id') organizationId: string,
    @CurrentOrganization('accessibleIds') accessibleIds: string[],
    @Param('id') ticketId: string,
  ) {
    return this.ticketsService.findOne(userId, organizationId, ticketId, accessibleIds);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a ticket (assignee/status/fields)' })
  updateTicket(
    @CurrentUser('id') userId: string,
    @CurrentOrganization('id') organizationId: string,
    @CurrentOrganization('accessibleIds') accessibleIds: string[],
    @Param('id') ticketId: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.ticketsService.updateTicket(userId, organizationId, ticketId, dto, accessibleIds);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add a comment to a ticket' })
  addComment(
    @CurrentUser('id') userId: string,
    @CurrentOrganization('id') organizationId: string,
    @CurrentOrganization('accessibleIds') accessibleIds: string[],
    @Param('id') ticketId: string,
    @Body() dto: AddCommentDto,
  ) {
    return this.ticketsService.addComment(userId, organizationId, ticketId, dto, accessibleIds);
  }

  @Post(':id/transfer-to-board')
  @ApiOperation({ summary: 'Transfer ticket to an app' })
  @ApiResponse({ status: 200, description: 'Ticket transferred to board successfully' })
  transferToBoard(
    @CurrentUser('id') userId: string,
    @CurrentOrganization('id') organizationId: string,
    @CurrentOrganization('accessibleIds') accessibleIds: string[],
    @Param('id') ticketId: string,
    @Body() dto: TransferTicketToBoardDto,
  ) {
    return this.ticketsService.transferToBoard(userId, organizationId, ticketId, dto, accessibleIds);
  }
}

