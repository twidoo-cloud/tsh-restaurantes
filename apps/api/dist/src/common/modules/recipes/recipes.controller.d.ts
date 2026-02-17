import { RecipesService } from './recipes.service';
import { CreateRecipeDto, UpdateRecipeDto, CreateIngredientDto, UpdateIngredientDto } from './dto/recipes.dto';
export declare class RecipesController {
    private readonly recipesService;
    constructor(recipesService: RecipesService);
    getIngredients(tenantId: string): unknown;
    createIngredient(tenantId: string, dto: CreateIngredientDto): unknown;
    updateIngredient(tenantId: string, id: string, dto: UpdateIngredientDto): unknown;
    deleteIngredient(tenantId: string, id: string): unknown;
    getRecipes(tenantId: string): unknown;
    getRecipeByProduct(tenantId: string, productId: string): unknown;
    getCostAnalysis(tenantId: string): unknown;
    createRecipe(tenantId: string, dto: CreateRecipeDto): unknown;
    updateRecipe(tenantId: string, id: string, dto: UpdateRecipeDto): unknown;
    deleteRecipe(tenantId: string, id: string): unknown;
}
