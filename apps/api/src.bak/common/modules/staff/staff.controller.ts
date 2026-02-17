import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StaffService } from './staff.service';
import {
  UpdateStaffProfileDto, SetScheduleDto, ClockInDto, ClockOutDto,
  CreateTimeOffDto, StaffQueryDto,
} from './dto/staff.dto';
import { CurrentTenant } from '../../decorators/tenant.decorator';

@ApiTags('Staff')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('staff')
export class StaffController {
  constructor(private service: StaffService) {}

  @Get()
  @ApiOperation({ summary: 'List all staff' })
  getAll(@CurrentTenant() tenantId: string) {
    return this.service.getAll(tenantId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Today attendance summary' })
  summary(@CurrentTenant() tenantId: string) {
    return this.service.getTodaySummary(tenantId);
  }

  @Get('schedule')
  @ApiOperation({ summary: 'Full week schedule' })
  weekSchedule(@CurrentTenant() tenantId: string) {
    return this.service.getWeekSchedule(tenantId);
  }

  @Get('attendance')
  @ApiOperation({ summary: 'Attendance records' })
  attendance(@CurrentTenant() tenantId: string, @Query() query: StaffQueryDto) {
    return this.service.getAttendance(tenantId, query);
  }

  @Get('time-off')
  @ApiOperation({ summary: 'Time-off requests' })
  timeOff(@CurrentTenant() tenantId: string, @Query() query: StaffQueryDto) {
    return this.service.getTimeOff(tenantId, query);
  }

  @Get('payroll')
  @ApiOperation({ summary: 'Payroll summary' })
  payroll(@CurrentTenant() tenantId: string, @Query('from') from: string, @Query('to') to: string) {
    return this.service.getPayrollSummary(tenantId, from, to);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get staff member details' })
  getById(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.getById(tenantId, id);
  }

  @Put(':id/profile')
  @ApiOperation({ summary: 'Update staff profile' })
  updateProfile(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateStaffProfileDto) {
    return this.service.updateProfile(tenantId, id, dto);
  }

  @Put(':id/schedule')
  @ApiOperation({ summary: 'Set staff schedule' })
  setSchedule(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: SetScheduleDto) {
    dto.userId = id;
    return this.service.setSchedule(tenantId, dto);
  }

  @Post('clock-in')
  @ApiOperation({ summary: 'Clock in' })
  clockIn(@CurrentTenant() tenantId: string, @Body() dto: ClockInDto) {
    return this.service.clockIn(tenantId, dto);
  }

  @Patch('clock-out/:attendanceId')
  @ApiOperation({ summary: 'Clock out' })
  clockOut(@CurrentTenant() tenantId: string, @Param('attendanceId') id: string, @Body() dto: ClockOutDto) {
    return this.service.clockOut(tenantId, id, dto);
  }

  @Post('time-off')
  @ApiOperation({ summary: 'Request time off' })
  createTimeOff(@CurrentTenant() tenantId: string, @Body() dto: CreateTimeOffDto) {
    return this.service.createTimeOff(tenantId, dto);
  }

  @Patch('time-off/:id/:action')
  @ApiOperation({ summary: 'Approve/reject time off' })
  reviewTimeOff(@CurrentTenant() tenantId: string, @Param('id') id: string, @Param('action') action: 'approved' | 'rejected') {
    return this.service.reviewTimeOff(tenantId, id, action, '');
  }
}
