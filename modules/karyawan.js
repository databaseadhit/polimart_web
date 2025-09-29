import { supabaseClient } from "./supabase.js";
import { renderTable, fmtIDR, byId } from "./utils.js";

let rowsPreview = [];
let currentPage = 1;
const pageSize = 100;
let totalCount = 0;

function normalize(str){
  return str.toString().trim().toLowerCase().replace(/\s+/g," ");
}

export function initKaryawan(){
  const el = document.getElementById("tab-karyawan");
  el.innerHTML = `
    <div class="card">
      <h2>👤 Kelola Karyawan</h2>
      <p class="muted">
        Upload file Excel dengan header minimal: 
        <b>Group, Loc, Base, grade, P ID, Name, Job Title, Maksimal Hutang</b>.
      </p>

      <div class="flex" style="gap:10px; margin-bottom:15px; flex-wrap:wrap;">
        <input id="fileEmployees" type="file" accept=".xlsx,.xls" class="input" style="flex:1; min-width:250px;"/>
        <button id="btnPreviewEmp" class="btn btn-blue">🔍 Preview</button>
        <button id="btnImportEmp" class="btn btn-green">⬆️ Import (Upsert)</button>
      </div>

      <div id="empPreview" class="panel"></div>
      <div id="empCount" class="muted" style="margin-top:8px;"></div>
      <div id="pagination" class="flex" style="margin-top:10px; gap:8px;"></div>
    </div>
  `;

  // 👉 Event Preview (Excel / Supabase)
  byId("btnPreviewEmp").addEventListener("click", async ()=>{
    const f = byId("fileEmployees").files?.[0];
    if(f){
      // ... (logic preview Excel tetap sama seperti sebelumnya)
    } else {
      currentPage = 1;
      await loadSupabasePage(currentPage);
    }
  });

  // 👉 Event Import
  byId("btnImportEmp").addEventListener("click", async()=>{
    if(!supabaseClient){ alert("❌ Belum connect ke Supabase"); return; }
    if(!rowsPreview.length){ alert("❌ Preview dulu datanya dari Excel"); return; }

    const { error } = await supabaseClient
      .from("employees")
      .upsert(rowsPreview, { onConflict: "id" });

    if(error){ 
      alert("❌ Gagal import: " + error.message); 
      return; 
    }
    alert("✅ "+rowsPreview.length+" karyawan berhasil diupdate ke Supabase");
  });
}

// 📄 Paging Supabase
async function loadSupabasePage(page){
  const from = (page-1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabaseClient
    .from("employees")
    .select("*", { count: "exact" })
    .range(from, to);

  if(error){
    byId("empPreview").innerHTML = `<p style="color:red;">❌ ${error.message}</p>`;
    return;
  }

  totalCount = count || 0;

  renderTable(
    "empPreview",
    ["ID","Name","Group","Loc","Base","Grade","Job Title","Plafon","Terpakai","Sisa"],
    data.map(r => [
      r.id, r.name, r.group, r.loc, r.base, r.grade, r.job_title,
      fmtIDR(r.plafon), fmtIDR(r.used_plafon), fmtIDR(r.remaining_plafon)
    ])
  );

  const totalPages = Math.ceil(totalCount / pageSize);
  byId("empCount").innerText = `✅ Total karyawan di Supabase: ${totalCount}. Halaman ${page} dari ${totalPages}.`;

  // tombol paging
  let pagHtml = "";
  if(page > 1){
    pagHtml += `<button class="btn btn-gray" id="btnPrev">⬅️ Prev</button>`;
  }
  if(page < totalPages){
    pagHtml += `<button class="btn btn-blue" id="btnNext">➡️ Next</button>`;
  }
  byId("pagination").innerHTML = pagHtml;

  if(byId("btnPrev")) byId("btnPrev").addEventListener("click", ()=>loadSupabasePage(page-1));
  if(byId("btnNext")) byId("btnNext").addEventListener("click", ()=>loadSupabasePage(page+1));
}
