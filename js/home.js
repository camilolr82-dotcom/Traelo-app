const Home = {
  async buscar(query){
    if(!query || !query.trim()) return;
    const q = query.trim();
    const resultsDiv = document.getElementById('home-results');
    if(!resultsDiv) return;

    resultsDiv.innerHTML = `
      <div class="home-loading">
        <div class="home-loading-spinner"></div>
        <div class="home-loading-text">Buscando "${Home._escape(q)}"...</div>
      </div>`;

    try {
      const productos = await window.Marketplace.buscarAmazon(q, 10);
      if(!productos || !productos.length){
        resultsDiv.innerHTML = `
          <div class="home-empty">
            <div class="home-empty-icon">😕</div>
            <div class="home-empty-text">No encontramos resultados para "${Home._escape(q)}".<br>Intenta con otras palabras.</div>
          </div>`;
        return;
      }

      const enriquecidos = productos
        .map(p => {
          const colombia = window.Enrichment.calcularPrecioColombia(p);
          const rating = parseFloat(p.rating) || 0;
          const numRatings = Number(p.reviews ?? p.num_ratings) || 0;
          const precioUsd = colombia.precio_usd || 0.01;
          const score = rating * Math.log10(numRatings + 1) / Math.sqrt(precioUsd);
          return { ...p, colombia, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);

      Home._render(resultsDiv, q, enriquecidos);
    } catch (err) {
      console.warn('Home.buscar error:', err);
      const msg = err && err.message === 'sin_key'
        ? '🔑 Activa tu RapidAPI key en "Yo" para buscar productos de Amazon.'
        : '⚠️ No pudimos buscar en este momento. Revisa tu conexión o intenta de nuevo.';
      resultsDiv.innerHTML = `
        <div class="home-error">
          <div class="home-error-text">${msg}</div>
        </div>`;
    }
  },

  buscarDesdeInput(){
    const input = document.getElementById('home-search-input');
    if(input) Home.buscar(input.value);
  },

  abrirCamara(){
    window.showToast('📸 Búsqueda por foto — próximamente');
  },

  _render(container, query, productos){
    const cards = productos.map((p, i) => {
      const pos = i + 1;
      const rating = parseFloat(p.rating) || 0;
      const numRatings = Number(p.reviews ?? p.num_ratings) || 0;
      const starsFull = Math.round(rating);
      const stars = '★'.repeat(Math.max(0, Math.min(5, starsFull))) + '☆'.repeat(Math.max(0, 5 - starsFull));
      const precioUsd = (p.colombia.precio_usd || 0).toFixed(2);
      const totalCop = window.fmtCOP(p.colombia.total_cop || 0);
      const imgSrc = p.imagen || '';
      const imgTag = imgSrc
        ? `<img class="home-product-img" src="${Home._escape(imgSrc)}" alt="" loading="lazy" onerror="this.style.display='none'"/>`
        : `<div class="home-product-img" style="display:flex;align-items:center;justify-content:center;font-size:32px">📦</div>`;
      const url = p.url || '#';
      return `
        <a class="home-product-card" href="${Home._escape(url)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:inherit">
          ${imgTag}
          <div class="home-product-body">
            <div class="home-product-rank">${pos}</div>
            <div class="home-product-title">${Home._escape(p.nombre)}</div>
            <div class="home-product-rating"><span class="stars">${stars}</span> ${rating.toFixed(1)} · ${numRatings.toLocaleString('es-CO')} reseñas</div>
            <div class="home-product-pricing">
              <div class="home-product-usd">$${precioUsd} USD</div>
              <div class="home-product-cop">Puesto en Colombia: $${totalCop} COP</div>
            </div>
          </div>
        </a>`;
    }).join('');

    container.innerHTML = `
      <div class="home-results-header">
        <div class="home-results-query">Top ${productos.length} para "${Home._escape(query)}"</div>
        <div class="home-results-count">Ordenados por mejor match</div>
      </div>
      <div class="home-product-list">${cards}</div>`;
  },

  _escape(s){
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  },

  init(){
    const input = document.getElementById('home-search-input');
    if(input){
      input.addEventListener('keydown', function(e){
        if(e.key === 'Enter'){
          e.preventDefault();
          Home.buscarDesdeInput();
        }
      });
    }
  }
};

window.Home = Home;
