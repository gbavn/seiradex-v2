// ==================== API E CARREGAMENTO DE DADOS ====================

// ==================== HELPERS SUPABASE ====================

async function _supabaseFetch(endpoint, params = '') {
    const { url, key } = SEIRA_CONFIG.SUPABASE;
    const sep = params ? '?' : '';
    const res = await fetch(`${url}/${endpoint}${sep}${params}`, {
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Accept-Profile': 'rpg'
        }
    });
    if (!res.ok) throw new Error(`Supabase ${endpoint}: ${res.status}`);
    return res.json();
}

// Busca com paginação automática — necessário para tabelas com 1000+ linhas
async function _supabaseFetchAll(endpoint, params = '') {
    const { url, key } = SEIRA_CONFIG.SUPABASE;
    const headers = {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Accept-Profile': 'rpg'
    };

    let all = [];
    let from = 0;
    const pageSize = 1000;

    while (true) {
        const sep = params ? '&' : '?';
        const res = await fetch(
            `${url}/${endpoint}?${params}${sep}limit=${pageSize}&offset=${from}`,
            { headers }
        );
        if (!res.ok) throw new Error(`Supabase ${endpoint}: ${res.status}`);
        const rows = await res.json();
        all = all.concat(rows);
        if (rows.length < pageSize) break;
        from += pageSize;
    }

    return all;
}

// ==================== FETCHERS POR ENTIDADE ====================

async function _fetchMoves() {
    const rows = await _supabaseFetch('moves', 'select=*&order=name.asc');
    return rows.map(m => ({
        _nanoid: m.id,
        id: m.pokeapi_id,
        name: m.name,
        type: m.type,
        category: m.category,
        power: m.power,
        accuracy: m.accuracy,
        pp: m.pp,
        priority: m.priority,
        target: m.target,
        description: m.description,
        move_class: m.move_class,
        modified_for_rpg: m.modified_for_rpg,
        meta: m.meta
    }));
}

async function _fetchAbilities() {
    const rows = await _supabaseFetch('abilities', 'select=*&order=name.asc');
    return rows.map(a => ({
        _nanoid: a.id,
        id: a.pokeapi_id,
        name: a.name,
        effect: a.effect,
        modified_for_rpg: a.modified_for_rpg
    }));
}

async function _fetchItems() {
    const rows = await _supabaseFetch('items', 'select=*&order=name.asc');
    return rows.map(i => ({
        _nanoid: i.id,
        id: i.pokeapi_id,
        name: i.name,
        category: i.category,
        subcategory: i.subcategory,
        sprite: i.sprite,
        description: i.description,
        rarity: i.rarity,
        is_consumable: i.is_consumable,
        is_unique: i.is_unique,
        is_craftable: i.is_craftable,
        forageable: i.forageable,
        posts_to_collect: i.posts_to_collect,
        price: i.price,
        item_data: i.item_data
    }));
}

