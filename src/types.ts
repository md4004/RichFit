export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  image: string;
  sku: string;
  stock: number;
  minStock?: number; // admin is alerted when stock drops to this level (unset = no alert)
  isBestSeller?: boolean;
}

export interface Member {
  id: string;
  uid?: string;
  name: string;
  tier: 'Beginner' | 'Intermediate' | 'Expert';
  height: number;
  weight: number;
  gender: 'Male' | 'Female';
  focus: 'Hypertrophy' | 'Strength' | 'Endurance' | 'Mobility';
  image: string;
  phone?: string;
  address?: string;
  subscriptionEnd?: string;
  subscriptionPrice?: number;  // total due for the current subscription period ($)
  subscriptionPaid?: number;   // paid so far for the current period ($)
  lastPaymentAt?: string;
  status?: 'active' | 'inactive';
  terminatedAt?: string;
  reactivatedAt?: string;
  medical?: string;
  role?: 'admin' | 'user' | 'coach';
  email?: string;
  createdAt?: string;
  fcmToken?: string;
  lastSync?: string;
}

export interface Coach {
  id: string;
  uid: string;
  name: string;
  email: string;
  image: string;
  role: 'coach';
  createdAt: string;
}

export interface CoachCalendar {
  id: string;
  coachId: string;
  month: string; // e.g., "2026-04"
  doneDays: string[]; // array of ISO date strings (YYYY-MM-DD)
  updatedAt: string;
}

export interface Announcement {
  id: string;
  date: string;
  title: string;
  content: string;
  category: string;
}

export interface Exercise {
  name: string;
  sets: string;
  reps?: string;
  notes?: string;
  weightLifted?: number;
  videoUrl?: string;
}

export interface WorkoutCalendar {
  id: string;
  userId: string;
  schedule: {
    [key: string]: Exercise[]; // key is day name or date
  };
  updatedAt: string;
}

export interface UserLog {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  exercises: {
    name: string;
    sets: {
      setNumber: number;
      weight: number;
      reps?: number;
    }[];
    videoUrl?: string;
  }[];
  updatedAt: string;
}

export interface Transaction {
  id: string;
  date: string;
  productId: string;
  productName: string;
  amount: number;
  type: 'sale' | 'restock';
  quantity: number;
  category?: string;
  memberId?: string;        // who bought it / whose membership it is
  memberName?: string;
  paid?: boolean;           // false = sold on credit, not paid yet (missing = paid)
  paidAt?: string;          // when the payment was received
  paymentMethod?: 'cash' | 'card';
}

export interface CashMovement {
  id: string;
  direction: 'in' | 'out';
  amount: number;
  currency: 'USD' | 'LBP';
  category: string;
  note?: string;
  memberId?: string;
  memberName?: string;
  transactionId?: string;
  date: string;
  createdBy: string;
  voided?: boolean;
  voidedAt?: string;
  voidReason?: string;
}
