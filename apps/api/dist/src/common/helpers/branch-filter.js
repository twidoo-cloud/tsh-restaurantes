"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.branchCondition = branchCondition;
exports.branchConditionFor = branchConditionFor;
exports.branchWhere = branchWhere;
function branchCondition(branchId) {
    if (!branchId)
        return '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(branchId))
        return '';
    return `AND branch_id = '${branchId}'`;
}
function branchConditionFor(alias, branchId) {
    if (!branchId)
        return '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(branchId))
        return '';
    return `AND ${alias}.branch_id = '${branchId}'`;
}
function branchWhere(branchId) {
    if (!branchId)
        return {};
    return { branchId };
}
//# sourceMappingURL=branch-filter.js.map