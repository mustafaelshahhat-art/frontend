export interface Payment {
  id: string;
  teamId: string;
  tournamentId: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  paymentMethod: string;
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}