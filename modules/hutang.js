import { supabaseClient } from "./supabase.js";
import { byId, fmtIDR } from "./utils.js";

let transaksiItems = [];
let selectedEmp = null;

export function initHutang(){
  const el = document.getElementById("tab-hutang");
  el.innerHTML = `
    <h2>🛒 Kelola Hutang</h2>

    <div class="card">
      <h3>🔍 Cari Karyawan</h3>
      <div class="flex">
        <input id="hutangSearch" type="text" placeholder="Masukkan ID / Nama karyawan" class="input" />
        <button id="btnCariHutang" class="btn btn-blue">Cari</button>
      </div>
      <div id="hutangCariResult" class="panel"></div>
    </div>

    <div class="card" id="hutangKaryawan"></div>

    <div class="card">
      <h3>🛍️ Tambah Belanja</h3>
      <div class="flex">
        <input id="itemName" type="text" placeholder="Nama Barang" class="input" />
        <input id="itemPrice" type="number" min="0" placeholder="Harga" class="input" />
        <input id="itemQty" type="number" min="1" placeholder="Qty" class="input small" />
        <button id="btnAddItem" class="btn btn-green">➕ Tambah Item</button>
      </div>
      <div id="itemsList" class="panel"></div>
    </div>

    <div class="flex action-bar" style="z-index:10; position:relative;">
      <button id="btnSimpanHutang" class="btn btn-green" disabled>💾 Simpan Transaksi</button>
      <button id="btnCetakStruk" class="btn btn-gray" disabled>🖨️ Cetak Struk</button>
      <button id="btnDownloadPDF" class="btn btn-blue" disabled>📥 Download PDF</button>
    </div>

    <div class="card">
      <h3>🧾 Struk Belanja</h3>
      <div class="flex">
        <label for="ukuranStruk">Ukuran Kertas: </label>
        <select id="ukuranStruk" class="input small">
          <option value="58">58 mm</option>
          <option value="80">80 mm</option>
        </select>
      </div>
      <div id="strukPreview" class="receipt receipt-58"></div>
    </div>
  `;

  transaksiItems = [];
  selectedEmp = null;

  // 🔍 Cari karyawan
  async function searchEmployee(){
    const kw = byId("hutangSearch").value.trim();
    if(!kw){ alert("Masukkan kata kunci"); return; }

    const { data, error } = await supabaseClient.from("employees").select("*")
      .or(`id.ilike.%${kw}%,name.ilike.%${kw}%`).limit(10);

    if(error){ byId("hutangCariResult").innerHTML="<p style='color:red'>"+error.message+"</p>"; return; }
    if(!data||data.length===0){ byId("hutangCariResult").innerHTML="<p>⚠️ Karyawan tidak ditemukan.</p>"; return; }

    let html = "<table class='table-smooth'><thead><tr>";
    html += "<th>ID</th><th>Nama</th><th>Plafon</th><th>Terpakai</th><th>Sisa</th><th>Pilih</th>";
    html += "</tr></thead><tbody>";
    data.forEach(emp=>{
      html += `<tr>
        <td>${emp.id}</td>
        <td>${emp.name}</td>
        <td>${fmtIDR(emp.plafon)}</td>
        <td>${fmtIDR(emp.used_plafon)}</td>
        <td>${fmtIDR(emp.remaining_plafon)}</td>
        <td><button class="btn btn-blue" onclick="window.selectEmp('${emp.id}')">✅ Pilih</button></td>
      </tr>`;
    });
    html += "</tbody></table>";
    byId("hutangCariResult").innerHTML = html;

    window.selectEmp = (empid)=>{
      selectedEmp = data.find(e=>e.id===empid);
      transaksiItems = [];
      renderSelectedEmp();
      renderItems();
      renderStruk();
      toggleButtons();
    };
  }
  byId("btnCariHutang").addEventListener("click", searchEmployee);
  byId("hutangSearch").addEventListener("keydown",(e)=>{ if(e.key==="Enter"){ e.preventDefault(); searchEmployee(); } });

  // ➕ Tambah item
  function addItem(){
    const name=byId("itemName").value.trim();
    const price=parseFloat(byId("itemPrice").value||0);
    const qty=parseInt(byId("itemQty").value||0);

    if(!name||qty<=0||price<=0){ alert("Lengkapi Nama, Harga, dan Qty"); return; }

    const totalSekarang = transaksiItems.reduce((s,i)=>s+i.qty*i.price,0);
    const totalBaru = totalSekarang + (qty*price);
    if(selectedEmp && totalBaru > selectedEmp.remaining_plafon){
      alert(`⚠️ Total belanja (${fmtIDR(totalBaru)}) melebihi sisa plafon (${fmtIDR(selectedEmp.remaining_plafon)})`);
      return;
    }

    transaksiItems.push({name,qty,price});
    renderItems();
    renderStruk();
    toggleButtons();
    byId("itemName").value=""; byId("itemPrice").value=""; byId("itemQty").value="";
    byId("itemName").focus();
  }
  byId("btnAddItem").addEventListener("click", addItem);

  // Enter flow
  byId("itemName").addEventListener("keydown",(e)=>{ if(e.key==="Enter"){ e.preventDefault(); byId("itemPrice").focus(); } });
  byId("itemPrice").addEventListener("keydown",(e)=>{ if(e.key==="Enter"){ e.preventDefault(); byId("itemQty").focus(); } });
  byId("itemQty").addEventListener("keydown",(e)=>{ if(e.key==="Enter"){ e.preventDefault(); addItem(); } });

  // ✅ Toggle tombol
  function toggleButtons(){
    if(!selectedEmp || transaksiItems.length===0){
      ["btnSimpanHutang","btnCetakStruk","btnDownloadPDF"].forEach(id=>byId(id).disabled = true);
      return;
    }
    const total=transaksiItems.reduce((s,i)=>s+i.qty*i.price,0);
    byId("btnSimpanHutang").disabled = (total > selectedEmp.remaining_plafon);
    byId("btnCetakStruk").disabled = false;
    byId("btnDownloadPDF").disabled = false;
  }

  // 💾 Simpan transaksi
  byId("btnSimpanHutang").addEventListener("click", async ()=>{
    if(!selectedEmp){ alert("Pilih karyawan dulu"); return; }
    if(transaksiItems.length===0){ alert("Tambah item dulu"); return; }

    const total=transaksiItems.reduce((s,i)=>s+i.qty*i.price,0);
    if(total > selectedEmp.remaining_plafon){
      alert(`❌ Tidak bisa simpan. Total belanja (${fmtIDR(total)}) melebihi sisa plafon (${fmtIDR(selectedEmp.remaining_plafon)})`);
      return;
    }

    const { error }=await supabaseClient.from("transactions").insert({
      employee_id:selectedEmp.id,
      employee_name:selectedEmp.name,
      trx_date:new Date().toISOString().slice(0,10),
      items:transaksiItems,
      total:total
    });

    if(error){ alert("❌ Gagal simpan: "+error.message); return; }
    alert("✅ Transaksi tersimpan. Total: "+fmtIDR(total));

    transaksiItems=[]; renderItems(); renderStruk(); toggleButtons();
    selectedEmp.used_plafon += total;
    selectedEmp.remaining_plafon -= total;
    renderSelectedEmp();
  });

  // 🖨️ Cetak struk
  byId("btnCetakStruk").addEventListener("click", ()=>{
    const strukHTML = byId("strukPreview").innerHTML;
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Cetak Struk</title></head>
      <body onload="window.print(); window.close();">
        ${strukHTML}
      </body></html>
    `);
    win.document.close();
  });

  // 📥 Download PDF
  byId("btnDownloadPDF").addEventListener("click", ()=>{
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:"mm", format:"a4" });
    const text = byId("strukPreview").innerText;
    const lines = doc.splitTextToSize(text, 180);
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.text(lines, 10, 20);
    doc.save(`struk_${selectedEmp?.id||"pegawai"}.pdf`);
  });

  // 👤 Render karyawan
  function renderSelectedEmp(){
    if(!selectedEmp){ byId("hutangKaryawan").innerHTML=""; return; }
    const sisaStyle = selectedEmp.remaining_plafon < 0 ? "color:red; font-weight:bold;" : "color:green; font-weight:bold;";
    byId("hutangKaryawan").innerHTML = `
      <div class="card highlight">
        <h3>👤 Karyawan Terpilih</h3>
        <p><b>${selectedEmp.name}</b> | ${selectedEmp.id}</p>
        <p>Plafon: ${fmtIDR(selectedEmp.plafon)} | 
           Terpakai: ${fmtIDR(selectedEmp.used_plafon)} | 
           <span style="${sisaStyle}">Sisa: ${fmtIDR(selectedEmp.remaining_plafon)}</span></p>
      </div>
    `;
  }

  // 🛍️ Render items
  function renderItems(){
    if(transaksiItems.length===0){ 
      byId("itemsList").innerHTML="<p>(Belum ada item)</p>"; 
      renderStruk(); toggleButtons(); return; 
    }
    let html=`<table class="table-smooth"><thead>
      <tr><th>Barang</th><th>Qty</th><th>Harga</th><th>Total</th><th>Aksi</th></tr>
      </thead><tbody>`;
    transaksiItems.forEach((i,idx)=>{
      html+=`<tr>
        <td>${i.name}</td>
        <td>${i.qty}</td>
        <td>${fmtIDR(i.price)}</td>
        <td>${fmtIDR(i.qty*i.price)}</td>
        <td>
          <button class="btn btn-blue" onclick="window.editItem(${idx})">✏️ Edit</button>
          <button class="btn btn-red" onclick="window.removeItem(${idx})">🗑️ Hapus</button>
        </td>
      </tr>`;
    });
    html+="</tbody></table>";
    byId("itemsList").innerHTML=html;

    window.removeItem=(idx)=>{ transaksiItems.splice(idx,1); renderItems(); renderStruk(); toggleButtons(); };
    window.editItem=(idx)=>{
      const item=transaksiItems[idx];
      const newQty=prompt("Ubah qty:",item.qty);
      const newPrice=prompt("Ubah harga:",item.price);
      if(newQty && newPrice){
        const newTotal=(parseInt(newQty)||0)*(parseFloat(newPrice)||0);
        const totalSekarang=transaksiItems.reduce((s,i,ii)=> ii===idx ? s : s+i.qty*i.price,0);
        if(selectedEmp && (totalSekarang+newTotal)>selectedEmp.remaining_plafon){
          alert(`⚠️ Total belanja melebihi sisa plafon (${fmtIDR(selectedEmp.remaining_plafon)})`);
          return;
        }
        transaksiItems[idx].qty=parseInt(newQty);
        transaksiItems[idx].price=parseFloat(newPrice);
      }
      renderItems(); renderStruk(); toggleButtons();
    };
  }

  // 🧾 Render struk
  function renderStruk(){
    if(!selectedEmp){ byId("strukPreview").innerHTML="<p>(Belum ada karyawan dipilih)</p>"; return; }
    if(transaksiItems.length===0){ byId("strukPreview").innerHTML="<p>(Belum ada item belanja)</p>"; return; }

    const total=transaksiItems.reduce((s,i)=>s+i.qty*i.price,0);
    const sisaPlafonAwal=selectedEmp.remaining_plafon;
    const sisaPlafonAkhir=sisaPlafonAwal-total;

    function fixedWidth(str,width,align="left"){ str=String(str); return str.length>width?str.slice(0,width):(align==="right"?str.padStart(width," "):str.padEnd(width," ")); }
    const wNo=3, wItem=18, wHarga=15, wTotal=18;

    let struk=`<pre>
                POLIMART
       ALAMAT : Jalan bla bla bla
-----------------------------------------------------------------------------
Nama Pegawai : ${selectedEmp.name}
No PID       : ${selectedEmp.id}
Total Plafon : ${fmtIDR(selectedEmp.plafon)}
------------------------------------------------------------------------------
                Rincian Belanja
------------------------------------------------------------------------------`;
    transaksiItems.forEach((i,idx)=>{
    const no=fixedWidth((idx+1)+".",wNo,"right");
    const nama=fixedWidth(`${i.name} x${i.qty}`,wItem,"left");
    const harga=fixedWidth(`@${fmtIDR(i.price)}`,wHarga,"right");
    const totalHarga=fixedWidth(`= ${fmtIDR(i.qty*i.price)}`,wTotal,"right");
     struk+=`\n${no} ${nama}${harga} ${totalHarga}`;
    });
    const warning=sisaPlafonAkhir<0?"\n⚠️ WARNING: Belanja melebihi plafon!":"";
    struk+=`
--------------------------------------------------------------------------------
Total Belanja : ${fmtIDR(total)}
--------------------------------------------------
Sisa Plafon Awal     : ${fmtIDR(sisaPlafonAwal)}
Sisa Plafon Akhir    : ${fmtIDR(sisaPlafonAkhir)}
${warning}
---------------------------------------------------------------------------------
Terima Kasih, Belanja di POLIMART
</pre>`;
    const ukuran=byId("ukuranStruk")?.value||"58";
    const receiptClass=ukuran==="80"?"receipt-80":"receipt-58";
    byId("strukPreview").innerHTML=`<div class="receipt ${receiptClass}">${struk}</div>`;
  }
}