async function _fetchPokemon() {
    // Caches já carregados (preloadAll garante a ordem)
    const movesCache    = SEIRA_STATE.cache['moves']     || [];
    const abilitiesCache = SEIRA_STATE.cache['abilities'] || [];
    const itemsCache    = SEIRA_STATE.cache['items']     || [];

    // Lookup maps por nanoid para performance
    const movesByNanoid     = {};
    const abilitiesByNanoid = {};
    const itemsByNanoid     = {};
    movesCache.forEach(m => { if (m._nanoid) movesByNanoid[m._nanoid] = m; });
    abilitiesCache.forEach(a => { if (a._nanoid) abilitiesByNanoid[a._nanoid] = a; });
    itemsCache.forEach(i => { if (i._nanoid) itemsByNanoid[i._nanoid] = i; });

    // Busca principal e tabelas relacionadas em paralelo
    const [
        pokemonRows,
        movesetRows,
        abilitiesRows,
        heldItemsRows,
        formsIndexRows,
        evolutionRows
    ] = await Promise.all([
        _supabaseFetchAll('pokemon',             'select=*&order=pokeapi_id.asc'),
        _supabaseFetchAll('pokemon_moveset',      'select=pokemon_id,move_id,learn_method,level'),
        _supabaseFetchAll('pokemon_abilities',    'select=pokemon_id,ability_id,slot'),
        _supabaseFetchAll('pokemon_held_items',   'select=pokemon_id,item_id,rarity'),
        _supabaseFetchAll('pokemon_forms_index',  'select=base_pokemon_id,form_pokemon_id,form_class'),
        _supabaseFetchAll('pokemon_evolution',    'select=pokemon_id,evolves_to,method,trigger_type,trigger_group,trigger_mode,trigger_value')
    ]);

    // Mapa nanoid → pokeapi_id para resolver referências entre pokémon
    const nanoidToPokeapiId = {};
    pokemonRows.forEach(p => { if (p.id && p.pokeapi_id) nanoidToPokeapiId[p.id] = p.pokeapi_id; });

    // Indexar tabelas relacionadas por pokemon_id (nanoid)
    const movesetByPokemon    = {};
    const abilitiesByPokemon  = {};
    const heldItemsByPokemon  = {};
    const evolutionByPokemon  = {};

    movesetRows.forEach(r => {
        (movesetByPokemon[r.pokemon_id] = movesetByPokemon[r.pokemon_id] || []).push(r);
    });
    abilitiesRows.forEach(r => {
        (abilitiesByPokemon[r.pokemon_id] = abilitiesByPokemon[r.pokemon_id] || []).push(r);
    });
    heldItemsRows.forEach(r => {
        (heldItemsByPokemon[r.pokemon_id] = heldItemsByPokemon[r.pokemon_id] || []).push(r);
    });
    evolutionRows.forEach(r => {
        (evolutionByPokemon[r.pokemon_id] = evolutionByPokemon[r.pokemon_id] || []).push(r);
    });

    // Indexar forms_index por form_pokemon_id
    const formInfoByPokemon = {};
    formsIndexRows.forEach(r => { formInfoByPokemon[r.form_pokemon_id] = r; });

    return pokemonRows.map(p => {
        const nanoid   = p.id;
        const moveset  = movesetByPokemon[nanoid]   || [];
        const pokAbs   = abilitiesByPokemon[nanoid]  || [];
        const pokHeld  = heldItemsByPokemon[nanoid]  || [];
        const evoRows  = evolutionByPokemon[nanoid]  || [];
        const formInfo = formInfoByPokemon[nanoid];   // existe só se for uma forma

        // --- Campos simples ---
        const types    = [p.type_1, p.type_2].filter(Boolean);
        const isBase   = p.base_pokemon_id === null;
        const formOf   = p.base_pokemon_id ? (nanoidToPokeapiId[p.base_pokemon_id] || null) : null;
        const formType = formInfo ? formInfo.form_class : null;

        // --- Abilities ---
        const abilities = { normal: [], hidden: [], exotic: [] };
        pokAbs.forEach(r => {
            const ab = abilitiesByNanoid[r.ability_id];
            if (ab && abilities[r.slot] !== undefined) abilities[r.slot].push(ab.name);
        });

        // --- Moveset por método ---
        const moveset_by_level = moveset
            .filter(r => r.learn_method === 'level')
            .map(r => {
                const mv = movesByNanoid[r.move_id];
                return mv ? { move: mv.name, level: r.level } : null;
            })
            .filter(Boolean)
            .sort((a, b) => a.level - b.level);

        const learnable_moves = moveset
            .filter(r => r.learn_method === 'learnable')
            .map(r => movesByNanoid[r.move_id]?.name)
            .filter(Boolean);

        const egg_moves = moveset
            .filter(r => r.learn_method === 'egg')
            .map(r => movesByNanoid[r.move_id]?.name)
            .filter(Boolean);

        // --- Held items ---
        const held_items = pokHeld.map(r => {
            const it = itemsByNanoid[r.item_id];
            return it ? { item_id: it.id, item_name: it.name, rarity: r.rarity } : null;
        }).filter(Boolean);

        // --- evolves_to: agrupar por (destino + trigger_group) ---
        const evoGrouped = {};
        evoRows.forEach(row => {
            const key = `${row.evolves_to}__${row.trigger_group ?? 'default'}`;
            if (!evoGrouped[key]) {
                evoGrouped[key] = { pokemon: row.evolves_to, method: row.method || 'primary', triggers: [] };
            }
            if (row.trigger_type) {
                const trigger = { type: row.trigger_type, ...(row.trigger_value || {}) };
                // Converter item_id nanoid → pokeapi_id integer
                if (trigger.type === 'item' && trigger.item_id) {
                    const it = itemsByNanoid[trigger.item_id];
                    trigger.item_id = it ? it.id : null;
                }
                evoGrouped[key].triggers.push(trigger);
            }
        });

        return {
            _nanoid:          nanoid,
            id:               p.pokeapi_id,
            name:             p.name,
            form_suffix:      p.form_suffix,
            base_form:        isBase,
            form_of:          formOf,
            form_type:        formType,
            types,
            stats: {
                hp:              p.hp,
                attack:          p.attack,
                defense:         p.defense,
                special_attack:  p.special_attack,
                special_defense: p.special_defense,
                speed:           p.speed
            },
            hp:               p.hp,
            attack:           p.attack,
            defense:          p.defense,
            special_attack:   p.special_attack,
            special_defense:  p.special_defense,
            speed:            p.speed,
            height:           p.height,
            weight:           p.weight,
            egg_group_1:      p.egg_group_1,
            egg_group_2:      p.egg_group_2,
            gender_male:      p.gender_male,
            gender_female:    p.gender_female,
            can_breed:        p.can_breed,
            base_exp:         p.base_exp,
            classification:   p.classification,
            dex_entry:        p.dex_entry,
            is_starter:       p.is_starter,
            in_seira_pokedex: p.in_seira_pokedex,
            rarity:           p.rarity,
            is_producer:      p.is_producer,
            artwork:          p.artwork,
            artwork_shiny:    p.artwork_shiny,
            ability:          p.ability,       // só megas
            description:      p.description,
            abilities,
            moveset_by_level,
            learnable_moves,
            egg_moves,
            held_items,
            evolves_to: Object.values(evoGrouped)
        };
    });
}

