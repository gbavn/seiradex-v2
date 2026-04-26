// ==================== INICIALIZAÇÃO ====================

/**
 * Inicializa a aplicação
 */
async function init() {
    console.log('🚀 Iniciando Seira RPG Database...');
    
    try {
        // Setup UI
        SEIRA_NAVIGATION.setup();
        SEIRA_MODAL.setup();
        
        // Pré-carrega dados essenciais
        await SEIRA_API.preloadAll();
        
        // Verifica hash na URL (para links diretos)
        checkUrlHash();
        
        console.log('✅ Database inicializado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao inicializar:', error);
    }
}

/**
 * Verifica se há hash na URL para abrir modal direto
 */
function checkUrlHash() {
    const hash = window.location.hash;
    if (!hash) return;
    
    const [type, id] = hash.substring(1).split('-');
    
    setTimeout(() => {
        if (type === 'pokemon') openPokemonModal(parseInt(id));
        else if (type === 'item') openItemModal(parseInt(id));
        else if (type === 'move') openMoveModal(id);
        else if (type === 'ability') openAbilityModal(id);
        else if (type === 'map') openMapModal(id);
        else if (type === 'object') openObjectModal(id);
    }, 500);
}

// Inicia quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

console.log('✅ Main carregado');