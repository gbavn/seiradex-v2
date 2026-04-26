(function () {
  const isLocal =
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.protocol === 'file:';

  if (!isLocal) return;

  console.log('[Seira] Ambiente local — injetando estilos do fórum...');

  const styles = [
    'https://seira.forumeiros.com/54-ltr.css', // CSS do Forumeiros
    './forum-styles.css',                        // CSS local do fórum
  ];

  styles.forEach(function (href) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
    console.log('[Seira] CSS injetado: ' + href);
  });
})();
