export type EmployeeStatus = 'ACTIVE' | 'ARCHIVED';

export type TransactionType = 'GIVEN' | 'ADVANCE';

export interface Employee {
  id: string;
  name: string;
  phone: string | null;
  photo_path: string | null;
  status: EmployeeStatus;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  employee_id: string;
  type: TransactionType;
  amount: number; // Integer whole rupees only
  date: string; // YYYY-MM-DD
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeSummary {
  balance: number;
  total_advance: number;
  total_given: number;
  total_handled: number;
  transaction_count: number;
}

export interface EmployeeWithBalance extends Employee {
  balance: number;
  total_advance: number;
  total_given: number;
  total_handled: number;
  transaction_count: number;
}

export interface SettingItem {
  key: string;
  value: string;
}

export interface BackupData {
  schema_version: number;
  exported_at: string;
  employees: Employee[];
  transactions: Transaction[];
  settings: Record<string, string>;
  photos: Record<string, string>; // relative_path -> base64 data
}
