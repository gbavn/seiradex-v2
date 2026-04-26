// ==================== CONFIGURAÇÃO GLOBAL ====================

const SEIRA_CONFIG = {
    // Supabase
    SUPABASE: {
        url: 'https://mbxvigdckqosjnwuwdej.supabase.co/rest/v1',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ieHZpZ2Rja3Fvc2pud3V3ZGVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNjU3MDAsImV4cCI6MjA4ODc0MTcwMH0.DWw3SXrXJmmPaSOt7-4_YKRK9SSMp2ryYbjuJdbvpdU',
        schema: 'rpg'
    },
    
    // Paginação
    PAGINATION: {
        perPage: 15
    },
    
    // Tipos de Pokémon
    POKEMON_TYPES: [
        'Bug', 'Dark', 'Dragon', 'Electric', 'Fairy', 'Fighting', 
        'Fire', 'Flying', 'Ghost', 'Grass', 'Ground', 'Ice', 
        'Normal', 'Poison', 'Psychic', 'Rock', 'Steel', 'Water'
    ],
    
    // Mapas ocultos
    HIDDEN_MAPS: [
        // IDs de mapas que não devem aparecer
    ],
    
    // Configuração de shops
    SHOP_ITEMS: {
        casino: [],    // IDs dos itens no Casino
        mile: [],      // IDs dos itens no Mile Shop
        book: [],      // IDs dos itens no Book Shop
        tm: [],        // IDs dos itens no TM Shop
        pokemart: []   // IDs dos itens no Pokémart
    }
};

console.log('✅ Config carregado');
