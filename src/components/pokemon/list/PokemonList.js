import { component } from 'services/decorators';
import PokemonResultDto from 'models/PokemonResultDto';
import client from 'services/client';

@component('pokemon-list', '^/$', 'Pokemon list')
export default class PokemonList {

    /**
     * @type {PokemonResultDto[]|null}
     */
    results = null;

    constructor() {
        this.load();
    }

    async load() {
        this.results = await client.listPokemon();
    }
}