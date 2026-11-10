import { day, labels, paid, remaining, paymentStatus, rupiah } from './model.js'

const fileName = (p,ext) => 'Buku_Event_' + p.name.replace(/[^\p{L}\p{N}]+/gu,'_').slice(0,80) + '.' + ext
const sections = (s) => [
  ['Buku kas',['Tanggal','Uraian','Pihak','Jenis','Masuk','Keluar','Nota','Catatan'],s.cash.map(x => [
    x.date,x.title,x.party || '',labels[x.kind],x.kind === 'income' ? x.amount : 0,x.kind === 'income' ? 0 : x.amount,x.hasPhoto ? 'Ada' : '—',x.note || '',
  ])],
  ['Tagihan vendor',['Jatuh tempo','Vendor','Pekerjaan','Nilai tagihan','Dibayar','Sisa','Status','Catatan'],s.invoices.map(x => [
    x.date,x.party,x.title,x.amount,paid(x),remaining(x),paymentStatus(x),x.note || '',
  ])],
  ['Timeline',['Tanggal','Agenda','PIC','Status','Catatan'],s.tasks.map(x => [x.date,x.title,x.party || '',x.status,x.note || ''])],
]
const summary = (p,s) => [
  ['Nama proyek',p.name],['Klien',p.client || '—'],['Lokasi',p.location || '—'],
  ['Periode',day(p.start)+' – '+day(p.end)],['Anggaran',p.budget],['Kas masuk',s.income],['Kas keluar',s.expense],['Saldo kas',s.balance],['Sisa tagihan',s.outstanding],
]

export async function exportExcel(project,s) {
  const { default: ExcelJS } = await import('exceljs/dist/exceljs.min.js')
  const workbook = new ExcelJS.Workbook()
  function sheet(name,head,rows,widths) {
    const ws = workbook.addWorksheet(name,{views:[{state:'frozen',ySplit:1}]})
    ws.columns = widths.map(width => ({width}))
    ws.addRow(head)
    ws.addRows(rows)
    ws.getRow(1).eachCell(cell => {
      cell.fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FF20463A'}}
      cell.font = {bold:true,color:{argb:'FFFFFFFF'}}
    })
    ws.eachRow((row,index) => {
      if (index === 1) return
      row.eachCell(cell => {
        cell.alignment = {vertical:'top',wrapText:true}
        if (index%2 === 0) cell.fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FFF0F5F1'}}
        if (typeof cell.value === 'number') cell.numFmt = '#,##0;[Red]-#,##0'
      })
    })
    return ws
  }
  const overview = sheet('Ringkasan',['Keterangan','Nilai'],summary(project,s),[24,47])
  if (project.logo) {
    const image = workbook.addImage({base64:project.logo,extension:'jpeg'})
    overview.addImage(image,{tl:{col:2.1,row:1},ext:{width:100,height:65}})
  }
  const widths = [[15,35,28,23,17,17,12,44],[15,28,35,18,17,17,24,44],[15,36,24,20,44]]
  sections(s).forEach(([name,head,rows],i) => {
    const ws = sheet(name,head,rows,widths[i])
    ws.autoFilter = {from:{row:1,column:1},to:{row:Math.max(1,rows.length+1),column:head.length}}
  })
  const blob = new Blob([await workbook.xlsx.writeBuffer()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName(project,'xlsx')
  a.click()
  setTimeout(() => URL.revokeObjectURL(url),10000)
}

export async function exportPDF(project,s) {
  const [{ jsPDF },{ autoTable }] = await Promise.all([import('jspdf'),import('jspdf-autotable')])
  const pdf = new jsPDF({orientation:'landscape',unit:'mm',format:'a4'})
  const clean = value => typeof value === 'number' ? rupiah(value).replace('−','-') : String(value).replaceAll('—','-')
  pdf.setFillColor(23,55,45)
  pdf.rect(0,0,297,42,'F')
  pdf.setTextColor(255,255,255)
  pdf.setFontSize(10)
  pdf.text('BUKU EVENT  /  LAPORAN PROYEK',13,13)
  pdf.setFontSize(21)
  pdf.text(project.name,13,26,{maxWidth:220})
  if (project.logo) {
    const im = pdf.getImageProperties(project.logo)
    const scale = Math.min(33/im.width,29/im.height)
    pdf.addImage(project.logo,'JPEG',250,6,im.width*scale,im.height*scale)
  }
  const settings = {margin:{left:13,right:13,top:13,bottom:14},theme:'striped',styles:{fontSize:9,overflow:'linebreak',cellPadding:2.3},headStyles:{fillColor:[31,70,57]},rowPageBreak:'avoid'}
  const details = summary(project,s)
  autoTable(pdf,{...settings,startY:48,head:[['Keterangan','Nilai','Keterangan','Nilai']],body:details.slice(0,5).map((row,i) => [...row,...(details[i+5] || ['', ''])].map(clean))})
  for (const [name,head,rows] of sections(s)) {
    let y = pdf.lastAutoTable.finalY+12
    if (y > 172) {pdf.addPage();y=18}
    pdf.setTextColor(25,55,45)
    pdf.setFontSize(13)
    pdf.text(name,13,y)
    autoTable(pdf,{...settings,startY:y+4,head:[head],body:rows.length ? rows.map(row => row.map(clean)) : [[{content:'Belum ada catatan.',colSpan:head.length}]]})
  }
  for(let n=1;n<=pdf.getNumberOfPages();n++) {
    pdf.setPage(n)
    pdf.setFontSize(8)
    pdf.setTextColor(110,121,117)
    pdf.text('Buku Event  /  Rekap seluruh catatan proyek',13,201)
    pdf.text(`${n} / ${pdf.getNumberOfPages()}`,284,201,{align:'right'})
  }
  pdf.save(fileName(project,'pdf'))
}
