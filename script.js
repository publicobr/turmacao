const $ = (s) => document.querySelector(s);
const normalize = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const fmt = (d) => d ? new Intl.DateTimeFormat("pt-BR", {day:"2-digit",month:"short",year:"numeric"}).format(new Date(`${d}T12:00:00`)) : "Não informado";

function cycleDays(scale) { const m = scale.match(/(\d+)\s*x\s*(\d+)/i); return m ? [+m[1], +m[2]] : null; }
function onLand(person, date) {
  if (normalize(person.escala).includes("em terra")) return true;
  const cycle = cycleDays(person.escala);
  if (!cycle || !person.desembarque) return null;
  const off = cycle[1], total = cycle[0] + off;
  const delta = Math.floor((date - new Date(`${person.desembarque}T12:00:00`)) / 86400000);
  const position = ((delta % total) + total) % total;
  return position >= 0 && position < off;
}

const today = new Date();
const initial = today < new Date("2026-09-01T12:00:00") ? "2026-09-01" : today.toISOString().slice(0,10);
$("#referenceDate").value = initial;

function status(person, date) {
  const land = onLand(person, date);
  if (land === true) return ["Em terra", "land"];
  if (land === false) return ["Embarcado", "aboard"];
  return ["A confirmar", "unknown"];
}

function render() {
  const date = new Date(`${$("#referenceDate").value}T12:00:00`);
  const q = normalize($("#searchInput").value);
  const city = $("#cityFilter").value;
  const filter = $("#statusFilter").value;
  const visible = turma.filter(p => {
    const [label, kind] = status(p,date);
    const text = normalize(`${p.nomeGuerra} ${p.nome} ${p.cidades.join(" ")}`);
    return (!q || text.includes(q)) && (!city || p.cidades.includes(city)) &&
      (!filter || (filter === "land" && kind === "land") || (filter === "known" && cycleDays(p.escala)) || (filter === "unknown" && (!p.escala || !p.cidades.length)));
  });
  $("#peopleGrid").innerHTML = visible.map(p => {
    const [label, kind] = status(p,date);
    const initials = p.nomeGuerra.split(" ").slice(0,2).map(x=>x[0]).join("");
    return `<article class="person-card"><div class="person-head"><span class="avatar">${initials}</span><span class="badge ${kind}">${label}</span></div><h3>${p.nomeGuerra}</h3><p class="location">⌖ ${p.cidades.join(" · ") || "Local não informado"}</p><div class="details"><span><small>ESCALA</small>${p.escala || "A confirmar"}</span><span><small>DESEMBARQUE BASE</small>${fmt(p.desembarque)}</span></div></article>`;
  }).join("");
  $("#resultCount").textContent = `${visible.length} de ${turma.length} pessoas`;
  $("#emptyState").hidden = visible.length > 0;
  const lands = turma.filter(p => onLand(p,date) === true).length;
  $("#onLandCount").textContent = lands;
  renderOpportunities(date);
}

function renderOpportunities(date) {
  const windows = [0,7,14].map(offset => {
    const d = new Date(date); d.setDate(d.getDate()+offset);
    const people = turma.filter(p => onLand(p,d) === true);
    return {d, people};
  });
  $("#opportunities").innerHTML = windows.map((w,i)=>`<article class="window ${i===0?'featured':''}"><div><span>${i===0?'DATA SELECIONADA':`+${i*7} DIAS`}</span><strong>${new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"long"}).format(w.d)}</strong></div><b>${w.people.length}</b><p>colegas em terra</p><small>${w.people.slice(0,4).map(p=>p.nomeGuerra).join(", ")}${w.people.length>4?` +${w.people.length-4}`:""}</small></article>`).join("");
}

const cities = [...new Set(turma.flatMap(p=>p.cidades))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
$("#cityFilter").insertAdjacentHTML("beforeend", cities.map(c=>`<option>${c}</option>`).join(""));
$("#totalPeople").textContent = turma.length;
$("#cityCount").textContent = cities.length;
["#searchInput","#cityFilter","#statusFilter","#referenceDate"].forEach(s=>$(s).addEventListener("input",render));
$("#clearFilters").addEventListener("click",()=>{$("#searchInput").value="";$("#cityFilter").value="";$("#statusFilter").value="";render();});
$("#fortalezaFilter").addEventListener("click",()=>{$("#cityFilter").value="Fortaleza";$("#pessoas").scrollIntoView({behavior:"smooth"});render();});
$("#chatForm").addEventListener("submit", event => {
  event.preventDefault();
  const info = $("#chatMessage").value.trim();
  if (!info) return;
  const message = `Olá! Tenho informações para incluir ou corrigir no site da Turma Cão:\n\n${info}`;
  window.location.href = `https://wa.me/5511964992030?text=${encodeURIComponent(message)}`;
});
render();
