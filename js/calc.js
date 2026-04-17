let volActivo = false;
let selectedArancel = 15;

function selectCat(el){
  document.querySelectorAll('.cat-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  selectedArancel = parseFloat(el.dataset.arancel);
  calcular();
}

function toggleVol(){
  volActivo = !volActivo;
  document.getElementById('vol-toggle-sw').classList.toggle('on', volActivo);
  document.getElementById('vol-fields').classList.toggle('show', volActivo);
  calcular();
}

function calcular(){
  const { TRM, FEE } = window.TraeloConfig;
  const pUSD = parseFloat(document.getElementById('precio-usd').value) || 0;
  const pCol = parseFloat(document.getElementById('precio-col').value) || 0;
  const pesoLb = parseFloat(document.getElementById('peso-lb').value) || 0;
  const tarifa = parseFloat(document.getElementById('tarifa-lb').value) || 11;

  if(pUSD <= 0 || pesoLb <= 0){
    document.getElementById('resultado-section').innerHTML =
      `<div class="calc-empty"><div class="calc-empty-icon">🧮</div><div class="calc-empty-text">Ingresa el precio y el peso para ver el costo total puesto en Colombia</div></div>`;
    return;
  }

  let pesoFinal = pesoLb, pesoNote = '';
  if(volActivo){
    const l = parseFloat(document.getElementById('largo').value) || 0;
    const a = parseFloat(document.getElementById('ancho').value) || 0;
    const h = parseFloat(document.getElementById('alto').value) || 0;
    if(l > 0 && a > 0 && h > 0){
      const pVol = (l * a * h) / 139;
      pesoFinal = Math.max(pesoLb, pVol);
      pesoNote = pVol > pesoLb ? ` · ⚠️ Peso volumétrico (${pVol.toFixed(2)} lb)` : ` · ✅ Peso real`;
    }
  }

  const flete = pesoFinal * tarifa;
  const arancel = pUSD * (selectedArancel / 100);
  const totalUSD = pUSD + flete + arancel;
  const totalCOP = Math.round(totalUSD * TRM) + FEE;
  const pUSDcop = Math.round(pUSD * TRM);
  const fleteCOP = Math.round(flete * TRM);
  const arancelCOP = Math.round(arancel * TRM);

  let ahorroHTML = '';
  if(pCol > 0){
    const ahorro = pCol - totalCOP;
    const pct = Math.round((ahorro / pCol) * 100);
    const cls = ahorro > 0 ? 'positivo' : ahorro > -50000 ? 'neutro' : 'negativo';
    const lbl = ahorro > 0
      ? `💰 Ahorras ${window.fmtCOP(ahorro)} COP`
      : `⚠️ Pagas ${window.fmtCOP(Math.abs(ahorro))} COP más`;
    ahorroHTML = `<div class="ahorro-banner ${cls}">
      <div class="ahorro-left"><strong>${lbl}</strong><span>En Colombia: $${window.fmtCOP(pCol)} COP</span></div>
      <div class="ahorro-pct">${ahorro > 0 ? '+' : ''}${pct}%</div>
    </div>`;
  }

  document.getElementById('resultado-section').innerHTML = `
    <div class="resultado-card">
      <div class="resultado-header">
        <div class="resultado-header-left">
          <strong>💰 Total puesto en Colombia</strong>
          <span>Producto · Flete · Arancel · Fee Traelo</span>
        </div>
        <div class="resultado-total">$${window.fmtCOP(totalCOP)}<br><small style="font-size:11px;color:var(--text-muted)">COP</small></div>
      </div>
      <div class="desglose">
        <div class="desglose-item">
          <div class="desglose-left"><div class="desglose-icon">🛒</div><div><div class="desglose-name">Producto</div><div class="desglose-sub">Precio en tienda USA</div></div></div>
          <div><div class="desglose-amount">$${pUSD} USD</div><div class="desglose-amount cop">${window.fmtCOP(pUSDcop)} COP</div></div>
        </div>
        <div class="desglose-item">
          <div class="desglose-left"><div class="desglose-icon">✈️</div><div><div class="desglose-name">Flete Miami → Colombia</div><div class="desglose-sub">${pesoFinal.toFixed(2)} lb × $${tarifa}/lb${pesoNote}</div></div></div>
          <div><div class="desglose-amount">$${flete.toFixed(2)} USD</div><div class="desglose-amount cop">${window.fmtCOP(fleteCOP)} COP</div></div>
        </div>
        <div class="desglose-item">
          <div class="desglose-left"><div class="desglose-icon">🏛️</div><div><div class="desglose-name">Arancel de importación</div><div class="desglose-sub">${selectedArancel}% sobre el precio del producto</div></div></div>
          <div><div class="desglose-amount">$${arancel.toFixed(2)} USD</div><div class="desglose-amount cop">${window.fmtCOP(arancelCOP)} COP</div></div>
        </div>
        <div class="desglose-item">
          <div class="desglose-left"><div class="desglose-icon">📦</div><div><div class="desglose-name">Fee Traelo</div><div class="desglose-sub">Gestión de casillero y envío</div></div></div>
          <div><div class="desglose-amount" style="color:var(--accent)">$${window.fmtCOP(FEE)} COP</div></div>
        </div>
      </div>
    </div>
    ${ahorroHTML}
    <div class="cta-row">
      <button class="cta-btn primary" onclick="switchTab('agent')">🤖 Buscar con el agente</button>
      <button class="cta-btn ghost" onclick="compartir(${totalCOP},${pUSD})">📤 Compartir</button>
    </div>`;
}

function compartir(totalCOP, pUSD){
  const txt = `📦 Traelo calcula:\nProducto: $${pUSD} USD\nPuesto en Colombia: $${window.fmtCOP(totalCOP)} COP\n\n🇺🇸→🇨🇴 traelo-app.vercel.app`;
  if(navigator.share){ navigator.share({ title:'Traelo', text: txt }); }
  else{ navigator.clipboard.writeText(txt).then(() => window.showToast('✅ Resultado copiado')); }
}

window.selectCat = selectCat;
window.toggleVol = toggleVol;
window.calcular = calcular;
window.compartir = compartir;
