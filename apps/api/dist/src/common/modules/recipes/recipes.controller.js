"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecipesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const tenant_decorator_1 = require("../../decorators/tenant.decorator");
const recipes_service_1 = require("./recipes.service");
const recipes_dto_1 = require("./dto/recipes.dto");
let RecipesController = class RecipesController {
    constructor(recipesService) {
        this.recipesService = recipesService;
    }
    async getIngredients(tenantId) {
        return this.recipesService.getIngredients(tenantId);
    }
    async createIngredient(tenantId, dto) {
        return this.recipesService.createIngredient(tenantId, dto);
    }
    async updateIngredient(tenantId, id, dto) {
        return this.recipesService.updateIngredient(tenantId, id, dto);
    }
    async deleteIngredient(tenantId, id) {
        return this.recipesService.deleteIngredient(tenantId, id);
    }
    async getRecipes(tenantId) {
        return this.recipesService.getRecipes(tenantId);
    }
    async getRecipeByProduct(tenantId, productId) {
        return this.recipesService.getRecipeByProduct(tenantId, productId);
    }
    async getCostAnalysis(tenantId) {
        return this.recipesService.getCostAnalysis(tenantId);
    }
    async createRecipe(tenantId, dto) {
        return this.recipesService.createRecipe(tenantId, dto);
    }
    async updateRecipe(tenantId, id, dto) {
        return this.recipesService.updateRecipe(tenantId, id, dto);
    }
    async deleteRecipe(tenantId, id) {
        return this.recipesService.deleteRecipe(tenantId, id);
    }
};
exports.RecipesController = RecipesController;
__decorate([
    (0, common_1.Get)('ingredients'),
    (0, swagger_1.ApiOperation)({ summary: 'List all ingredients' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RecipesController.prototype, "getIngredients", null);
__decorate([
    (0, common_1.Post)('ingredients'),
    (0, swagger_1.ApiOperation)({ summary: 'Create ingredient' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, recipes_dto_1.CreateIngredientDto]),
    __metadata("design:returntype", Promise)
], RecipesController.prototype, "createIngredient", null);
__decorate([
    (0, common_1.Put)('ingredients/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update ingredient' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, recipes_dto_1.UpdateIngredientDto]),
    __metadata("design:returntype", Promise)
], RecipesController.prototype, "updateIngredient", null);
__decorate([
    (0, common_1.Delete)('ingredients/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete ingredient (soft)' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RecipesController.prototype, "deleteIngredient", null);
__decorate([
    (0, common_1.Get)('recipes'),
    (0, swagger_1.ApiOperation)({ summary: 'List all recipes with cost analysis' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RecipesController.prototype, "getRecipes", null);
__decorate([
    (0, common_1.Get)('recipes/product/:productId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get recipe for a specific product' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RecipesController.prototype, "getRecipeByProduct", null);
__decorate([
    (0, common_1.Get)('recipes/cost-analysis'),
    (0, swagger_1.ApiOperation)({ summary: 'Get cost analysis for all products with recipes' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RecipesController.prototype, "getCostAnalysis", null);
__decorate([
    (0, common_1.Post)('recipes'),
    (0, swagger_1.ApiOperation)({ summary: 'Create recipe for a product' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, recipes_dto_1.CreateRecipeDto]),
    __metadata("design:returntype", Promise)
], RecipesController.prototype, "createRecipe", null);
__decorate([
    (0, common_1.Put)('recipes/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update recipe' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, recipes_dto_1.UpdateRecipeDto]),
    __metadata("design:returntype", Promise)
], RecipesController.prototype, "updateRecipe", null);
__decorate([
    (0, common_1.Delete)('recipes/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete recipe' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RecipesController.prototype, "deleteRecipe", null);
exports.RecipesController = RecipesController = __decorate([
    (0, swagger_1.ApiTags)('Recipes & Ingredients'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [recipes_service_1.RecipesService])
], RecipesController);
//# sourceMappingURL=recipes.controller.js.map