import type { EmployeeSummary } from '../types';
import { runQuery } from '../database/db';

/**
 * Single source of truth for money logic:
 * ADVANCE is positive. GIVEN is negative.
 * balance = SUM(advance amounts) - SUM(given amounts)
 */
export function calculateBalance(totalAdvance: number, totalGiven: number): number {
  return Math.round(totalAdvance) - Math.round(totalGiven);
}

/**
 * Computes summary totals (balance, total_advance, total_given, count)
 * for a specific employee via SQLite aggregate query.
 */
export async function getEmployeeBalanceSummary(employeeId: string): Promise<EmployeeSummary> {
  const sql = `
    SELECT
      COALESCE(SUM(CASE WHEN type = 'ADVANCE' THEN amount ELSE 0 END), 0) AS total_advance,
      COALESCE(SUM(CASE WHEN type = 'GIVEN' THEN amount ELSE 0 END), 0) AS total_given,
      COUNT(id) AS transaction_count
    FROM transactions
    WHERE employee_id = ?
  `;

  interface AggRow {
    total_advance: number;
    total_given: number;
    transaction_count: number;
  }

  const rows = await runQuery<AggRow>(sql, [employeeId]);
  if (!rows || rows.length === 0) {
    return {
      balance: 0,
      total_advance: 0,
      total_given: 0,
      total_handled: 0,
      transaction_count: 0,
    };
  }

  const totalAdvance = Number(rows[0].total_advance) || 0;
  const totalGiven = Number(rows[0].total_given) || 0;
  const count = Number(rows[0].transaction_count) || 0;

  return {
    total_advance: totalAdvance,
    total_given: totalGiven,
    total_handled: totalAdvance + totalGiven,
    balance: calculateBalance(totalAdvance, totalGiven),
    transaction_count: count,
  };
}
