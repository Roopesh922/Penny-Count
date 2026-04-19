export interface User {
  id: string;
  _id?: string;
  name: string;
  email?: string;
  phone: string;
  role: 'owner' | 'co-owner' | 'agent';
  photo?: string;
  createdAt?: Date | string;
  isActive: boolean;
  assignedLines?: string[];
  addedBy?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}

export interface Line {
  id: string;
  name: string;
  ownerId: string;
  coOwnerId?: string;
  agentId?: string;
  initialCapital: number;
  currentBalance: number;
  totalDisbursed: number;
  totalCollected: number;
  borrowerCount: number;
  isActive: boolean;
  createdAt: Date;
  interestRate?: number;
  defaultTenure?: number;
}

export interface Borrower {
  id: string;
  lineId: string;
  serialNumber?: string;
  name: string;
  phone: string;
  address: string;
  photo?: string;
  geolocation?: {
    lat: number;
    lng: number;
  };
  isHighRisk: boolean;
  isDefaulter: boolean;
  totalLoans: number;
  activeLoans: number;
  totalRepaid: number;
  outstandingAmount: number;
  creditScore: number;
  agentId?: string;
  createdAt: Date;
  lastPaymentDate?: Date;
}

export interface Loan {
  id: string;
  borrowerId: string;
  lineId: string;
  agentId: string;
  amount: number;
  interestRate: number;
  tenure: number; // in days
  repaymentFrequency: 'daily' | 'weekly' | 'monthly';
  totalAmount: number; // principal + interest
  paidAmount: number;
  remainingAmount: number;
  status: 'active' | 'completed' | 'defaulted' | 'overdue';
  disbursedAt: Date;
  dueDate: Date;
  completedAt?: Date;
  nextPaymentDate: Date;
  dailyAmount?: number;
  weeklyAmount?: number;
  monthlyAmount?: number;
}

export interface Payment {
  id: string;
  loanId: string;
  borrowerId?: string;
  agentId?: string;
  collectedBy?: string;
  amount: number;
  method?: 'cash' | 'upi' | 'phonepe' | 'qr' | 'bank_transfer' | 'other';
  transactionId?: string;
  paymentDate: Date;
  receivedAt?: Date;
  syncedAt?: Date;
  isOffline?: boolean;
  notes?: string;
  createdAt: Date;
}

export interface Fine {
  id: string;
  loanId: string;
  borrowerId: string;
  type: 'missed' | 'delayed' | 'partial';
  amount: number;
  reason: string;
  appliedAt: Date;
  isPaid: boolean;
}

export interface MissedPayment {
  id: string;
  loanId: string;
  borrowerId: string;
  expectedDate: Date;
  weekNumber?: number;
  amountExpected: number;
  markedBy?: string;
  markedAt: Date;
  reason?: string;
  paidLater: boolean;
  paidAt?: Date;
  paymentId?: string;
  notes?: string;
  createdAt: Date;
}

export interface Penalty {
  id: string;
  loanId: string;
  borrowerId: string;
  lineId: string;
  penaltyType: 'missed_payment' | 'late_payment' | 'custom';
  amount: number;
  reason: string;
  appliedBy: string;
  appliedAt: Date;
  isPaid: boolean;
  paidAt?: Date;
  paymentId?: string;
  notes?: string;
  createdAt: Date;
}

export interface PaymentSchedule {
  termNumber: number;
  dueDate: Date;
  amountDue: number;
  amountPaid: number;
  status: 'pending' | 'paid' | 'partial' | 'missed' | 'overdue';
  paymentId?: string;
  missedPaymentId?: string;
  paidAt?: Date;
}

export interface Commission {
  id: string;
  agentId?: string;
  coOwnerId?: string;
  lineId: string;
  amount: number;
  percentage?: number;
  calculatedOn?: number;
  period?: string;
  periodStart?: Date;
  periodEnd?: Date;
  paidAt?: Date;
  paidDate?: Date;
  status: 'pending' | 'paid';
  createdAt?: Date;
}

