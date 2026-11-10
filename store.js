import { demoData } from './demo.js'
import { changeItem } from './model.js'

const env = import.meta.env
const config = {
  apiKey:env.VITE_FIREBASE_API_KEY,
  authDomain:env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:env.VITE_FIREBASE_PROJECT_ID,
  appId:env.VITE_FIREBASE_APP_ID,
}
const provided = Object.values(config).filter(Boolean).length
export const mode = env.MODE === 'demo' || !provided ? 'demo' : provided === 4 ? 'firebase' : 'invalid'
const demoKey = 'buku-event-demo-v1'
function demoStore() {
  const read = () => JSON.parse(localStorage.getItem(demoKey) || 'null') || structuredClone(demoData)
  const write = data => localStorage.setItem(demoKey,JSON.stringify(data))
  const watch = (select, notify, error) => {
    const refresh = () => { try { notify(select(read())) } catch (e) { error(e) } }
    refresh()
    addEventListener('storage',refresh)
    return () => removeEventListener('storage',refresh)
  }
  return {
    watchProjects:(notify,error) => watch(data => data.projects,notify,error),
    watchItems:(id,notify,error) => watch(data => data.items[id] || [],notify,error),
    saveProject:async (project) => {
      const data = read()
      data.projects = [...data.projects.filter(x => x.id !== project.id),project]
      write(data)
      dispatchEvent(new Event('storage'))
    },
    apply:async (pid,id,change) => {
      const data = read()
      const items = data.items[pid] || []
      const next = changeItem(items.find(x => x.id === id),change)
      data.items[pid] = items.filter(x => x.id !== id)
      if (next) data.items[pid].push(next)
      if (!next || change.photo === '') delete data.media[id]
      else if (change.photo) data.media[id] = change.photo
      write(data)
      dispatchEvent(new Event('storage'))
    },
    photo:async (_pid,id) => read().media[id] || '',
  }
}
export async function boot() {
  if (mode === 'demo') return {demo:demoStore()}
  if (mode === 'invalid') throw Error('Konfigurasi Firebase belum lengkap. Periksa empat variabel VITE_FIREBASE.')
  const [{initializeApp},a,f] = await Promise.all([import('firebase/app'),import('firebase/auth'),import('firebase/firestore')])
  const app = initializeApp(config)
  const auth = a.getAuth(app)
  const db = f.getFirestore(app)
  function account(uid) {
    const projects = f.collection(db,'users',uid,'projects')
    const project = pid => f.doc(projects,pid)
    const collection = (pid,key) => f.collection(project(pid),key)
    const item = (pid,id) => f.doc(collection(pid,'items'),id)
    const media = (pid,id) => f.doc(collection(pid,'media'),id)
    const watch = (ref,notify,error) => f.onSnapshot(ref,{includeMetadataChanges:true},
      snapshot => notify(snapshot.docs.map(d => ({...d.data(),id:d.id})), snapshot.metadata.fromCache),error)
    return {
      watchProjects:(notify,error) => watch(projects,notify,error),
      watchItems:(pid,notify,error) => watch(collection(pid,'items'),notify,error),
      saveProject:({id,...data}) => f.setDoc(project(id),data),
      apply:(pid,id,change) => f.runTransaction(db,async transaction => {
        const ref = item(pid,id)
        const snapshot = await transaction.get(ref)
        const next = changeItem(snapshot.exists() ? {...snapshot.data(),id} : null,change)
        if (next) {
          const {id: _id,...data} = next
          transaction.set(ref,data)
        } else transaction.delete(ref)
        if (!next || change.photo === '') transaction.delete(media(pid,id))
        else if (change.photo) transaction.set(media(pid,id),{image:change.photo})
      }),
      photo:async (pid,id) => (await f.getDoc(media(pid,id))).data()?.image || '',
    }
  }
  return {
    watchAuth:notify => a.onAuthStateChanged(auth,notify),
    signIn:(email,password) => a.signInWithEmailAndPassword(auth,email,password),
    signOut:() => a.signOut(auth),
    account,
  }
}
