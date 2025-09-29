import { supabaseClient } from "./supabase.js";
import { byId, fmtIDR } from "./utils.js";

export function initReport() {
  const el = document.getElementById("tab-report");
  el.innerHTML = `
    <h2 class="page-title">📊 Report Hutang</h2>

    <div class="card">
      <div class="flex" style="flex-wrap:wrap; gap:20px;">
        <div class="field">
          <label for="reportType">Jenis Laporan:</label>
          <select id="reportType" class="input small">
            <option value="daily">Harian</option>
            <option value="weekly">Mingguan</option>
            <option value="monthly">Bulanan</option>
            <option value="yearly">Tahunan</option>
          </select>
        </div>

        <div class="field hidden" id="fieldDaily">
          <label for="filterDate">Tanggal:</label>
          <input type="date" id="filterDate" class="input small wide" />
        </div>

        <div class="field hidden" id="fieldWeekly">
          <label for="filterWeek">Tanggal (awal minggu):</label>
          <input type="date" id="filterWeek" class="input small wide" />
        </div>

        <div class="field hidden" id="fieldMonthly">
          <label for="filterMonth">Bulan:</label>
          <input type="month" id="filterMonth" class="input small wide" />
        </div>

        <div class="field hidden" id="fieldYearly">
          <label for="filterYear">Tahun:</label>
          <select id="filterYear" class="input small wide">
            ${Array.from({ length: 6 }, (_, i) => {
              const y = new Date().getFullYear() - i;
              return `<option value="${y}">${y}</option>`;
            }).join("")}
          </select>
        </div>

        <div class="field">
          <button id="btnLoadReport" class="btn btn-blue">📊 Tampilkan</button>
          <button id="btnDownloadReportPDF" class="btn btn-green" disabled>📄 Download PDF</button>
        </div>
      </div>
    </div>

    <div id="reportResult" class="card"></div>
  `;

  let latestRows = [];
  let totalHutangGlobal = 0;
  let reportTitle = "";

  // 🔄 toggle filter
  function toggleFilter(type) {
    ["fieldDaily", "fieldWeekly", "fieldMonthly", "fieldYearly"].forEach(id =>
      byId(id).classList.add("hidden")
    );
    if (type === "daily") byId("fieldDaily").classList.remove("hidden");
    if (type === "weekly") byId("fieldWeekly").classList.remove("hidden");
    if (type === "monthly") byId("fieldMonthly").classList.remove("hidden");
    if (type === "yearly") byId("fieldYearly").classList.remove("hidden");
  }

  byId("reportType").addEventListener("change", e => toggleFilter(e.target.value));
  toggleFilter("daily");

  // 🔍 Load report
  byId("btnLoadReport").addEventListener("click", async () => {
    const type = byId("reportType").value;
    let startDate, endDate;

    if (type === "daily") {
      startDate = endDate = byId("filterDate").value;
      if (!startDate) return alert("⚠️ Pilih tanggal dulu");
      reportTitle = `Laporan Harian (${startDate})`;
    } else if (type === "weekly") {
      const weekStart = new Date(byId("filterWeek").value);
      if (isNaN(weekStart)) return alert("⚠️ Pilih tanggal awal minggu");
      startDate = weekStart.toISOString().slice(0, 10);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      endDate = weekEnd.toISOString().slice(0, 10);
      reportTitle = `Laporan Mingguan (${startDate} s/d ${endDate})`;
    } else if (type === "monthly") {
      const val = byId("filterMonth").value;
      if (!val) return alert("⚠️ Pilih bulan");
      const [year, month] = val.split("-");
      startDate = `${year}-${month}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      endDate = `${year}-${month}-${lastDay}`;
      const bulanNama = new Date(startDate).toLocaleDateString("id-ID", { month: "long" });
      reportTitle = `Laporan Bulanan (${bulanNama} ${year})`;
    } else if (type === "yearly") {
      const year = byId("filterYear").value;
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
      reportTitle = `Laporan Tahunan (${year})`;
    }

    const { data: trx, error } = await supabaseClient
      .from("transactions")
      .select("employee_id, employee_name, total, trx_date")
      .gte("trx_date", startDate)
      .lte("trx_date", endDate);

    if (error) {
      byId("reportResult").innerHTML = `<p style="color:red;">❌ ${error.message}</p>`;
      return;
    }
    if (!trx || trx.length === 0) {
      byId("reportResult").innerHTML = `<p>⚠️ Tidak ada data transaksi.</p>`;
      return;
    }

    // Ambil plafon karyawan
    const empIds = [...new Set(trx.map(t => t.employee_id))];
    const { data: emps } = await supabaseClient
      .from("employees")
      .select("id, plafon, remaining_plafon")
      .in("id", empIds);

    // Gabungkan data
    const grouped = {};
    trx.forEach(t => {
      if (!grouped[t.employee_id]) {
        const emp = emps.find(e => e.id === t.employee_id) || {};
        grouped[t.employee_id] = {
          id: t.employee_id,
          name: t.employee_name,
          plafon: emp.plafon || 0,
          sisa: emp.remaining_plafon || 0,
          total: 0
        };
      }
      grouped[t.employee_id].total += t.total;
    });

    latestRows = Object.values(grouped);

    totalHutangGlobal = 0;
    const rowsHTML = latestRows.map(r => {
      totalHutangGlobal += r.total;
      return `
        <tr>
          <td>${r.id}</td>
          <td>${r.name}</td>
          <td style="text-align:right">${fmtIDR(r.plafon)}</td>
          <td style="text-align:right">${fmtIDR(r.sisa)}</td>
          <td style="text-align:right">${fmtIDR(r.total)}</td>
        </tr>`;
    }).join("");

    byId("reportResult").innerHTML = `
      <h3>📌 ${reportTitle}</h3>
      <table class="table-smooth">
        <thead>
          <tr>
            <th>PID</th>
            <th>Nama</th>
            <th>Plafon</th>
            <th>Sisa Plafon</th>
            <th>Total Hutang</th>
          </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
        <tfoot>
          <tr>
            <th colspan="4" style="text-align:right">TOTAL HUTANG</th>
            <th style="text-align:right">${fmtIDR(totalHutangGlobal)}</th>
          </tr>
        </tfoot>
      </table>
      <p style="margin-top:10px; font-weight:bold; color:#444;">
        💡 Total hutang ini harus dibayarkan oleh perusahaan: ${fmtIDR(totalHutangGlobal)}
      </p>
    `;

    byId("btnDownloadReportPDF").disabled = false;
  });

  // 📄 Download PDF
  byId("btnDownloadReportPDF").addEventListener("click", () => {
    if (!latestRows.length) return alert("⚠️ Tidak ada data");

    const jsPDF = window.jspdf.jsPDF; // ✅ fix
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("📊 " + reportTitle, 14, 15);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Dicetak: " + new Date().toLocaleDateString("id-ID"), 14, 22);

    const tableData = latestRows.map(r => [
      r.id,
      r.name,
      fmtIDR(r.plafon),
      fmtIDR(r.sisa),
      fmtIDR(r.total),
    ]);

    tableData.push([
      { content: "TOTAL HUTANG", colSpan: 4, styles: { halign: "right", fontStyle: "bold" } },
      { content: fmtIDR(totalHutangGlobal), styles: { halign: "right", fontStyle: "bold" } },
    ]);

    doc.autoTable({
      startY: 28,
      head: [["PID", "Nama", "Plafon", "Sisa", "Hutang"]],
      body: tableData,
      styles: { font: "helvetica", fontSize: 9 },
      headStyles: { fillColor: [52, 152, 219] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 60 },
        2: { halign: "right", cellWidth: 30 },
        3: { halign: "right", cellWidth: 30 },
        4: { halign: "right", cellWidth: 30 },
      }
    });

    let finalY = doc.lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "italic");
    doc.text(
      `💡 Total hutang ini harus dibayarkan oleh perusahaan: ${fmtIDR(totalHutangGlobal)}`,
      14,
      finalY
    );

    doc.save("laporan_hutang.pdf");
  });
}
