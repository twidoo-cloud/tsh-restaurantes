import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentTenant } from '../../decorators/tenant.decorator';
import { RecipesService } from './recipes.service';
import {
  CreateRecipeDto, UpdateRecipeDto,
  CreateIngredientDto, UpdateIngredientDto,
} from './dto/recipes.dto';

@ApiTags('Recipes & Ingredients')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller()
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  // ═══ INGREDIENTS ═══

  @Get('ingredients')
  @ApiOperation({ summary: 'List all ingredients' })
  async getIngredients(@CurrentTenant() tenantId: string) {
    return this.recipesService.getIngredients(tenantId);
  }

  @Post('ingredients')
  @ApiOperation({ summary: 'Create ingredient' })
  async createIngredient(@CurrentTenant() tenantId: string, @Body() dto: CreateIngredientDto) {
    return this.recipesService.createIngredient(tenantId, dto);
  }

  @Put('ingredients/:id')
  @ApiOperation({ summary: 'Update ingredient' })
  async updateIngredient(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateIngredientDto) {
    return this.recipesService.updateIngredient(tenantId, id, dto);
  }

  @Delete('ingredients/:id')
  @ApiOperation({ summary: 'Delete ingredient (soft)' })
  async deleteIngredient(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.recipesService.deleteIngredient(tenantId, id);
  }

  // ═══ RECIPES ═══

  @Get('recipes')
  @ApiOperation({ summary: 'List all recipes with cost analysis' })
  async getRecipes(@CurrentTenant() tenantId: string) {
    return this.recipesService.getRecipes(tenantId);
  }

  @Get('recipes/product/:productId')
  @ApiOperation({ summary: 'Get recipe for a specific product' })
  async getRecipeByProduct(@CurrentTenant() tenantId: string, @Param('productId') productId: string) {
    return this.recipesService.getRecipeByProduct(tenantId, productId);
  }

  @Get('recipes/cost-analysis')
  @ApiOperation({ summary: 'Get cost analysis for all products with recipes' })
  async getCostAnalysis(@CurrentTenant() tenantId: string) {
    return this.recipesService.getCostAnalysis(tenantId);
  }

  @Post('recipes')
  @ApiOperation({ summary: 'Create recipe for a product' })
  async createRecipe(@CurrentTenant() tenantId: string, @Body() dto: CreateRecipeDto) {
    return this.recipesService.createRecipe(tenantId, dto);
  }

  @Put('recipes/:id')
  @ApiOperation({ summary: 'Update recipe' })
  async updateRecipe(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateRecipeDto) {
    return this.recipesService.updateRecipe(tenantId, id, dto);
  }

  @Delete('recipes/:id')
  @ApiOperation({ summary: 'Delete recipe' })
  async deleteRecipe(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.recipesService.deleteRecipe(tenantId, id);
  }
}
