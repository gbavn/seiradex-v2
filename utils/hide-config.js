// ==================== HIDE & LOCK CONFIG ====================

window.SEIRA_HIDDEN = {
    // Listas de IDs ocultos e bloqueados (preenchidas pelo Supabase config)
    maps:      [],
    objects:   [],
    items:     [],
    pokemon:   [],
    abilities: [],
    moves:     [],
    quests:    [],

    locked: {
        maps: []
    },

    // ==================== MÉTODOS ====================

    isHidden(type, id) {
        const list = this[type] || [];
        return list.includes(id);
    },

    isLocked(type, id) {
        const list = this.locked[type] || [];
        return list.includes(id);
    },

    /**
     * Filtra hidden + locked.
     * Checa item._nanoid (nanoid do banco) e item.id (pokeapi_id ou slug),
     * cobrindo o caso em que as listas do config usem um ou outro formato.
     */
    filter(type, array) {
        if (!array || !Array.isArray(array)) return array;

        return array.filter(item => {
            const id     = item._nanoid || item.id || item;
            const altId  = item.id || item;
            return !this.isHidden(type, id)  && !this.isLocked(type, id) &&
                   !this.isHidden(type, altId) && !this.isLocked(type, altId);
        });
    },

    filterOnlyHidden(type, array) {
        if (!array || !Array.isArray(array)) return array;

        return array.filter(item => {
            const id    = item._nanoid || item.id || item;
            const altId = item.id || item;
            return !this.isHidden(type, id) && !this.isHidden(type, altId);
        });
    },

    filterRelationships(data, type) {
        if (!data || typeof data !== 'object') return data;

        const filtered = JSON.parse(JSON.stringify(data));

        if (type === 'maps' && filtered.spawns) {
            ['common', 'rare', 'epic'].forEach(rarity => {
                if (filtered.spawns[rarity]) {
                    filtered.spawns[rarity] = filtered.spawns[rarity]
                        .filter(pokemonId => !this.isHidden('pokemon', pokemonId) && !this.isLocked('pokemon', pokemonId));
                }
            });
        }

        if (filtered.shop_data) {
            if (filtered.shop_data.sells) {
                filtered.shop_data.sells = filtered.shop_data.sells
                    .filter(itemId => !this.isHidden('items', itemId) && !this.isLocked('items', itemId));
            }
            if (filtered.shop_data.buys) {
                filtered.shop_data.buys = filtered.shop_data.buys
                    .filter(itemId => !this.isHidden('items', itemId) && !this.isLocked('items', itemId));
            }
        }

        if (filtered.linked_items) {
            filtered.linked_items = filtered.linked_items
                .filter(itemId => !this.isHidden('items', itemId) && !this.isLocked('items', itemId));
        }
        if (filtered.linked_pokemon) {
            filtered.linked_pokemon = filtered.linked_pokemon
                .filter(pokemonId => !this.isHidden('pokemon', pokemonId) && !this.isLocked('pokemon', pokemonId));
        }

        if (filtered.rewards) {
            if (filtered.rewards.items) {
                filtered.rewards.items = filtered.rewards.items
                    .filter(itemId => !this.isHidden('items', itemId) && !this.isLocked('items', itemId));
            }
            if (filtered.rewards.pokemon) {
                filtered.rewards.pokemon = filtered.rewards.pokemon
                    .filter(pokemonId => !this.isHidden('pokemon', pokemonId) && !this.isLocked('pokemon', pokemonId));
            }
        }

        if (filtered.evolutions) {
            filtered.evolutions = filtered.evolutions
                .filter(evo => !this.isHidden('pokemon', evo.evolves_to) && !this.isLocked('pokemon', evo.evolves_to));
        }

        return filtered;
    }
};

// ==================== CARREGA CONFIG DO SUPABASE ====================
(async () => {
    try {
        const { url, key } = SEIRA_CONFIG.SUPABASE;
        const res = await fetch(`${url}/config?select=data&limit=1`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Accept-Profile': 'rpg'
            }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const rows = await res.json();
        const config = rows?.[0]?.data;

        if (!config) throw new Error('Config vazio ou inválido');

        window.SEIRA_HIDDEN.maps      = config.hidden?.maps      || [];
        window.SEIRA_HIDDEN.objects   = config.hidden?.objects   || [];
        window.SEIRA_HIDDEN.items     = config.hidden?.items     || [];
        window.SEIRA_HIDDEN.pokemon   = config.hidden?.pokemon   || [];
        window.SEIRA_HIDDEN.abilities = config.hidden?.abilities || [];
        window.SEIRA_HIDDEN.moves     = config.hidden?.moves     || [];
        window.SEIRA_HIDDEN.quests    = config.hidden?.quests    || [];
        window.SEIRA_HIDDEN.locked.maps = config.locked?.maps   || [];

        console.log('✅ Hide & Lock Config carregado do Supabase');
    } catch (err) {
        console.error('❌ Erro ao carregar config do Supabase:', err);
    }
})();

console.log('✅ Hide & Lock Config carregado');