async function _fetchMaps() {
    const pokemonCache = SEIRA_STATE.cache['pokemon'] || [];
    const pokemonByNanoid = {};
    pokemonCache.forEach(p => { if (p._nanoid) pokemonByNanoid[p._nanoid] = p; });

    const [mapRows, spawnRows] = await Promise.all([
        _supabaseFetch('maps',       'select=*&order=name.asc'),
        _supabaseFetchAll('maps_spawns', 'select=map_id,pokemon_id,rarity')
    ]);

    // Indexar spawns por map_id (nanoid)
    const spawnsByMap = {};
    spawnRows.forEach(r => {
        (spawnsByMap[r.map_id] = spawnsByMap[r.map_id] || []).push(r);
    });

    return mapRows.map(m => {
        const spawns = { common: [], rare: [], epic: [] };
        (spawnsByMap[m.id] || []).forEach(s => {
            const pk = pokemonByNanoid[s.pokemon_id];
            if (pk && spawns[s.rarity] !== undefined) spawns[s.rarity].push(pk.id);
        });

        return {
            _nanoid:          m.id,
            id:               m.map_text_id,
            name:             m.name,
            type:             m.type,
            biome:            m.biome,
            description:      m.description,
            map_image:        m.map_image,
            forum_link:       m.forum_link,
            coord_x:          m.coord_x,
            coord_y:          m.coord_y,
            meta_population:  m.meta_population,
            meta_economy:     m.meta_economy,
            meta_based_on:    m.meta_based_on,
            accesses:         m.accesses,
            special_location: m.special_location,
            spawns
        };
    });
}

