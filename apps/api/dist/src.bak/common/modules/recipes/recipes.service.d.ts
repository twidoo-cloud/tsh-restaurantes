import { PrismaService } from '../../prisma.service';
import { CreateRecipeDto, UpdateRecipeDto, CreateIngredientDto, UpdateIngredientDto } from './dto/recipes.dto';
export declare class RecipesService {
    private prisma;
    constructor(prisma: PrismaService);
    getIngredients(tenantId: string): unknown;
    createIngredient(tenantId: string, dto: CreateIngredientDto): unknown;
    updateIngredient(tenantId: string, id: string, dto: UpdateIngredientDto): unknown;
    deleteIngredient(tenantId: string, id: string): unknown;
    getRecipes(tenantId: string): unknown;
    getRecipeByProduct(tenantId: string, productId: string): unknown;
    createRecipe(tenantId: string, dto: CreateRecipeDto): unknown;
    updateRecipe(tenantId: string, recipeId: string, dto: UpdateRecipeDto): unknown;
    deleteRecipe(tenantId: string, recipeId: string): unknown;
    getCostAnalysis(tenantId: string): unknown;
    private calculateItemCosts;
    private recalculateRecipesByIngredient;
}
