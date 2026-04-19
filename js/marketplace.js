async function buscarAmazon(query, limit = 5){
  const key = localStorage.getItem('traelo_rapidapi_key');
  if(!key) throw new Error('sin_key');

  const host = window.TraeloConfig.RAPIDAPI_AMAZON_HOST;
  const url = `https://${host}/search?query=${encodeURIComponent(query)}&country=US&page=1`;

  let res;
  try{
    res = await fetch(url, {
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': host
      }
    });
  }catch(e){
    throw new Error('api_error');
  }
  if(!res.ok) throw new Error('api_error');

  const data = await res.json();
  const products = (data && data.data && data.data.products) || [];
  if(!products.length) throw new Error('no_results');

  const normalizados = products.map(p => {
    const priceStr = p.product_price || p.product_original_price || '';
    const match = priceStr.match(/[\d,.]+/);
    const precio_usd = match ? parseFloat(match[0].replace(/,/g, '')) : 0;
    return {
      fuente: 'amazon',
      nombre: p.product_title,
      precio_usd,
      imagen: p.product_photo,
      url: p.product_url,
      asin: p.asin,
      rating: parseFloat(p.product_star_rating) || 0,
      reviews: parseInt(p.product_num_ratings, 10) || 0
    };
  }).filter(p => p.precio_usd > 0);

  if(!normalizados.length) throw new Error('no_results');
  return normalizados.slice(0, limit);
}

async function compararPrecios(query){
  const [amzRes] = await Promise.allSettled([
    buscarAmazon(query)
  ]);

  const out = { amazon: [], mercadolibre: [], errores: {} };

  if(amzRes.status === 'fulfilled') out.amazon = amzRes.value;
  else out.errores.amazon = (amzRes.reason && amzRes.reason.message) || 'error';

  return out;
}

window.Marketplace = { buscarAmazon, compararPrecios };
