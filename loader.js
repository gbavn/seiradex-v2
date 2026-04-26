(function () {
  // ==================== DETECÇÃO DE AMBIENTE ====================
  const isLocal =
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.protocol === 'file:';

  const BASE = isLocal
    ? './js/'
    : 'https://cdn.jsdelivr.net/gh/gbavn/seira-tools@latest/js/';

  console.log(`[SeiraTools] Ambiente: ${isLocal ? 'LOCAL' : 'PRODUÇÃO'} | Base: ${BASE}`);

  // ==================== LISTA DE SCRIPTS (em ordem) ====================
  // ORDEM OBRIGATÓRIA: supabase → constants → utils → stores → hooks → tools
  const scripts = [
    'supabase.js',

    // Constants
    'constants/exp-tables.js',
    'constants/pokemon-types.js',
    'constants/items-meta.js',
    'constants/property-data.js',
    'constants/misc.js',

    // Utils
    'utils/format.js',
    'utils/exp.js',
    'utils/clipboard.js',

    // Stores
    'stores/api.store.js',

    // Hooks
    'hooks/search-factories.js',

    // Tools
    'tools/nav.js',
    'tools/calc-rp.js',
    'tools/calc-batalha.js',
    'tools/calc-personagem.js',
    'tools/gen-pokemon.js',
    'tools/gen-propriedade.js',
    'tools/gen-lider.js',
    'tools/gen-ginasio.js',
    'tools/bag-editor.js',
  ];

  // ==================== CARREGAMENTO SEQUENCIAL ====================
  function loadNext(index) {
    if (index >= scripts.length) {
      console.log('[SeiraTools] Todos os scripts carregados.');
      return;
    }

    const src = BASE + scripts[index];
    const tag = document.createElement('script');
    tag.src = src;

    tag.onload = function () {
      loadNext(index + 1);
    };

    tag.onerror = function () {
      console.error(`[SeiraTools] Falha ao carregar: ${src}`);
      loadNext(index + 1);
    };

    document.head.appendChild(tag);
  }

  loadNext(0);
})();