import { supabaseClient } from "./supabase.js";
import { byId, fmtIDR } from "./utils.js";

export function initCari() {
  const el = document.getElementById("tab-cari");
  el.innerHTML = `
    <div class="card">
      <h2>🔍 Cari Karyawan</h2>
      <div class="flex">
        <input id="searchKeyword" type="text" placeholder="Masukkan P ID atau Nama..." class="input"/>
        <button id="btnSearch" class="btn btn-blue">Cari</button>
      </div>
      <div id="cariResult" class="panel mt-2"></div>
    </div>
  `;

  async function doSearch() {
    const keyword = byId("searchKeyword").value.trim();
    if (!keyword) {
      alert("Masukkan kata kunci");
      return;
    }

    const { data, error } = await supabaseClient
      .from("employees")
      .select("*")
      .or(`id.ilike.%${keyword}%,name.ilike.%${keyword}%`)
      .limit(10);

    if (error) {
      byId("cariResult").innerHTML = `<p style="color:red;">❌ ${error.message}</p>`;
      return;
    }

    if (!data || data.length === 0) {
      byId("cariResult").innerHTML = `<p style="color:#666;">⚠️ Tidak ada karyawan ditemukan.</p>`;
      return;
    }

    let html = `<table class="table-smooth">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nama</th>
          <th>Group</th>
          <th>Loc</th>
          <th>Base</th>
          <th>Grade</th>
          <th>Job Title</th>
          <th>Plafon</th>
          <th>Terpakai</th>
          <th>Sisa</th>
        </tr>
      </thead>
      <tbody>`;

    data.forEach(emp => {
      html += `
        <tr>
          <td>${emp.id}</td>
          <td>${emp.name}</td>
          <td>${emp.group || "-"}</td>
          <td>${emp.loc || "-"}</td>
          <td>${emp.base || "-"}</td>
          <td>${emp.grade || "-"}</td>
          <td>${emp.job_title || "-"}</td>
          <td>${fmtIDR(emp.plafon)}</td>
          <td>${fmtIDR(emp.used_plafon || 0)}</td>
          <td>${fmtIDR(emp.remaining_plafon || 0)}</td>
        </tr>
      `;
    });

    html += "</tbody></table>";
    byId("cariResult").innerHTML = html;
  }

  // Klik tombol
  byId("btnSearch").addEventListener("click", doSearch);

  // Tekan Enter di input
  byId("searchKeyword").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doSearch();
    }
  });
}
