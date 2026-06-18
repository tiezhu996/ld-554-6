import { Op, type WhereOptions } from 'sequelize';
import { Shift, Employee, Store } from '../models/index.js';
import { getPagination } from '../utils/pagination.js';
import { storeScope, enforceStoreScope } from './scope.service.js';
import type { AuthUser } from '../types/request.js';

export async function listShifts(query: Record<string, unknown>, user?: AuthUser) {
  const { page, pageSize, limit, offset } = getPagination(query);
  const where: WhereOptions = { ...storeScope(user) };
  if (query.storeId) Object.assign(where, { storeId: query.storeId });
  if (query.shiftType) Object.assign(where, { shiftType: query.shiftType });
  if (query.startDate && query.endDate) Object.assign(where, { date: { [Op.between]: [query.startDate, query.endDate] } });
  enforceStoreScope(where, user);
  const { rows, count } = await Shift.findAndCountAll({ where, limit, offset, include: [Employee, Store], order: [['date', 'ASC']] });
  return { list: rows, total: count, page, pageSize };
}

export async function createShift(payload: Record<string, unknown>) {
  return Shift.create(payload as never);
}

export async function updateShift(id: number, payload: Record<string, unknown>) {
  const shift = await Shift.findByPk(id);
  if (!shift) throw Object.assign(new Error('排班不存在'), { status: 404 });
  return shift.update(payload);
}

export async function autoGenerateShifts(storeId: number, date: string) {
  const employees = await Employee.findAll({ where: { storeId }, limit: 6 });
  const types = ['MORNING', 'AFTERNOON', 'NIGHT'] as const;
  const times = [
    { startTime: '08:00:00', endTime: '12:00:00' },
    { startTime: '13:00:00', endTime: '17:00:00' },
    { startTime: '18:00:00', endTime: '22:00:00' }
  ] as const;
  return Promise.all(
    employees.map((employee, index) =>
      Shift.create({
        employeeId: employee.id,
        storeId,
        date,
        shiftType: types[index % types.length],
        startTime: times[index % times.length].startTime,
        endTime: times[index % times.length].endTime,
        status: 'PENDING'
      })
    )
  );
}
