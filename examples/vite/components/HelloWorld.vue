<template>
  <div>
    hey: {{pokemon && pokemon.url}}
    <br>
    <a v-if="pokemon" :href="pokemon.url">{{pokemon.name}}</a>
    <div v-if="pokemon === undefined">Loading...</div>
  </div>
</template>

<script lang="ts">
import useSWRV from 'swrv'

interface Pokemon {
  url: string,
  name: string
}

export default {
  name: 'HellowWorld',
  props: {
    count: {
      type: [Number, String],
      default: ''
    }
  },
  setup (props) {
    const { data: pokemon } = useSWRV<Pokemon>(() => `https://pokeapi.co/api/v2/pokemon/${props.count}`, key =>
      fetch(key)
        .then(res => res.json())
        .then(json => ({ ...json, url: key }))
    )

    return {
      pokemon
    }
  }
}
</script>
