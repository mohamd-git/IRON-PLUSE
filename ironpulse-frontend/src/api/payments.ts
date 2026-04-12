import api from './client'
import type { PaymentInitiateRequest, PaymentInitiateResponse, PaymentRecord, PaymentVerify } from '../types/payment'

export const paymentsApi = {
  initiate: (data: PaymentInitiateRequest) =>
    api.post<PaymentInitiateResponse>('/payments/initiate', data),
  verify: (id: string) => api.post<PaymentVerify>(`/payments/verify/${id}`),
  getHistory: () => api.get<PaymentRecord[]>('/payments/history'),
}