async function _fetchObjects() {
    const pokemonCache = SEIRA_STATE.cache['pokemon'] || [];
    const pokemonByNanoid = {};
    pokemonCache.forEach(p => { if (p._nanoid) pokemonByNanoid[p._nanoid] = p; });

    const [objectRows, rollConfigRows, rollPokemonRows] = await Promise.all([
        _supabaseFetch('objects',              'select=*&order=name.asc'),
        _supabaseFetch('objects_roll_config',  'select=*'),
        _supabaseFetchAll('objects_roll_pokemon', 'select=object_id,pokemon_id,rarity,rate')
    ]);

    // Indexar por object_id (nanoid)
    const rollConfigByObject  = {};
    const rollPokemonByObject = {};
    rollConfigRows.forEach(r => { rollConfigByObject[r.object_id] = r; });
    rollPokemonRows.forEach(r => {
        (rollPokemonByObject[r.object_id] = rollPokemonByObject[r.object_id] || []).push(r);
    });

    return objectRows.map(obj => {
        const config      = rollConfigByObject[obj.id]  || {};
        const rollPokemon = rollPokemonByObject[obj.id] || [];

        const pokemonByRarity = { common: [], rare: [], epic: [] };
        rollPokemon.forEach(r => {
            const pk = pokemonByNanoid[r.pokemon_id];
            if (pk && pokemonByRarity[r.rarity] !== undefined) pokemonByRarity[r.rarity].push(pk.id);
        });

        return {
            _nanoid:     obj.id,
            id:          obj.id,
            name:        obj.name,
            icon:        obj.icon,
            category:    obj.category,
            is_rollable: obj.is_rollable,
            description: obj.description,
            roll_config: {
                roll_type: config.roll_type,
                gives:     config.gives,
                pokemon:   pokemonByRarity
            }
        };
    });
}

async function _fetchQuests() {
    const rows = await _supabaseFetch(
        'quests',
        'select=*,quests_rewards_items(*),quests_rewards_pokemon(*)&order=name.asc'
    );
    return rows.map(q => ({
        _nanoid:               q.id,
        id:                    q.id,
        name:                  q.name,
        requester:             q.requester,
        description:           q.description,
        quest_type:            q.quest_type,
        assigned_character:    q.assigned_character,
        status:                q.status,
        repeatable:            q.repeatable,
        cooldown_days:         q.cooldown_days,
        objective_type:        q.objective_type,
        objective_description: q.objective_description,
        req_level:             q.req_level,
        req_custom:            q.req_custom,
        req_perks:             q.req_perks,
        req_completed_quests:  q.req_completed_quests,
        req_pokemon:           q.req_pokemon,
        req_items:             q.req_items,
        reward_money:          q.reward_money,
        reward_fame:           q.reward_fame,
        reward_exp:            q.reward_exp,
        reward_custom:         q.reward_custom,
        rewards_items:         q.quests_rewards_items   || [],
        rewards_pokemon:       q.quests_rewards_pokemon || []
    }));
}

async function _fetchPerks() {
    const rows = await _supabaseFetch('perks', 'select=*&order=nome.asc');
    return rows.map(p => ({
        _nanoid:            p.id,
        id:                 p.perk_id,
        category:           p.category,
        nome:               p.nome,
        icone:              p.icone,
        descricao_curta:    p.descricao_curta,
        descricao_completa: p.descricao_completa
    }));
}

// Mapa de fetchers por chave
const SEIRA_FETCHERS = {
    moves:     _fetchMoves,
    abilities: _fetchAbilities,
    items:     _fetchItems,
    pokemon:   _fetchPokemon,
    maps:      _fetchMaps,
    objects:   _fetchObjects,
    quests:    _fetchQuests,
    perks:     _fetchPerks
};

// ==================== API PRINCIPAL ====================

