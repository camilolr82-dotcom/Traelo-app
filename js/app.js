const VIEWS = ['home', 'agent', 'calc', 'pedidos', 'cuenta'];

async function loadViews(){
  const main = document.querySelector('.main');
  const htmls = await Promise.all(
    VIEWS.map(v => fetch(`views/${v}.html`).then(r => {
      if(!r.ok) throw new Error(`No se pudo cargar views/${v}.html`);
      return r.text();
    }))
  );
  main.innerHTML = htmls.join('\n');
}

async function fetchTRM(){
  try {
    const res = await fetch(window.TraeloConfig.TRM_URL);
    if(!res.ok) return;
    const data = await res.json();
    const valor = parseFloat(data?.[0]?.valor);
    if(valor > 3000 && valor < 6000){
      window.TraeloConfig.TRM = valor;
      console.log('TRM actualizada:', valor);
      const el = document.getElementById('trm-display');
      if(el) el.textContent = '$' + Math.round(valor).toLocaleString('es-CO') + ' COP / USD';
    }
  } catch (e) {
    console.warn('TRM fetch fallido, usando fallback:', window.TraeloConfig.TRM);
  }
}

async function init(){
  try {
    await loadViews();
  } catch (err) {
    document.querySelector('.main').innerHTML =
      `<div style="padding:40px 20px;text-align:center;color:var(--red)">
        ⚠️ Error cargando vistas.<br>
        <small style="color:var(--text-muted);display:block;margin-top:8px">
          Debes abrir la app con un servidor local (no con file://).<br>
          Ejemplo: <code>python3 -m http.server 8000</code>
        </small>
        <small style="color:var(--text-dim);display:block;margin-top:8px">${err.message}</small>
      </div>`;
    return;
  }

  await fetchTRM();

  window.initUI();
  window.initAgent();

  if(window.Home && typeof window.Home.init === 'function'){
    window.Home.init();
  }

  const apiKey = localStorage.getItem('traelo_api_key') || '';
  if(apiKey) window.showToast('✅ Agente listo');
  else setTimeout(() => window.showToast('🔑 Activa el agente en "Yo"'), 1200);
}

window.addEventListener('DOMContentLoaded', init);
