<template>
  <div>
    <nav class="breadcrumb" aria-label="breadcrumbs">
      <ul>
        <li class="is-active">
          <a>Cities</a>
        </li>
      </ul>
    </nav>

    <table class="table is-narrow">
      <thead>
        <tr>
          <th>City</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(obj, index) in data" :key="index">
          <td>
            <router-link :to="{name: 'rooms', params: {city: obj.City}}">{{obj.City}}</router-link>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  data() {
    return {
      data: []
    };
    z;
  },

  components: {},
  async created() {
    let result = await this.$root.HttpGet("cities");
    this.data = result;
  },
  methods: {}
};
</script>

