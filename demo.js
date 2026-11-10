const projects = [
  {id:'festival',name:'Festival Kreatif Pontianak',client:'Ruang Karya Collective',location:'Pontianak, Kalimantan Barat',start:'2026-11-01',end:'2026-11-29',budget:75000000,status:'Berjalan',logo:'',created:2},
  {id:'gala',name:'Malam Apresiasi Nusantara',client:'Nusantara Studio',location:'Pontianak',start:'2026-12-01',end:'2026-12-18',budget:42000000,status:'Persiapan',logo:'',created:1},
]
const festival = [
  {id:'a',kind:'income',title:'DP klien 50%',party:'Ruang Karya Collective',date:'2026-11-04',amount:37500000},
  {id:'b',kind:'materials',title:'Bahan dekorasi booth',party:'Toko Sinar Karya',date:'2026-11-08',amount:1850000},
  {id:'c',kind:'expense',title:'Konsumsi rapat produksi',party:'Tim Produksi',date:'2026-11-07',amount:650000},
  {id:'d',kind:'invoice',title:'Sound system dan lighting',party:'Aurora Production',date:'2026-11-22',amount:18000000,paid:6000000,payments:[{id:'dp1',date:'2026-11-09',amount:6000000,note:'DP produksi'}]},
  {id:'e',kind:'invoice',title:'Sewa panggung utama',party:'Panggung Karya',date:'2026-11-25',amount:10000000,paid:0,payments:[]},
  {id:'f',kind:'task',title:'Kickoff dan briefing tim',party:'Koordinator Event',date:'2026-11-05',status:'Selesai'},
  {id:'g',kind:'task',title:'Finalisasi layout venue',party:'Tim Produksi',date:'2026-11-15',status:'Berjalan'},
  {id:'h',kind:'task',title:'Technical meeting vendor',party:'Koordinator Lapangan',date:'2026-11-21',status:'Terjadwal'},
  {id:'i',kind:'task',title:'Hari pelaksanaan festival',party:'Seluruh tim',date:'2026-11-28',status:'Terjadwal'},
]
export const demoData = {projects, items:{festival,gala:[]}, media:{}}
