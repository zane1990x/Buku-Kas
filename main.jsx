import React, {useEffect,useState,useRef} from 'react'
import {createRoot} from 'react-dom/client'
import {ArrowDownLeft,ArrowUpRight,ArrowRight,BookOpen,BriefcaseBusiness,CalendarDays,Camera,Check,ChevronDown,ClipboardList,Download,FileSpreadsheet,FileText,ImagePlus,LayoutGrid,LogOut,MapPin,Pencil,Plus,Receipt,Trash2,Wallet,X} from 'lucide-react'
import {boot,mode} from './store.js'
import {day,today,rupiah,paid,remaining,paymentStatus,summarize,labels,imageFile,limit} from './model.js'
import './style.css'

const views = [
  ['overview','Ringkasan',LayoutGrid],['cash','Buku kas',Wallet],['vendors','Vendor',Receipt],
  ['timeline','Timeline',CalendarDays],['reports','Laporan',FileText],
]
const projectStatuses = ['Persiapan','Berjalan','Selesai']
const taskStatuses = ['Terjadwal','Berjalan','Selesai']
const id = () => crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint32Array(4)),n => n.toString(16)).join('-')
const friendly = e => ({
  'auth/invalid-credential':'Email atau kata sandi tidak cocok.',
  'auth/invalid-api-key':'Kunci API Firebase tidak valid.',
  'auth/network-request-failed':'Koneksi ke Firebase gagal.',
  'permission-denied':'Akses Firestore ditolak. Periksa akun dan aturan akses.',
  'unavailable':'Firestore sedang tidak dapat dijangkau. Periksa koneksi internet.',
  'failed-precondition':'Firestore belum siap. Periksa konfigurasi dan koneksi.',
  'resource-exhausted':'Kuota Firebase tercapai.',
}[e?.code] || (e?.name === 'QuotaExceededError' ? 'Penyimpanan demo penuh. Gunakan lebih sedikit foto.' : e?.message) || 'Terjadi kesalahan.')

