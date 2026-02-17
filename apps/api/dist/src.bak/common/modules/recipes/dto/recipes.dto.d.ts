export declare class RecipeItemDto {
    ingredientId: string;
    quantity: number;
    unit: string;
}
export declare class CreateRecipeDto {
    productId: string;
    yieldQuantity?: number;
    yieldUnit?: string;
    instructions?: string;
    items: RecipeItemDto[];
}
export declare class UpdateRecipeDto {
    yieldQuantity?: number;
    yieldUnit?: string;
    instructions?: string;
    items?: RecipeItemDto[];
}
export declare class CreateIngredientDto {
    name: string;
    unit: string;
    costPerUnit?: number;
    currentStock?: number;
    minStock?: number;
    category?: string;
}
export declare class UpdateIngredientDto {
    name?: string;
    unit?: string;
    costPerUnit?: number;
    currentStock?: number;
    minStock?: number;
    category?: string;
}
