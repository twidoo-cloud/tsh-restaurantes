import { BranchesService } from './branches.service';
export declare class BranchesController {
    private branchesService;
    constructor(branchesService: BranchesService);
    findAll(tenantId: string): unknown;
    findOne(tenantId: string, id: string): unknown;
    getStats(tenantId: string, id: string): unknown;
    create(tenantId: string, body: any): unknown;
    update(tenantId: string, id: string, body: any): unknown;
    setMain(tenantId: string, id: string): unknown;
    delete(tenantId: string, id: string): unknown;
}
