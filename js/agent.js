let isLoading = false;

function useQuickPrompt(el){
  const input = document.getElementById('chat-input');
  input.value = el.textContent.trim().replace(/^[^\w]+/, '');
  input.dispatchEvent(new Event('input'));
  input.focus();
}

function addMessage(role, content, isHtml = false){
  const area = document.getElementById('messages-area');
  const now = new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });
  const msg = document.createElement('div');
  msg.className = `msg ${role}`;
  if(isHtml) msg.innerHTML = content;
  else msg.innerHTML = `<div class="msg-bubble">${content}</div><div class="msg-time">${now}</div>`;
  area.appendChild(msg);
  area.scrollTop = area.scrollHeight;
}

function showTyping(){
  const area = document.getElementById('messages-area');
  const t = document.createElement('div');
  t.className = 'msg agent';
  t.id = 'typing-indicator';
  t.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
  area.appendChild(t);
  area.scrollTop = area.scrollHeight;
}

function hideTyping(){
  const t = document.getElementById('typing-indicator');
  if(t) t.remove();
}

function renderCards(prods){
  if(!prods || !prods.length) return '';
  const { TRM } = window.TraeloConfig;
  return prods.map(p => {
    const vale = p.vale_la_pena;
    const ahorroCOP = p.ahorro_cop > 0
      ? `+$${window.fmtCOP(p.ahorro_cop)} COP`
      : `-$${window.fmtCOP(Math.abs(p.ahorro_cop))} COP`;
    return `<div class="product-result ${vale ? 'vale' : 'no-vale'}">
      <div class="pr-header"><div class="pr-name">${p.nombre}</div><div class="pr-verdict">${vale ? '✅ Conviene' : '❌ No conviene'}</div></div>
      <div class="pr-prices">
        <div class="pr-price-item"><div class="pr-price-label">Precio USA</div><div class="pr-price-val accent">$${p.precio_usd} USD</div></div>
        <div class="pr-price-item"><div class="pr-price-label">Puesto en CO</div><div class="pr-price-val">$${window.fmtCOP(Math.round(p.precio_total_usd * TRM))} COP</div></div>
        <div class="pr-price-item"><div class="pr-price-label">En Colombia</div><div class="pr-price-val red">${p.precio_colombia_cop ? '$' + window.fmtCOP(p.precio_colombia_cop) + ' COP' : 'N/D'}</div></div>
      </div>
      <div class="pr-saving-row"><div class="pr-saving-label">${vale ? '💰 Ahorro' : '⚠️ Diferencia'}</div><div class="pr-saving-amount">${ahorroCOP}</div></div>
      <div class="pr-reason">${p.razon}</div>
      <div class="pr-cta">
        <button class="pr-btn primary" onclick="showToast('🚧 Integración Amazon próximamente')">Ver en Amazon</button>
        <button class="pr-btn secondary" onclick="showToast('➕ Agregado')">+ Carrito</button>
      </div>
    </div>`;
  }).join('');
}

async function sendMessage(){
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  const apiKey = localStorage.getItem('traelo_api_key') || '';
  if(!text || isLoading) return;
  if(!apiKey){ window.showApiModal(); window.showToast('⚠️ Activa el agente primero'); return; }

  addMessage('user', text);
  input.value = '';
  input.style.height = 'auto';
  isLoading = true;
  document.getElementById('send-btn').disabled = true;
  showTyping();

  const SYS = `Eres el Agente Cazador de Traelo, experto en compras USA→Colombia. Busca el producto, verifica si llega a Colombia, calcula: precio+flete($11/lb)+arancel+fee($35.000 COP). TRM=4100. Responde SOLO JSON sin backticks:
{"mensaje_intro":"...","productos":[{"nombre":"...","tienda":"Amazon","precio_usd":0,"llega_colombia":false,"peso_estimado_lb":0,"costo_flete_usd":0,"arancel_pct":15,"precio_total_usd":0,"precio_colombia_cop":0,"precio_traelo_cop":0,"ahorro_cop":0,"vale_la_pena":true,"razon":"..."}],"mensaje_final":"..."}
vale_la_pena=true solo si ahorro>15%. Max 3 productos.`;

  try{
    const { API_URL, MODEL } = window.TraeloConfig;
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: SYS,
        tools: [{ type:'web_search_20250305', name:'web_search' }],
        messages: [{ role:'user', content: text }]
      })
    });
    const data = await r.json();
    hideTyping();
    if(!r.ok){ addMessage('agent', `❌ Error: ${data?.error?.message || 'Sin conexión'}`); return; }
    const tb = data.content?.find(b => b.type === 'text');
    const raw = (tb?.text || '').replace(/```json|```/g, '').trim();
    let parsed;
    try{ parsed = JSON.parse(raw); }
    catch{ addMessage('agent', raw || 'No encontré resultados.'); return; }
    const now = new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });
    addMessage(
      'agent',
      `<div class="msg agent"><div class="msg-bubble">${parsed.mensaje_intro || 'Encontré estos resultados:'}</div>${renderCards(parsed.productos)}${parsed.mensaje_final ? `<div class="msg-bubble" style="margin-top:10px">${parsed.mensaje_final}</div>` : ''}<div class="msg-time">${now}</div></div>`,
      true
    );
  }catch(e){
    hideTyping();
    addMessage('agent', '❌ Sin conexión. Intenta de nuevo.');
  }finally{
    isLoading = false;
    document.getElementById('send-btn').disabled = false;
  }
}

function initAgent(){
  const chatInput = document.getElementById('chat-input');
  if(!chatInput) return;
  chatInput.addEventListener('input', function(){
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
  });
  chatInput.addEventListener('keydown', function(e){
    if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); }
  });

  const search = document.getElementById('search-input');
  if(search){
    search.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && this.value.trim()){
        chatInput.value = this.value.trim();
        this.value = '';
        window.switchTab('agent');
        sendMessage();
      }
    });
  }
}

window.useQuickPrompt = useQuickPrompt;
window.sendMessage = sendMessage;
window.initAgent = initAgent;
