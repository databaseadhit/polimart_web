export let supabaseClient = null;
const SUPABASE_URL = "https://kcwbyobrstlshzhjlbxb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtjd2J5b2Jyc3Rsc2h6aGpsYnhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMTkxMTEsImV4cCI6MjA3NDY5NTExMX0.bCISxlXULkod0YuCVwIriojJFxNb-ISyxMbj970bsKo";
export function mountHeader(){
  const header = document.getElementById("app-header");
  header.innerHTML = `
    <div><strong>Aplikasi Pinjaman Pegawai</strong></div>
    <nav>
      <button class="tab active" data-tab="karyawan">Karyawan</button>
      <button class="tab" data-tab="cari">Cari</button>
      <button class="tab" data-tab="hutang">Hutang</button>
      <button class="tab" data-tab="report">Report</button>
    </nav>`;
}
export function connectIfSaved(){
  if (!supabaseClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✅ Supabase connected");
  }
}
export function initSupabase(){ connectIfSaved(); }