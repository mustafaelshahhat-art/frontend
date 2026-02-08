import { Injectable, signal, computed } from '@angular/core';
import { Payment } from '../../core/models/payment.model';

export interface PaymentState {
  payments: Payment[];
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentStore {
  private state = signal<PaymentState>({
    payments: [],
    isLoading: false,
    error: null
  });

  // Selectors
  payments = computed(() => this.state().payments);
  isLoading = computed(() => this.state().isLoading);
  error = computed(() => this.state().error);

  // Computed selectors for specific views
  pendingPayments = computed(() => 
    this.payments().filter(p => p.status === 'pending')
  );
  
  approvedPayments = computed(() => 
    this.payments().filter(p => p.status === 'approved')
  );
  
  rejectedPayments = computed(() => 
    this.payments().filter(p => p.status === 'rejected')
  );

  // Mutations
  setLoading(loading: boolean): void {
    this.state.update(state => ({ ...state, isLoading: loading }));
  }

  setError(error: string | null): void {
    this.state.update(state => ({ ...state, error }));
  }

  setPayments(payments: Payment[]): void {
    this.state.update(state => ({ ...state, payments, isLoading: false, error: null }));
  }

  addPayment(payment: Payment): void {
    this.state.update(state => ({
      ...state,
      payments: [...state.payments, payment]
    }));
  }

  updatePayment(updatedPayment: Payment): void {
    this.state.update(state => ({
      ...state,
      payments: state.payments.map(payment => 
        payment.id === updatedPayment.id ? updatedPayment : payment
      )
    }));
  }

  removePayment(paymentId: string): void {
    this.state.update(state => ({
      ...state,
      payments: state.payments.filter(payment => payment.id !== paymentId)
    }));
  }

  // Utility methods
  getPaymentById(id: string): Payment | undefined {
    return this.payments().find(payment => payment.id === id);
  }

  getPaymentsByTeam(teamId: string): Payment[] {
    return this.payments().filter(payment => payment.teamId === teamId);
  }

  getPaymentsByTournament(tournamentId: string): Payment[] {
    return this.payments().filter(payment => payment.tournamentId === tournamentId);
  }
}