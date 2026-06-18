import { describe, it, expect } from 'vitest';
import { Op } from 'sequelize';
import { storeScope, enforceStoreScope, directStoreScope } from '../src/services/scope.service.js';
import { UserRole } from '../src/constants/enums.js';
import type { AuthUser } from '../src/types/request.js';

const ownerUser: AuthUser = { id: 1, username: 'owner', role: UserRole.OWNER, employeeId: 1, storeId: 1 };
const managerOfStore1: AuthUser = { id: 2, username: 'manager1', role: UserRole.MANAGER, employeeId: 2, storeId: 1 };
const managerOfStore2: AuthUser = { id: 3, username: 'manager2', role: UserRole.MANAGER, employeeId: 3, storeId: 2 };
const employeeOfStore1: AuthUser = { id: 4, username: 'emp1', role: UserRole.EMPLOYEE, employeeId: 4, storeId: 1 };
const managerNoStore: AuthUser = { id: 5, username: 'manager_nostore', role: UserRole.MANAGER, employeeId: 5, storeId: null };

describe('storeScope', () => {
  it('OWNER 角色不添加门店过滤', () => {
    expect(storeScope(ownerUser)).toEqual({});
  });

  it('无用户时不添加门店过滤', () => {
    expect(storeScope(undefined)).toEqual({});
  });

  it('MANAGER 角色返回自己门店的过滤条件', () => {
    expect(storeScope(managerOfStore1)).toEqual({ storeId: 1 });
    expect(storeScope(managerOfStore2)).toEqual({ storeId: 2 });
  });

  it('MANAGER 无 storeId 时不添加过滤', () => {
    expect(storeScope(managerNoStore)).toEqual({});
  });

  it('EMPLOYEE 角色返回本门店或本人的过滤条件', () => {
    const result = storeScope(employeeOfStore1) as Record<string, unknown>;
    const orConditions = result[Op.or as unknown as string] as unknown[];
    expect(orConditions).toBeDefined();
    expect(orConditions).toHaveLength(2);
    expect(orConditions).toContainEqual({ storeId: 1 });
    expect(orConditions).toContainEqual({ id: 4 });
  });
});

describe('enforceStoreScope', () => {
  it('MANAGER: 不传 storeId 时强制使用本店 ID', () => {
    const where: Record<string, unknown> = {};
    enforceStoreScope(where, managerOfStore1);
    expect(where.storeId).toBe(1);
  });

  it('MANAGER: 请求参数传其他门店 storeId 时被强制覆盖回本店', () => {
    const where: Record<string, unknown> = { storeId: 999 };
    enforceStoreScope(where, managerOfStore1);
    expect(where.storeId).toBe(1);
  });

  it('MANAGER: 请求参数传正确本店 storeId 时保持不变', () => {
    const where: Record<string, unknown> = { storeId: 1 };
    enforceStoreScope(where, managerOfStore1);
    expect(where.storeId).toBe(1);
  });

  it('MANAGER store2: 请求参数传 store1 时被强制覆盖为 store2', () => {
    const where: Record<string, unknown> = { storeId: 1 };
    enforceStoreScope(where, managerOfStore2);
    expect(where.storeId).toBe(2);
  });

  it('OWNER: 请求参数的 storeId 不被覆盖', () => {
    const where: Record<string, unknown> = { storeId: 3 };
    enforceStoreScope(where, ownerUser);
    expect(where.storeId).toBe(3);
  });

  it('无用户: 请求参数的 storeId 不被覆盖', () => {
    const where: Record<string, unknown> = { storeId: 5 };
    enforceStoreScope(where, undefined);
    expect(where.storeId).toBe(5);
  });

  it('MANAGER 无 storeId: 不强制覆盖', () => {
    const where: Record<string, unknown> = { storeId: 3 };
    enforceStoreScope(where, managerNoStore);
    expect(where.storeId).toBe(3);
  });

  it('保留其他 where 条件不被修改', () => {
    const where: Record<string, unknown> = { storeId: 999, department: '运营', status: 'ACTIVE' };
    enforceStoreScope(where, managerOfStore1);
    expect(where.storeId).toBe(1);
    expect(where.department).toBe('运营');
    expect(where.status).toBe('ACTIVE');
  });
});

describe('directStoreScope', () => {
  it('OWNER 不添加门店过滤', () => {
    expect(directStoreScope(ownerUser)).toEqual({});
  });

  it('MANAGER 返回本门店 ID 过滤', () => {
    expect(directStoreScope(managerOfStore1)).toEqual({ id: 1 });
    expect(directStoreScope(managerOfStore2)).toEqual({ id: 2 });
  });

  it('EMPLOYEE 返回本门店 ID 过滤', () => {
    expect(directStoreScope(employeeOfStore1)).toEqual({ id: 1 });
  });
});
