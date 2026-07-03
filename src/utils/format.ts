export function formatCurrency(amount: number, censor: boolean = false) {
  if (censor) {
    return 'Rp ***.***'
  }
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}