const btn = (text,Icon,onClick,variant='secondary') => <button className={'button '+variant} type="button" onClick={onClick}><Icon size={17}/>{text}</button>
function Brand(){return <div className="brand"><span className="brand-mark"><BookOpen size={20}/></span><div><strong>Buku Event</strong><small>PEMBUKUAN PROYEK</small></div></div>}
function Badge({text}) {return <span className={'badge '+(['Berjalan','Lunas','Selesai','Pemasukan'].includes(text)?'green':text === 'Lewat jatuh tempo'?'red':['Belum dibayar','Sebagian dibayar','Persiapan'].includes(text)?'amber':'neutral')}>{text}</span>}
function Empty({children}) {return <div className="empty"><ClipboardList size={23}/><p>{children}</p></div>}
function Modal({title,close,children}) {
  const ref = useRef(null)
  useEffect(()=>{ const dialog = ref.current; dialog.showModal(); return () => dialog.close() },[])
  return <dialog ref={ref} onCancel={e=>{e.preventDefault();close()}}><div className="modal-head"><h2>{title}</h2><button className="icon-button" type="button" onClick={close} aria-label="Tutup"><X size={20}/></button></div>{children}</dialog>
}
function Field({label,name,type='text',value='',required=true,maxLength=120,min,max,options,wide=false}) {
  const common = {name,required,defaultValue:value}
  return <label className={wide?'wide':''}>{label}{options?<select {...common}>{options.map(o=><option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>:type==='textarea'?<textarea {...common} maxLength={maxLength} rows={2}/>:<input {...common} type={type} maxLength={maxLength} min={min} max={max} step={type==='number'?1:undefined} inputMode={type==='number'?'numeric':undefined}/>}</label>
}
function ImageField({logo,hasPhoto,fileRef,removed,setRemoved}) {
  const [file,setFile] = useState('')
  const pick = e => {const selected=e.target.files[0]; if(selected){fileRef.current=selected;setRemoved(false);setFile(selected.name)} e.target.value=''}
  return <div className="image-field wide"><strong>{logo?'Logo proyek':'Foto nota'} <small>Opsional</small></strong><div className="upload-row">
    {!logo&&<label className="button secondary file-button"><Camera size={16}/>Ambil foto<input aria-label="Ambil foto nota" type="file" accept="image/*" capture="environment" onChange={pick}/></label>}
    <label className="button secondary file-button"><ImagePlus size={16}/>Pilih gambar<input aria-label={logo?'Pilih logo proyek':'Pilih foto nota'} type="file" accept="image/*" onChange={pick}/></label>
    {(file || (hasPhoto && !removed))&&<button className="link-button danger" type="button" onClick={()=>{fileRef.current=null;setRemoved(true);setFile('')}}>Hapus lampiran</button>}
  </div><small>{file || (hasPhoto&&!removed?'Gambar tersimpan':'JPG, PNG, atau WebP · maks. 25 MB')}</small></div>
}
function RecordForm({dialog,project,store,close,finish,lock}) {
  const {kind,row,initial} = dialog
  const isProject=kind==='project', isTask=kind==='task', isInvoice=kind==='invoice', isPay=kind==='pay', isCash=kind==='cash'
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[removed,setRemoved]=useState(false)
  const fileRef=useRef(null)
  const inFlight=useRef(false)
  async function submit(e) {
    e.preventDefault()
    if(inFlight.current) return
    const data=Object.fromEntries(new FormData(e.currentTarget))
    Object.keys(data).forEach(key=>{data[key]=data[key].trim()})
    if ((!isPay && !(isProject?data.name:data.title)) || (isInvoice && !data.party)) return setError('Lengkapi kolom wajib.')
    if(isProject && data.start && data.end && data.start>data.end) return setError('Tanggal selesai harus setelah atau sama dengan tanggal mulai.')
    const itemId=row?.id || id()
    const created=row?.created || Date.now()
    inFlight.current=true
    setBusy(true);lock.current=true;setError('')
    try {
      const photo = fileRef.current ? await imageFile(fileRef.current,isProject) : removed ? '' : undefined
      if(isProject) await store.saveProject({...data,id:itemId,budget:Number(data.budget),logo:photo ?? row?.logo ?? '',created})
      else if(isPay) await store.apply(project.id,itemId,{type:'pay',payment:{id:id(),date:data.date,amount:Number(data.amount),note:data.note,created:Date.now()}})
      else {
        const value={...data,id:itemId,kind:isCash?data.kind:kind,created}
        if(!isTask) value.amount=Number(data.amount)
        if(isCash) value.hasPhoto=photo===undefined?Boolean(row?.hasPhoto):Boolean(photo)
        await store.apply(project.id,itemId,{type:'save',value,photo})
      }
      lock.current=false
      finish(isProject ? 'Proyek disimpan.' : isPay ? 'Pembayaran vendor tercatat.' : 'Catatan disimpan.',isProject?itemId:undefined)
    } catch (err) {inFlight.current=false;lock.current=false;setError(friendly(err));setBusy(false)}
  }
  const title=isProject?(row?'Edit proyek':'Proyek baru'):isPay?'Catat pembayaran vendor':(row?'Edit ':'Tambah ')+(isTask?'agenda':isInvoice?'tagihan vendor':'transaksi')
  return <Modal title={title} close={close}><form onSubmit={submit}><div className="form-grid">
    {isProject ? <>
      <Field label="Nama proyek" name="name" value={row?.name} maxLength={90} wide/>
      <Field label="Klien" name="client" value={row?.client} required={false}/>
      <Field label="Lokasi" name="location" value={row?.location} required={false}/>
      <Field label="Mulai" name="start" type="date" value={row?.start || today()}/>
      <Field label="Selesai" name="end" type="date" value={row?.end || today()}/>
      <Field label="Anggaran (Rp)" name="budget" type="number" min={0} max={limit} value={row?.budget ?? 0}/>
      <Field label="Status proyek" name="status" value={row?.status || 'Persiapan'} options={projectStatuses.map(x=>[x,x])}/>
      <ImageField logo hasPhoto={row?.logo} {...{fileRef,removed,setRemoved}}/>
    </>:isPay ? <>
      <div className="form-callout wide"><strong>{row.party}</strong><span>{row.title} · Sisa {rupiah(remaining(row))}</span></div>
      <Field label="Tanggal bayar" name="date" type="date" value={today()}/>
      <Field label="Nominal pembayaran (Rp)" name="amount" type="number" min={1} max={remaining(row)} value={remaining(row)}/>
      <Field label="Catatan pembayaran" name="note" type="textarea" maxLength={300} required={false} wide/>
    </>:<>
      {isCash&&<Field label="Jenis transaksi" name="kind" value={row?.kind || initial || 'materials'} options={Object.entries(labels).filter(([k])=>k!=='payment')} wide/>}
      <Field label={isTask?'Nama agenda':isInvoice?'Uraian tagihan':'Uraian transaksi'} name="title" value={row?.title} wide/>
      <Field label={isInvoice?'Jatuh tempo':'Tanggal'} name="date" type="date" value={row?.date || today()}/>
      {isTask?<Field label="Status agenda" name="status" value={row?.status || 'Terjadwal'} options={taskStatuses.map(x=>[x,x])}/>:<Field label="Nominal (Rp)" name="amount" type="number" min={1} max={limit} value={row?.amount}/>}
      <Field label={isTask?'PIC':isInvoice?'Nama vendor':'Pihak / toko / klien'} name="party" value={row?.party} required={isInvoice} wide/>
      <Field label="Catatan" name="note" type="textarea" maxLength={300} value={row?.note} required={false} wide/>
      {isCash&&<ImageField hasPhoto={row?.hasPhoto} {...{fileRef,removed,setRemoved}}/>}
    </>}
  </div>{error&&<p className="error" role="alert">{error}</p>}<div className="modal-foot"><button className="button secondary" type="button" onClick={close} disabled={busy}>Batal</button><button className="button primary" disabled={busy}>{busy?'Menyimpan…':'Simpan'}</button></div></form></Modal>
}

function CashTable({rows,compact,open,remove,photo}) {
  if(!rows.length) return <Empty>Belum ada transaksi kas.</Empty>
  return <div className="table-wrap"><table><thead><tr><th>Uraian transaksi</th><th>Tanggal</th><th>Jenis</th><th className="right">Nominal</th>{!compact&&<th>Aksi</th>}</tr></thead><tbody>{rows.map(x=><tr key={x.id}>
    <td><div className="transaction"><span className={'tx-icon '+(x.kind==='income'?'in':'out')}>{x.kind==='income'?<ArrowDownLeft size={16}/>:x.kind==='materials'?<Receipt size={15}/>:<ArrowUpRight size={15}/>}</span><div><strong>{x.title}</strong><small>{x.party || '—'}</small></div></div></td>
    <td>{day(x.date)}</td><td><Badge text={labels[x.kind]}/></td><td className={'right amount '+(x.kind==='income'?'income':'')}>{x.kind==='income'?'+':'−'}{rupiah(x.amount)}</td>
    {!compact&&<td><div className="row-actions">{x.hasPhoto&&<button className="icon-button" aria-label={'Lihat nota '+x.title} onClick={()=>photo(x)}><Camera size={16}/></button>}
      {x.kind==='payment'?<button className="link-button" onClick={()=>open({kind:'history',row:{id:x.invoiceId}})}>Riwayat</button>:<><button className="icon-button" aria-label={'Edit '+x.title} onClick={()=>open({kind:'cash',row:x})}><Pencil size={15}/></button><button className="icon-button danger" aria-label={'Hapus '+x.title} onClick={()=>remove(x)}><Trash2 size={15}/></button></>}</div></td>}
  </tr>)}</tbody></table></div>
}
function VendorTable({rows,open,remove}) {
  if(!rows.length) return <Empty>Belum ada tagihan vendor.</Empty>
  return <div className="table-wrap"><table><thead><tr><th>Vendor</th><th>Jatuh tempo</th><th className="right">Tagihan</th><th className="right">Dibayar</th><th className="right">Sisa</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}>
    <td><strong>{x.party}</strong><small>{x.title}</small></td><td>{day(x.date)}</td><td className="right amount">{rupiah(x.amount)}</td><td className="right amount">{rupiah(paid(x))}</td><td className="right amount">{rupiah(remaining(x))}</td><td><Badge text={paymentStatus(x)}/></td>
    <td><div className="row-actions">{remaining(x)>0&&<button className="link-button" onClick={()=>open({kind:'pay',row:x})}>Bayar</button>}<button className="icon-button" aria-label={'Riwayat '+x.party} onClick={()=>open({kind:'history',row:x})}><ClipboardList size={16}/></button><button className="icon-button" aria-label={'Edit '+x.party} onClick={()=>open({kind:'invoice',row:x})}><Pencil size={15}/></button>{!paid(x)&&<button className="icon-button danger" aria-label={'Hapus '+x.party} onClick={()=>remove(x)}><Trash2 size={15}/></button>}</div></td>
  </tr>)}</tbody></table></div>
}
function Timeline({rows,compact,open,remove}) {
  if(!rows.length) return <Empty>Belum ada agenda proyek.</Empty>
  return <ol className="timeline">{rows.map(x=><li key={x.id}><span className={'dot '+(x.status==='Selesai'?'done':x.status==='Berjalan'?'active':'')}>{x.status==='Selesai'&&<Check size={10}/>}</span><div><small>{day(x.date)}</small><strong>{x.title}</strong>{!compact&&<small>{[x.party,x.note].filter(Boolean).join(' · ')}</small>}</div><Badge text={x.status}/>{!compact&&<div className="row-actions"><button className="icon-button" aria-label={'Edit '+x.title} onClick={()=>open({kind:'task',row:x})}><Pencil size={15}/></button><button className="icon-button danger" aria-label={'Hapus '+x.title} onClick={()=>remove(x)}><Trash2 size={15}/></button></div>}</li>)}</ol>
}
function Panel({title,subtitle,action,children}){return <section className="panel"><div className="panel-head"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>{children}</section>}
function Metrics({s}){return <div className="metrics">{[
  ['Kas masuk',s.income,ArrowDownLeft,'green','Pemasukan tercatat'],
  ['Kas keluar',s.expense,ArrowUpRight,'orange','Belanja dan pembayaran'],
  ['Saldo kas',s.balance,Wallet,'green','Kas masuk dikurangi kas keluar'],
  ['Sisa tagihan',s.outstanding,Receipt,'gold','Kewajiban vendor'],
].map(([title,value,Icon,color,note])=><div className="metric" key={title}><div><span>{title}</span><span className={'metric-icon '+color}><Icon size={18}/></span></div><strong>{rupiah(value)}</strong><small>{note}</small></div>)}</div>}
function Workspace({store,email,signOut}) {
  const [projects,setProjects]=useState(null),[selected,select]=useState(''),[loaded,setLoaded]=useState(null)
  const [view,setView]=useState('overview'),[filter,setFilter]=useState('all'),[dialog,open]=useState(null)
  const [notice,setNotice]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[cached,setCached]=useState(false)
  const lock=useRef(false)
  useEffect(()=>store.watchProjects(rows=>setProjects(rows.sort((a,b)=>b.created-a.created)),e=>setError(friendly(e))),[store])
  const project=projects?.find(p=>p.id===selected) || projects?.[0]
  const pid=project?.id
  useEffect(()=>{
    if(!pid) return
    return store.watchItems(pid,(rows,fromCache)=>{setLoaded({pid,rows});setCached(Boolean(fromCache))},e=>setError(friendly(e)))
  },[pid,store])
  useEffect(()=>{if(!notice) return;const timer=setTimeout(()=>setNotice(''),4200);return ()=>clearTimeout(timer)},[notice])
  const ready=Boolean(pid && loaded?.pid===pid)
  const s=summarize(ready?loaded.rows:[])
  const close=()=>{if(!lock.current&&!busy)open(null)}
  function finish(message,newId) {
    if(newId){select(newId);setView('overview')}
    open(null);setNotice(message)
  }
  function switchView(next){setView(next);setFilter('all')}
  const remove=row=>open({kind:'remove',row})
  const showPhoto=row=>open({kind:'photo',row})
  async function confirmDelete(){
    if(lock.current)return
    lock.current=true;setBusy(true);setError('')
    try{
      const change=dialog.payment ? {type:'voidPayment',paymentId:dialog.payment.id} : {type:'remove'}
      await store.apply(pid,dialog.row.id,change)
      finish(dialog.payment?'Pembayaran dibatalkan. Saldo kas diperbarui.':'Catatan dihapus.')
    }catch(e){setError(friendly(e));open(null)}finally{lock.current=false;setBusy(false)}
  }
  async function report(type){
    if(!ready||busy)return
    setBusy(true);setError('')
    try {
      const {exportPDF,exportExcel}=await import('./reports.js')
      await (type==='pdf'?exportPDF:exportExcel)(project,s)
      setNotice('Laporan siap diunduh.')
    }catch(e){setError(friendly(e))}finally{setBusy(false)}
  }
  const titles={cash:['Buku kas','Pemasukan, belanja bahan, dan pembayaran yang sudah terjadi.','Tambah transaksi'],vendors:['Tagihan vendor','Pantau DP, jatuh tempo, dan pelunasan setiap tagihan.','Tambah tagihan'],timeline:['Timeline proyek','Susun agenda kerja, tanggal, dan penanggung jawab.','Tambah agenda'],reports:['Laporan proyek','Rekap seluruh transaksi, tagihan vendor, dan agenda proyek.']}
  const history=s.invoices.find(x=>x.id===dialog?.row?.id)
  const usePct=project?.budget?Math.round(s.expense/project.budget*100):0
  return <div className="shell">
    <aside className="sidebar">
      <Brand/>
      <div className="sidebar-body"><span className="side-label">PROYEK AKTIF</span><div className="project-picker"><BriefcaseBusiness size={18}/><select aria-label="Pilih proyek" value={pid||''} onChange={e=>{select(e.target.value);switchView('overview');setError('')}}>
        {!projects?.length&&<option value="">Belum ada proyek</option>}
        {projects?.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select><ChevronDown size={14} className="chevron"/></div>
      <button className="new-project" onClick={()=>open({kind:'project'})}><Plus size={17}/> Proyek baru</button>
      <span className="side-label menu-label">RUANG KERJA</span><nav aria-label="Ruang kerja">{views.map(([key,label,Icon])=><button key={key} className={view===key?'selected':''} aria-current={view===key?'page':undefined} onClick={()=>switchView(key)}><Icon size={18}/><span>{label}</span></button>)}</nav></div>
      <div className="sidebar-foot">{email?<><span title={email}>{email}</span><button type="button" onClick={()=>signOut().catch(e=>setError(friendly(e)))}><LogOut size={16}/> Keluar</button></>:<><span className="demo-dot"/> Mode demo <small>Data contoh · browser ini</small></>}</div>
    </aside>
    <main>
      <header className="topbar"><div><span>Ruang kerja</span><span className="slash">/</span><strong>{views.find(x=>x[0]===view)?.[1]}</strong></div>{!email&&<span className="demo-pill"><i/> Demo interaktif</span>}</header>
      <div className="content">
      {error&&<div className="banner error" role="alert">{error}<button className="icon-button" aria-label="Tutup pesan" onClick={()=>setError('')}><X size={15}/></button></div>}
      {cached&&ready&&<p className="banner">Menampilkan data cache. Hubungkan ke internet untuk menyinkronkan perubahan.</p>}
      {!projects?<Empty>{error?'Data proyek belum bisa ditampilkan.':'Memuat proyek…'}</Empty>:!project?<Panel title="Mulai proyek pertama" subtitle="Tambahkan proyek untuk mulai mencatat transaksi, vendor, dan agenda." action={btn('Proyek baru',Plus,()=>open({kind:'project'}),'primary')}><Empty>Belum ada proyek.</Empty></Panel>:<>
      <section className="hero"><div className="hero-main"><div className="project-logo">{project.logo?<img src={project.logo} alt="Logo proyek"/>:<BriefcaseBusiness size={30}/>}</div><div><div className="hero-eyebrow">PEMBUKUAN PROYEK <Badge text={project.status}/></div><h1>{project.name}</h1><div className="hero-meta"><span><CalendarDays size={15}/>{day(project.start)} – {day(project.end)}</span>{project.location&&<span><MapPin size={15}/>{project.location}</span>}</div></div></div>{btn('Edit proyek',Pencil,()=>open({kind:'project',row:project}),'hero-button')}</section>
      {!ready?<Empty>{error?'Catatan proyek belum bisa ditampilkan.':'Memuat catatan proyek…'}</Empty>:view==='overview'?<>
        <div className="section-title"><div><h2>Ringkasan keuangan</h2><p>Posisi kas dan kewajiban proyek saat ini.</p></div>{btn('Tambah transaksi',Plus,()=>open({kind:'cash'}),'primary')}</div>
        <Metrics s={s}/>
        <div className="two-columns">
          <Panel title="Transaksi terbaru" subtitle="Aktivitas kas yang terakhir dicatat." action={<button className="link-button with-icon" onClick={()=>switchView('cash')}>Buku kas <ArrowRight size={15}/></button>}><CashTable rows={s.cash.slice(0,4)} compact/></Panel>
          <Panel title="Timeline proyek" subtitle={s.tasks.filter(x=>x.status==='Selesai').length+' dari '+s.tasks.length+' agenda selesai'} action={<button className="icon-button" aria-label="Buka timeline" onClick={()=>switchView('timeline')}><ArrowRight size={18}/></button>}><Timeline rows={s.tasks.slice(0,4)} compact/></Panel>
        </div>
        <div className="budget"><div><strong>Realisasi anggaran</strong><small>{rupiah(s.expense)} dari {rupiah(project.budget)}</small></div><div className="budget-track"><progress value={Math.min(usePct,100)} max="100" aria-label="Realisasi anggaran"/><strong>{project.budget?usePct+'%':'—'}</strong></div></div>
      </>:<>
        <div className="section-title"><div><h2>{titles[view][0]}</h2><p>{titles[view][1]}</p></div>{titles[view][2]&&btn(titles[view][2],Plus,()=>open({kind:{cash:'cash',vendors:'invoice',timeline:'task'}[view]}),'primary')}</div>
        {view==='cash'&&<Panel title="Daftar transaksi" action={<select className="filter" value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filter jenis transaksi"><option value="all">Semua transaksi</option>{Object.entries(labels).map(([k,label])=><option key={k} value={k}>{label}</option>)}</select>}><CashTable rows={s.cash.filter(x=>filter==='all'||x.kind===filter)} {...{open,remove,photo:showPhoto}}/></Panel>}
        {view==='vendors'&&<Panel title="Daftar tagihan" subtitle={'Sisa tagihan '+rupiah(s.outstanding)}><VendorTable rows={s.invoices} {...{open,remove}}/></Panel>}
        {view==='timeline'&&<Panel title="Agenda proyek" subtitle={s.tasks.filter(x=>x.status==='Selesai').length+' dari '+s.tasks.length+' agenda selesai'}><Timeline rows={s.tasks} {...{open,remove}}/></Panel>}
        {view==='reports'&&<><Metrics s={s}/><div className="report-grid">{[['pdf','Laporan PDF','Ringkasan dan tabel siap dibagikan atau dicetak.',FileText],['xlsx','Workbook Excel','Empat lembar kerja dengan nominal yang bisa dihitung.',FileSpreadsheet]].map(([type,title,desc,Icon])=><Panel key={type} title={title} subtitle={desc} action={<span className="metric-icon green"><Icon size={21}/></span>}><div className="report-action"><button className="button primary" disabled={busy} onClick={()=>report(type)}><Download size={17}/>{busy?'Menyiapkan laporan…':'Unduh '+(type==='pdf'?'PDF':'Excel')}</button></div></Panel>)}</div></>}
      </>}
      </>}
      <footer>Buku Event <span>·</span> Pembukuan proyek event organizer</footer>
      </div>
    </main>
    {notice&&<div className="toast" role="status"><Check size={17}/>{notice}</div>}
    {dialog?.kind==='photo'&&<PhotoModal {...{close,store,pid,row:dialog.row}}/>}
    {dialog?.kind==='history'&&<Modal title="Riwayat pembayaran" close={close}>{history?<div className="dialog-content"><p><strong>{history.party}</strong> · {history.title}</p><p>Sisa tagihan <strong>{rupiah(remaining(history))}</strong></p>{history.payments.length?<ul className="payment-list">{[...history.payments].reverse().map(p=><li key={p.id}><div><strong>{rupiah(p.amount)}</strong><small>{day(p.date)}{p.note?' · '+p.note:''}</small></div><button className="link-button danger" onClick={()=>open({kind:'remove',row:history,payment:p})}>Batalkan</button></li>)}</ul>:<Empty>Belum ada pembayaran.</Empty>}</div>:<div className="dialog-content">Tagihan sudah dihapus.</div>}</Modal>}
    {dialog?.kind==='remove'&&<Modal title={dialog.payment?'Batalkan pembayaran?':'Hapus catatan?'} close={close}><div className="dialog-content"><p>{dialog.payment?'Pembayaran '+rupiah(dialog.payment.amount)+' akan dikeluarkan dari buku kas dan ditambahkan kembali ke sisa tagihan.':dialog.row.title+' akan dihapus beserta foto nota jika ada.'}</p></div><div className="modal-foot"><button className="button secondary" onClick={close} disabled={busy}>Kembali</button><button className="button destructive" disabled={busy} onClick={confirmDelete}>{busy?'Memproses…':dialog.payment?'Batalkan pembayaran':'Hapus catatan'}</button></div></Modal>}
    {dialog&&['project','cash','task','invoice','pay'].includes(dialog.kind)&&<RecordForm {...{dialog,project,store,close,finish,lock}}/>}
  </div>
}
function PhotoModal({close,store,pid,row}) {
  const [photo,setPhoto]=useState(null),[error,setError]=useState('')
  useEffect(()=>{let active=true;store.photo(pid,row.id).then(x=>{if(active)setPhoto(x)},e=>{if(active)setError(friendly(e))});return ()=>{active=false}},[store,pid,row.id])
  return <Modal title={'Nota · '+row.title} close={close}><div className="dialog-content">{error?<p className="error">{error}</p>:photo?<img className="receipt-photo" src={photo} alt={'Foto nota '+row.title}/>:photo===null?'Memuat foto…':'Foto belum tersedia.'}</div></Modal>
}
function Login({auth}){
  const [error,setError]=useState(''),[busy,setBusy]=useState(false)
  async function submit(e){
    e.preventDefault();setError('');setBusy(true)
    const data=new FormData(e.currentTarget)
    try{await auth.signIn(data.get('email').trim(),data.get('password'))}catch(e){setError(friendly(e));setBusy(false)}
  }
  return <div className="login"><div className="login-card"><Brand/><h1>Masuk ke ruang kerja</h1><p>Gunakan akun yang sudah dibuat oleh pengelola aplikasi.</p><form onSubmit={submit}><label>Email<input name="email" type="email" autoComplete="username" required/></label><label>Kata sandi<input name="password" type="password" autoComplete="current-password" required/></label>{error&&<p className="error" role="alert">{error}</p>}<button className="button primary" disabled={busy}>{busy?'Sedang masuk…':'Masuk'}</button></form></div></div>
}
function App(){
  const [service,setService]=useState(null),[session,setSession]=useState(undefined),[error,setError]=useState('')
  useEffect(()=>{let active=true;boot().then(s=>{if(active)setService(s)},e=>{if(active)setError(friendly(e))});return ()=>{active=false}},[])
  useEffect(()=>service?.watchAuth?.(user=>setSession(user?{email:user.email,uid:user.uid,store:service.account(user.uid)}:null)),[service])
  if(error)return <div className="login"><div className="login-card"><Brand/><h1>Konfigurasi aplikasi</h1><p className="error" role="alert">{error}</p></div></div>
  if(!service || (mode==='firebase'&&session===undefined))return <div className="login"><div className="login-card"><Brand/><p>Menyiapkan ruang kerja…</p></div></div>
  if(service.demo)return <Workspace store={service.demo}/>
  return session?<Workspace key={session.uid} store={session.store} email={session.email} signOut={service.signOut}/>:<Login auth={service}/>
}
createRoot(document.getElementById('root')).render(<App/>)
