export function byId(id){ return document.getElementById(id); }
export function fmtIDR(n){ return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR'}).format(n||0); }
export function renderTable(targetId, headers, rows){
  let html = "<table border='1' cellspacing='0' cellpadding='4'><thead><tr>";
  headers.forEach(h => html += "<th>"+h+"</th>");
  html += "</tr></thead><tbody>";
  rows.forEach(r => { html += "<tr>"+r.map(c=>"<td>"+c+"</td>").join("")+"</tr>"; });
  html += "</tbody></table>";
  document.getElementById(targetId).innerHTML = html;
}