const SEIRA_API = {
    // Admin mode — ativado apenas via console: SEIRA_API.toggleAdminMode()
    adminMode: localStorage.getItem('SEIRA_ADM') === 'true',

    /**
     * Carrega dados de uma entidade específica.
     * MODO NORMAL: Remove hidden + locked
     * MODO ADMIN:  Retorna tudo sem filtrar
     */
    async load(key) {
        // Retorna do cache se já foi carregado
        if (SEIRA_STATE.cache[key] && SEIRA_STATE.cache[key].length > 0) {
            if (this.adminMode) {
                return SEIRA_STATE.cache[key];
            }
            return window.SEIRA_HIDDEN.filter(key, SEIRA_STATE.cache[key]);
        }

        // Se já está carregando, aguarda
        if (SEIRA_STATE.loading[key]) {
            return new Promise(resolve => {
                const interval = setInterval(() => {
                    if (!SEIRA_STATE.loading[key]) {
                        clearInterval(interval);
                        const cached = SEIRA_STATE.cache[key];
                        if (this.adminMode) {
                            resolve(cached);
                        } else {
                            resolve(window.SEIRA_HIDDEN.filter(key, cached));
                        }
                    }
                }, 100);
            });
        }

        try {
            SEIRA_STATE.loading[key] = true;
            console.log(`🔥 Carregando ${key}...`);

            const fetcher = SEIRA_FETCHERS[key];
            if (!fetcher) throw new Error(`Fetcher não encontrado para: ${key}`);

            const data = await fetcher();

            SEIRA_STATE.cache[key] = data;
            SEIRA_STATE.loading[key] = false;

            console.log(`✅ ${key} carregado: ${data.length} itens`);

            if (this.adminMode) {
                return data;
            }

            return window.SEIRA_HIDDEN.filter(key, data);

        } catch (error) {
            console.error(`❌ Erro ao carregar ${key}:`, error);
            SEIRA_STATE.loading[key] = false;
            return [];
        }
    },

    /**
     * Carrega dados RAW (sem filtrar hidden) — APENAS para mapa interativo.
     * Mantém locked para exibir locais bloqueados em cinza.
     */
    async loadForMap(key) {
        if (!SEIRA_STATE.cache[key] || SEIRA_STATE.cache[key].length === 0) {
            await this.load(key);
        }

        const rawData = SEIRA_STATE.cache[key];

        if (this.adminMode) {
            return rawData;
        }

        return window.SEIRA_HIDDEN.filterOnlyHidden(key, rawData);
    },

    /**
     * Toggle modo admin.
     * Uso: abrir DevTools > Console > SEIRA_API.toggleAdminMode()
     */
    toggleAdminMode() {
        this.adminMode = !this.adminMode;
        localStorage.setItem('SEIRA_ADM', this.adminMode);

        if (this.adminMode) {
            console.log('🔓 MODO ADMIN ATIVADO — mostrando itens ocultos e desbloqueados');
        } else {
            console.log('🔒 MODO ADMIN DESATIVADO');
        }

        window.location.reload();
    },

    showAdminNotification() {
        const notification = document.createElement('div');
        notification.id = 'admin-mode-badge';
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                font-weight: bold;
                z-index: 9999;
                animation: slideIn 0.3s ease;
            ">
                🔓 MODO ADMIN ATIVO
                <div style="font-size: 11px; opacity: 0.9; margin-top: 4px;">
                    Mostrando itens ocultos · Console: SEIRA_API.toggleAdminMode()
                </div>
            </div>
            <style>
                @keyframes slideIn {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            </style>
        `;
        document.body.appendChild(notification);
    },

    hideAdminNotification() {
        const badge = document.getElementById('admin-mode-badge');
        if (badge) badge.remove();
    },

    /**
     * Pré-carrega todos os dados respeitando dependências:
     * 1. moves / abilities / items  (sem dependências)
     * 2. pokemon                    (usa moves, abilities, items no adapter)
     * 3. maps / objects / quests / perks  (maps e objects usam pokemon no adapter)
     */
    async preloadAll() {
        console.log('🚀 Pré-carregando todos os dados...');

        await Promise.all([
            this.load('moves'),
            this.load('abilities'),
            this.load('items')
        ]);

        await this.load('pokemon');

        await Promise.all([
            this.load('maps'),
            this.load('objects'),
            this.load('quests'),
            this.load('perks')
        ]);

        console.log('✅ Todos os dados carregados!');
    }
};

// Exibir badge se admin mode estiver ativo ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    if (SEIRA_API.adminMode) {
        SEIRA_API.showAdminNotification();
    }
});

console.log('✅ API carregado');
