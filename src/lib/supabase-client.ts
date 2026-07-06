// Reexportamos el ÚNICO cliente de navegador (definido en supabase-browser.ts).
// Antes existían dos instancias distintas de createBrowserClient en la app, lo que
// creaba dos GoTrueClient compitiendo por el lock de auth (navigator.locks) y
// colgaba getSession()/getUser() de forma intermitente (sobre todo en móvil/cold
// start). Un único cliente evita esa contención.
export { supabaseBrowser as supabaseClient } from './supabase-browser'
