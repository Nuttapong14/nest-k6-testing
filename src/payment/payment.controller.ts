import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.constants';
import { PaymentService } from './payment.service';
import { CreatePaymentDto, PaymentDto, RefundDto } from './dto/payment.dto';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new payment',
    description: 'Process a new payment with the specified method and amount',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment created successfully',
    type: PaymentDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payment data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req: any,
  ): Promise<PaymentDto> {
    return this.paymentService.createPayment(createPaymentDto, req.user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get payment status by ID',
    description: 'Retrieve the current status of a payment',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment status retrieved successfully',
    type: PaymentDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getPaymentStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<PaymentDto> {
    // Users can only view their own payments, admins can view all
    if (req.user.role === Role.ADMIN) {
      return this.paymentService.getPaymentStatus(id);
    } else {
      return this.paymentService.getPaymentStatus(id, req.user.id);
    }
  }

  @Post(':id/refund')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process a refund',
    description: 'Refund a completed payment (Admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Refund processed successfully',
    type: PaymentDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  async processRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() refundDto: RefundDto,
  ): Promise<PaymentDto> {
    return this.paymentService.processRefund(id, refundDto);
  }

  @Get('user/my-payments')
  @ApiOperation({
    summary: 'Get current user payments',
    description: 'Retrieve all payments for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User payments retrieved successfully',
    type: [PaymentDto],
  })
  async getUserPayments(@Request() req: any): Promise<PaymentDto[]> {
    // This would typically include pagination
    // For now, returning all user payments
    const userId = req.user?.sub || req.user?.id || '';
    const payments = await this.paymentService.findByUser(userId);
    return payments.map((payment) => this.paymentService.mapToDto(payment));
  }
}