export interface DashboardMetrics {
  totalLines: number;
  totalBorrowers: number;
  totalDisbursed: number;
  totalCollected: number;
  activeLoans: number;
  overdueLoans: number;
  collectionEfficiency: number;
  profit: number;
  cashOnHand: number;
  defaultRate: number;
  avgLoanSize: number;
  // Extended fields returned by getDashboardMetrics
  totalCapital?: number;
  pendingCollections?: number;
  lineCount?: number;
  recentActivity?: any[];
  completedLoans?: number;
  avgTenure?: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'payment_due' | 'payment_overdue' | 'loan_approved' | 'commission_paid' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
}

export interface SystemSettings {
  defaultInterestRate: number;
  defaultTenure: number;
  latePaymentFine: number;
  missedPaymentFine: number;
  partialPaymentFine: number;
  commissionRate: number;
  maxLoanAmount: number;
  minLoanAmount: number;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  budgetLimit?: number;
  requiresApproval: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface Expense {
  id: string;
  lineId?: string;
  categoryId: string;
  category?: ExpenseCategory;
  amount: number;
  expenseDate: Date;
  description: string;
  receiptUrl?: string;
  paymentMethod: 'cash' | 'digital' | 'bank_transfer' | 'upi';
  submittedBy: string;
  submittedByUser?: User;
  addedBy?: string;
  addedByUser?: User;
  addedByRole?: 'owner' | 'co-owner' | 'agent';
  approvedBy?: string;
  approvedByUser?: User;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  rejectionReason?: string;
  approvedAt?: Date;
  paidAt?: Date;
  createdAt: Date;
}

export interface DailyAccount {
  id: string;
  lineId?: string;
  line?: Line;
  accountDate: Date;
  openingBalance: number;
  totalCollections: number;
  totalExpenses: number;
  totalQrPayments: number;
  closingBalance: number;
  netBalance: number;
  isLocked: boolean;
  lockedBy?: string;
  lockedAt?: Date;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethod {
  id: string;
  lineId?: string;
  methodType: 'phonepe' | 'gpay' | 'paytm' | 'bank' | 'cash' | 'upi';
  accountName: string;
  accountNumber?: string;
  qrCodeData?: string;
  qrCodeUrl?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface QRPayment {
  id: string;
  loanId: string;
  loan?: Loan;
  borrowerId: string;
  borrower?: Borrower;
  paymentMethodId: string;
  paymentMethod?: PaymentMethod;
  amount: number;
  transactionId?: string;
  transactionStatus: 'success' | 'pending' | 'failed';
  paymentTimestamp: Date;
  reconciled: boolean;
  reconciledBy?: string;
  reconciledAt?: Date;
  notes?: string;
  createdAt: Date;
}

export interface CoOwnerAgentSession {
  id: string;
  coOwnerId: string;
  coOwner?: User;
  lineId?: string;
  line?: Line;
  sessionStart: Date;
  sessionEnd?: Date;
  collectionsMade: number;
  totalCollected: number;
  commissionEarned: number;
  isActive: boolean;
  createdAt: Date;
}

export interface DailyReport {
  id: string;
  reportDate: Date;
  lineId?: string;
  line?: Line;
  openingBalance: number;
  closingBalance: number;
  totalCollections: number;
  totalExpenses: number;
  netProfit: number;
  reportData?: any;
  generatedBy: string;
  generatedAt: Date;
  exported: boolean;
  exportUrl?: string;
}

export interface DailyReportData {
  date: Date;
  openingBalance: number;
  collections: {
    agentName: string;
    borrowerName: string;
    loanId: string;
    amount: number;
    method: string;
    time: Date;
  }[];
  qrPayments: {
    borrowerName: string;
    transactionId: string;
    amount: number;
    time: Date;
  }[];
  expenses: {
    category: string;
    description: string;
    amount: number;
    submittedBy: string;
  }[];
  totalCollections: number;
  totalQrPayments: number;
  totalExpenses: number;
  netBalance: number;
  closingBalance: number;
  agentPerformance: {
    agentName: string;
    collections: number;
    commission: number;
    net: number;
  }[];
}