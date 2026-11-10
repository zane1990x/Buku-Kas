export const limit = 999999999999
const currency = new Intl.NumberFormat('id-ID')
const dateLabel = new Intl.DateTimeFormat('id-ID', {day:'numeric', month:'short', year:'numeric', timeZone:'UTC'})
export const rupiah = (n) => `${n < 0 ? '−' : ''}Rp ${currency.format(Math.abs(n))}`
export const day = (date) => date ? dateLabel.format(new Date(date + 'T00:00:00Z')) : '—'
export const today = () => new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Jakarta'}).format(new Date())
export const labels = {income:'Pemasukan',materials:'Belanja bahan',expense:'Pengeluaran lain',payment:'Bayar vendor'}
export const paid = (invoice) => invoice.payments.reduce((total,p) => total+p.amount, 0)
export const remaining = (invoice) => invoice.amount - paid(invoice)
export function paymentStatus(invoice) {
  if (!remaining(invoice)) return 'Lunas'
  if (invoice.date < today()) return 'Lewat jatuh tempo'
  return paid(invoice) ? 'Sebagian dibayar' : 'Belum dibayar'
}
export function summarize(items) {
  const invoices = items.filter(x => x.kind === 'invoice').sort((a,b) => a.date.localeCompare(b.date))
  const tasks = items.filter(x => x.kind === 'task').sort((a,b) => a.date.localeCompare(b.date))
  const cash = items.filter(x => x.kind !== 'invoice' && x.kind !== 'task').concat(
    invoices.flatMap(i => i.payments.map(p => ({...p, kind:'payment', title:i.title, party:i.party, invoiceId:i.id})))
  ).sort((a,b) => b.date.localeCompare(a.date) || (b.created || 0) - (a.created || 0))
  const income = cash.reduce((sum,x) => sum + (x.kind === 'income' ? x.amount : 0),0)
  const expense = cash.reduce((sum,x) => sum + (x.kind !== 'income' ? x.amount : 0),0)
  const outstanding = invoices.reduce((sum,x) => sum+remaining(x),0)
  return {cash,invoices,tasks,income,expense,outstanding,balance:income-expense}
}

export function changeItem(current, change) {
  if (!current && change.type !== 'save') throw Error('Catatan sudah dihapus. Muat ulang data.')
  if (change.type === 'pay') {
    const prior = current.payments
    if (prior.some(x => x.id === change.payment.id)) return current
    if (current.kind !== 'invoice' || change.payment.amount <= 0 || change.payment.amount > remaining(current)) {
      throw Error('Nominal pembayaran melebihi sisa tagihan.')
    }
    if (prior.length >= 150) throw Error('Batas 150 pembayaran per tagihan tercapai.')
    const payments = [...prior, change.payment]
    return {...current, payments, paid:paid({payments})}
  }
  if (change.type === 'voidPayment') {
    const payments = current.payments.filter(x => x.id !== change.paymentId)
    return {...current,payments,paid:paid({payments})}
  }
  if (change.type === 'remove') {
    if (current.kind === 'invoice' && current.payments.length) throw Error('Batalkan riwayat pembayaran terlebih dahulu.')
    return null
  }
  const next = {...current, ...change.value}
  if (next.kind === 'invoice') {
    next.payments = current?.payments || []
    next.paid = paid(next)
    if (next.amount < next.paid) throw Error('Nilai tagihan harus setidaknya sebesar pembayaran yang sudah tercatat.')
  }
  return next
}

export function imageFile(file, logo = false) {
  if (file.size > 25*1024*1024) return Promise.reject(Error('Ukuran file maksimal 25 MB.'))
  const url = URL.createObjectURL(file)
  return new Promise((resolve,reject) => {
    const image = new Image()
    image.onerror = () => { URL.revokeObjectURL(url); reject(Error('Gambar tidak dapat dibaca. Gunakan JPG, PNG, atau WebP.')) }
    image.onload = () => {
      URL.revokeObjectURL(url)
      try {
        const canvas = document.createElement('canvas')
        const max = logo ? 600 : 1800
        const cap = logo ? 150000 : 480000
        const scale = Math.min(1,max/Math.max(image.width,image.height))
        canvas.width = Math.max(1,Math.round(image.width*scale))
        canvas.height = Math.max(1,Math.round(image.height*scale))
        for (const quality of [.86,.72,.58,.45,.32]) {
          const ctx = canvas.getContext('2d')
          ctx.fillStyle = '#fff'
          ctx.fillRect(0,0,canvas.width,canvas.height)
          ctx.drawImage(image,0,0,canvas.width,canvas.height)
          const data = canvas.toDataURL('image/jpeg',quality)
          if (data.length <= cap) return resolve(data)
          canvas.width = Math.max(1,Math.round(canvas.width*.86))
          canvas.height = Math.max(1,Math.round(canvas.height*.86))
        }
        reject(Error('Foto terlalu besar. Coba ambil ulang dengan area yang lebih kecil.'))
      } catch (error) { reject(error) }
    }
    image.src = url
  })
}
