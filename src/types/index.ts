export type TransactionWithCategory = {
  id: string;
  accountId: string;
  externalId: string | null;
  date: Date;
  amount: number;
  currency: string;
  description: string;
  merchantName: string | null;
  categoryId: string | null;
  isRecurring: boolean;
  recurringGroupId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: string;
  } | null;
  account: {
    id: string;
    name: string;
    currency: string;
  };
};

export type CategoryWithChildren = {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
  parentId: string | null;
  children: {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: string;
  }[];
};

export type BudgetWithCategory = {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  period: string;
  alertThreshold: number;
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  spent: number;
};

export type AccountWithBalance = {
  id: string;
  name: string;
  iban: string | null;
  currency: string;
  balance: number;
  type: string;
  isManual: boolean;
  bankConnection: {
    institutionName: string;
  } | null;
};

export type DashboardStats = {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  topCategories: { name: string; color: string; amount: number; percentage: number }[];
  monthlyTrend: { month: string; income: number; expenses: number }[];
  recentTransactions: TransactionWithCategory[];
  budgetAlerts: BudgetWithCategory[];
};

export type RecurringGroupWithDetails = {
  id: string;
  merchantName: string;
  estimatedAmount: number;
  frequency: string;
  isActive: boolean;
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
  } | null;
  lastTransaction: {
    date: Date;
    amount: number;
  } | null;
};
