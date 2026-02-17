import { PrismaService } from '../../prisma.service';
import { CreateRecipeDto, UpdateRecipeDto, CreateIngredientDto, UpdateIngredientDto } from './dto/recipes.dto';
export declare class RecipesService {
    private prisma;
    constructor(prisma: PrismaService);
    getIngredients(tenantId: string): Promise<{
        id: string;
        tenantId: string;
        branchId: string | null;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        unit: string;
        currentStock: import("@prisma/client/runtime/library").Decimal;
        minStock: import("@prisma/client/runtime/library").Decimal;
        category: string | null;
        supplierId: string | null;
        costPerUnit: import("@prisma/client/runtime/library").Decimal;
    }[]>;
    createIngredient(tenantId: string, dto: CreateIngredientDto): Promise<{
        id: string;
        tenantId: string;
        branchId: string | null;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        unit: string;
        currentStock: import("@prisma/client/runtime/library").Decimal;
        minStock: import("@prisma/client/runtime/library").Decimal;
        category: string | null;
        supplierId: string | null;
        costPerUnit: import("@prisma/client/runtime/library").Decimal;
    }>;
    updateIngredient(tenantId: string, id: string, dto: UpdateIngredientDto): Promise<{
        id: string;
        tenantId: string;
        branchId: string | null;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        unit: string;
        currentStock: import("@prisma/client/runtime/library").Decimal;
        minStock: import("@prisma/client/runtime/library").Decimal;
        category: string | null;
        supplierId: string | null;
        costPerUnit: import("@prisma/client/runtime/library").Decimal;
    }>;
    deleteIngredient(tenantId: string, id: string): Promise<{
        success: boolean;
    }>;
    getRecipes(tenantId: string): Promise<{
        totalCost: number;
        yieldQuantity: number;
        costPerUnit: number;
        margin: number;
        items: {
            quantity: number;
            cost: number;
            ingredient: {
                costPerUnit: number;
                id: string;
                name: string;
                unit: string;
            };
            id: string;
            tenantId: string;
            unit: string;
            ingredientId: string;
            recipeId: string;
        }[];
        product: {
            id: string;
            name: string;
            categoryId: string;
            price: import("@prisma/client/runtime/library").Decimal;
            imageUrl: string;
        };
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        productId: string;
        yieldUnit: string;
        instructions: string | null;
    }[]>;
    getRecipeByProduct(tenantId: string, productId: string): Promise<{
        totalCost: number;
        yieldQuantity: number;
        items: {
            quantity: number;
            cost: number;
            ingredient: {
                costPerUnit: number;
                id: string;
                name: string;
                unit: string;
            };
            id: string;
            tenantId: string;
            unit: string;
            ingredientId: string;
            recipeId: string;
        }[];
        product: {
            id: string;
            name: string;
            price: import("@prisma/client/runtime/library").Decimal;
        };
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        productId: string;
        yieldUnit: string;
        instructions: string | null;
    }>;
    createRecipe(tenantId: string, dto: CreateRecipeDto): Promise<{
        product: {
            id: string;
            name: string;
            price: import("@prisma/client/runtime/library").Decimal;
        };
        items: ({
            ingredient: {
                id: string;
                tenantId: string;
                branchId: string | null;
                createdAt: Date;
                name: string;
                isActive: boolean;
                updatedAt: Date;
                unit: string;
                currentStock: import("@prisma/client/runtime/library").Decimal;
                minStock: import("@prisma/client/runtime/library").Decimal;
                category: string | null;
                supplierId: string | null;
                costPerUnit: import("@prisma/client/runtime/library").Decimal;
            };
        } & {
            id: string;
            tenantId: string;
            cost: import("@prisma/client/runtime/library").Decimal;
            unit: string;
            quantity: import("@prisma/client/runtime/library").Decimal;
            ingredientId: string;
            recipeId: string;
        })[];
    } & {
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        productId: string;
        yieldQuantity: import("@prisma/client/runtime/library").Decimal;
        yieldUnit: string;
        totalCost: import("@prisma/client/runtime/library").Decimal;
        instructions: string | null;
    }>;
    updateRecipe(tenantId: string, recipeId: string, dto: UpdateRecipeDto): Promise<{
        product: {
            id: string;
            name: string;
            price: import("@prisma/client/runtime/library").Decimal;
        };
        items: ({
            ingredient: {
                id: string;
                tenantId: string;
                branchId: string | null;
                createdAt: Date;
                name: string;
                isActive: boolean;
                updatedAt: Date;
                unit: string;
                currentStock: import("@prisma/client/runtime/library").Decimal;
                minStock: import("@prisma/client/runtime/library").Decimal;
                category: string | null;
                supplierId: string | null;
                costPerUnit: import("@prisma/client/runtime/library").Decimal;
            };
        } & {
            id: string;
            tenantId: string;
            cost: import("@prisma/client/runtime/library").Decimal;
            unit: string;
            quantity: import("@prisma/client/runtime/library").Decimal;
            ingredientId: string;
            recipeId: string;
        })[];
    } & {
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        productId: string;
        yieldQuantity: import("@prisma/client/runtime/library").Decimal;
        yieldUnit: string;
        totalCost: import("@prisma/client/runtime/library").Decimal;
        instructions: string | null;
    }>;
    deleteRecipe(tenantId: string, recipeId: string): Promise<{
        success: boolean;
    }>;
    getCostAnalysis(tenantId: string): Promise<{
        products: {
            productId: string;
            productName: string;
            price: number;
            cost: number;
            profit: number;
            margin: number;
            markup: number;
            itemCount: number;
        }[];
        summary: {
            totalProducts: number;
            avgMargin: number;
            lowMarginCount: number;
            highMarginCount: number;
        };
    }>;
    private calculateItemCosts;
    private recalculateRecipesByIngredient;
}
