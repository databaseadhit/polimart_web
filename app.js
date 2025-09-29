import { initSupabase, mountHeader } from "./modules/supabase.js";
import { initKaryawan } from "./modules/karyawan.js";
import { initCari } from "./modules/cari.js";
import { initHutang } from "./modules/hutang.js";
import { initReport } from "./modules/report.js";

console.log("%c✅ app.js berhasil diload", "color: green; font-weight: bold;");

window.addEventListener("DOMContentLoaded", () => {
  console.log("%c✅ DOMContentLoaded fired", "color: #2563eb; font-weight: bold;");

  try {
    mountHeader();
    console.log("%c✅ Header berhasil dirender", "color: #10b981; font-weight: bold;");
  } catch (e) {
    console.error("%c❌ Error saat render header:", "color: red; font-weight: bold;", e);
  }

  try {
    initSupabase();
    console.log("%c✅ Supabase berhasil diinisialisasi", "color: #10b981; font-weight: bold;");
  } catch (e) {
    console.error("%c❌ Error saat initSupabase:", "color: red; font-weight: bold;", e);
  }

  try {
    initKaryawan();
    console.log("%c✅ Tab Karyawan berhasil diload", "color: #10b981; font-weight: bold;");
  } catch (e) {
    console.error("%c❌ Error saat initKaryawan:", "color: red; font-weight: bold;", e);
  }

  // 🔄 Navigasi tab dengan efek smooth
  document.querySelectorAll("header nav button").forEach(btn => {
    btn.addEventListener("click", () => {
      const tabName = btn.dataset.tab;
      console.log("%c👉 Pindah tab: " + tabName, "color: #3b82f6; font-weight: bold;");

      // Reset active state
      document.querySelectorAll("header nav button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Smooth transition antar panel
      document.querySelectorAll(".panel").forEach(sec => {
        sec.classList.add("hidden");
        sec.style.opacity = 0;
        sec.style.transition = "opacity 0.3s ease";
      });

      const activePanel = document.getElementById("tab-" + tabName);
      activePanel.classList.remove("hidden");
      setTimeout(() => activePanel.style.opacity = 1, 50);

      // Load module sesuai tab
      try {
        if (tabName === "karyawan") initKaryawan();
        else if (tabName === "cari") initCari();
        else if (tabName === "hutang") initHutang();
        else if (tabName === "report") initReport();
      } catch (e) {
        console.error("%c❌ Error saat load tab " + tabName, "color: red; font-weight: bold;", e);
      }
    });
  });
});
