import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateRecipeDto, UpdateRecipeDto, CreateIngredientDto, UpdateIngredientDto } from './dto/recipes.dto';

@Injectable()
export class RecipesService {
  constructor(private prisma: PrismaService) {}

  // ═══ INGREDIENTS ═══

  async getIngredients(tenantId: string) {
    return this.prisma.ingredient.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async createIngredient(tenantId: string, dto: CreateIngredientDto) {
    return this.prisma.ingredient.create({
      data: {
        tenantId,
        name: dto.name,
        unit: dto.unit,
        costPerUnit: dto.costPerUnit || 0,
        currentStock: dto.currentStock || 0,
        minStock: dto.minStock || 0,
        category: dto.category,
      },
    });
  }

  async updateIngredient(tenantId: string, id: string, dto: UpdateIngredientDto) {
    const ingredient = await this.prisma.ingredient.findFirst({ where: { id, tenantId } });
    if (!ingredient) throw new NotFoundException('Ingrediente no encontrado');

    const updated = await this.prisma.ingredient.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.costPerUnit !== undefined && { costPerUnit: dto.costPerUnit }),
        ...(dto.currentStock !== undefined && { currentStock: dto.currentStock }),
        ...(dto.minStock !== undefined && { minStock: dto.minStock }),
        ...(dto.category !== undefined && { category: dto.category }),
      },
    });

    // Recalculate recipes that use this ingredient
    await this.recalculateRecipesByIngredient(tenantId, id);

    return updated;
  }

  async deleteIngredient(tenantId: string, id: string) {
    const ingredient = await this.prisma.ingredient.findFirst({ where: { id, tenantId } });
    if (!ingredient) throw new NotFoundException('Ingrediente no encontrado');

    await this.prisma.ingredient.update({ where: { id }, data: { isActive: false } });
    return { success: true };
  }

  // ═══ RECIPES ═══

  async getRecipes(tenantId: string) {
    const recipes = await this.prisma.recipe.findMany({
      where: { tenantId },
      include: {
        product: { select: { id: true, name: true, price: true, imageUrl: true, categoryId: true } },
        items: {
          include: {
            ingredient: { select: { id: true, name: true, unit: true, costPerUnit: true } },
          },
        },
      },
      orderBy: { product: { name: 'asc' } },
    });

    return recipes.map(r => ({
      ...r,
      totalCost: parseFloat(r.totalCost.toString()),
      yieldQuantity: parseFloat(r.yieldQuantity.toString()),
      costPerUnit: parseFloat(r.totalCost.toString()) / parseFloat(r.yieldQuantity.toString()),
      margin: r.product.price
        ? ((parseFloat(r.product.price.toString()) - parseFloat(r.totalCost.toString())) / parseFloat(r.product.price.toString())) * 100
        : 0,
      items: r.items.map(i => ({
        ...i,
        quantity: parseFloat(i.quantity.toString()),
        cost: parseFloat(i.cost.toString()),
        ingredient: {
          ...i.ingredient,
          costPerUnit: parseFloat(i.ingredient.costPerUnit.toString()),
        },
      })),
    }));
  }

  async getRecipeByProduct(tenantId: string, productId: string) {
    const recipe = await this.prisma.recipe.findFirst({
      where: { tenantId, productId },
      include: {
        product: { select: { id: true, name: true, price: true } },
        items: {
          include: {
            ingredient: { select: { id: true, name: true, unit: true, costPerUnit: true } },
          },
        },
      },
    });

    if (!recipe) return null;

    return {
      ...recipe,
      totalCost: parseFloat(recipe.totalCost.toString()),
      yieldQuantity: parseFloat(recipe.yieldQuantity.toString()),
      items: recipe.items.map(i => ({
        ...i,
        quantity: parseFloat(i.quantity.toString()),
        cost: parseFloat(i.cost.toString()),
        ingredient: {
          ...i.ingredient,
          costPerUnit: parseFloat(i.ingredient.costPerUnit.toString()),
        },
      })),
    };
  }

  async createRecipe(tenantId: string, dto: CreateRecipeDto) {
    // Calculate costs
    const itemCosts = await this.calculateItemCosts(tenantId, dto.items);
    const totalCost = itemCosts.reduce((sum, i) => sum + i.cost, 0);

    const recipe = await this.prisma.recipe.create({
      data: {
        tenantId,
        productId: dto.productId,
        yieldQuantity: dto.yieldQuantity || 1,
        yieldUnit: dto.yieldUnit || 'portion',
        totalCost,
        instructions: dto.instructions,
        items: {
          create: itemCosts.map(i => ({
            tenantId,
            ingredientId: i.ingredientId,
            quantity: i.quantity,
            unit: i.unit,
            cost: i.cost,
          })),
        },
      },
      include: {
        product: { select: { id: true, name: true, price: true } },
        items: { include: { ingredient: true } },
      },
    });

    // Update product cost
    await this.prisma.product.update({
      where: { id: dto.productId },
      data: { cost: totalCost },
    });

    return recipe;
  }

  async updateRecipe(tenantId: string, recipeId: string, dto: UpdateRecipeDto) {
    const recipe = await this.prisma.recipe.findFirst({ where: { id: recipeId, tenantId } });
    if (!recipe) throw new NotFoundException('Receta no encontrada');

    const updateData: any = {};
    if (dto.yieldQuantity !== undefined) updateData.yieldQuantity = dto.yieldQuantity;
    if (dto.yieldUnit !== undefined) updateData.yieldUnit = dto.yieldUnit;
    if (dto.instructions !== undefined) updateData.instructions = dto.instructions;

    if (dto.items) {
      // Recalculate costs and replace items
      const itemCosts = await this.calculateItemCosts(tenantId, dto.items);
      const totalCost = itemCosts.reduce((sum, i) => sum + i.cost, 0);
      updateData.totalCost = totalCost;

      // Delete old items, create new ones
      await this.prisma.recipeItem.deleteMany({ where: { recipeId } });
      await this.prisma.recipeItem.createMany({
        data: itemCosts.map(i => ({
          tenantId,
          recipeId,
          ingredientId: i.ingredientId,
          quantity: i.quantity,
          unit: i.unit,
          cost: i.cost,
        })),
      });

      // Update product cost
      await this.prisma.product.update({
        where: { id: recipe.productId },
        data: { cost: totalCost },
      });
    }

    return this.prisma.recipe.update({
      where: { id: recipeId },
      data: updateData,
      include: {
        product: { select: { id: true, name: true, price: true } },
        items: { include: { ingredient: true } },
      },
    });
  }

  async deleteRecipe(tenantId: string, recipeId: string) {
    const recipe = await this.prisma.recipe.findFirst({ where: { id: recipeId, tenantId } });
    if (!recipe) throw new NotFoundException('Receta no encontrada');

    await this.prisma.recipe.delete({ where: { id: recipeId } });

    // Clear product cost
    await this.prisma.product.update({
      where: { id: recipe.productId },
      data: { cost: null },
    });

    return { success: true };
  }

  // ═══ COST ANALYSIS ═══

  async getCostAnalysis(tenantId: string) {
    const recipes = await this.getRecipes(tenantId);

    const analysis = recipes.map(r => {
      const price = parseFloat(r.product.price?.toString() || '0');
      const cost = r.totalCost;
      const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
      const markup = cost > 0 ? ((price - cost) / cost) * 100 : 0;

      return {
        productId: r.product.id,
        productName: r.product.name,
        price,
        cost,
        profit: price - cost,
        margin: Math.round(margin * 10) / 10,
        markup: Math.round(markup * 10) / 10,
        itemCount: r.items.length,
      };
    });

    const avgMargin = analysis.length > 0
      ? analysis.reduce((s, a) => s + a.margin, 0) / analysis.length
      : 0;

    const lowMargin = analysis.filter(a => a.margin < 30);
    const highMargin = analysis.filter(a => a.margin >= 60);

    return {
      products: analysis.sort((a, b) => a.margin - b.margin),
      summary: {
        totalProducts: analysis.length,
        avgMargin: Math.round(avgMargin * 10) / 10,
        lowMarginCount: lowMargin.length,
        highMarginCount: highMargin.length,
      },
    };
  }

  // ═══ HELPERS ═══

  private async calculateItemCosts(tenantId: string, items: { ingredientId: string; quantity: number; unit: string }[]) {
    const ingredientIds = items.map(i => i.ingredientId);
    const ingredients = await this.prisma.ingredient.findMany({
      where: { id: { in: ingredientIds }, tenantId },
    });

    const ingredientMap = new Map(ingredients.map(i => [i.id, i]));

    return items.map(item => {
      const ingredient = ingredientMap.get(item.ingredientId);
      const costPerUnit = ingredient ? parseFloat((ingredient as any).costPerUnit.toString()) : 0;
      const cost = costPerUnit * item.quantity;

      return {
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        unit: item.unit,
        cost,
      };
    });
  }

  private async recalculateRecipesByIngredient(tenantId: string, ingredientId: string) {
    const recipeItems = await this.prisma.recipeItem.findMany({
      where: { tenantId, ingredientId },
      include: { recipe: true, ingredient: true },
    });

    for (const item of recipeItems) {
      const cost = parseFloat(item.ingredient.costPerUnit.toString()) * parseFloat(item.quantity.toString());

      await this.prisma.recipeItem.update({
        where: { id: item.id },
        data: { cost },
      });

      // Recalculate recipe total
      const allItems = await this.prisma.recipeItem.findMany({ where: { recipeId: item.recipeId } });
      const totalCost = allItems.reduce((sum, i) => sum + parseFloat(i.cost.toString()), 0);

      await this.prisma.recipe.update({
        where: { id: item.recipeId },
        data: { totalCost },
      });

      // Update product cost
      await this.prisma.product.update({
        where: { id: item.recipe.productId },
        data: { cost: totalCost },
      });
    }
  }
}
