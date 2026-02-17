import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentTenant } from '../../decorators/tenant.decorator';
import { BranchesService } from './branches.service';

@ApiTags('Branches (Sucursales)')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('branches')
export class BranchesController {
  constructor(private branchesService: BranchesService) {}

  @Get()
  @ApiOperation({ summary: 'List all branches for tenant' })
  async findAll(@CurrentTenant() tenantId: string) {
    return this.branchesService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get branch details' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.branchesService.findOne(tenantId, id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get branch statistics' })
  async getStats(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.branchesService.getStats(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new branch' })
  async create(@CurrentTenant() tenantId: string, @Body() body: any) {
    return this.branchesService.create(tenantId, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update branch' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.branchesService.update(tenantId, id, body);
  }

  @Post(':id/set-main')
  @ApiOperation({ summary: 'Set branch as main' })
  async setMain(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.branchesService.setMain(tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete branch' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.branchesService.delete(tenantId, id);
  }
}
