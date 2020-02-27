<template>
  <div>
    <div class="dropdown" :class="{'is-active': showList }">
      <div class="dropdown-trigger">
        <button
          class="button"
          aria-haspopup="true"
          aria-controls="dropdown-menu2"
          @click.stop.prevent="open"
        >
          <span>{{selectedItem ? selectedItem.Role :"Roles"}}</span>
          <span class="icon is-small">
            <i class="material-icons" aria-hidden="true">arrow_drop_down</i>
          </span>
        </button>
      </div>
      <div class="dropdown-menu" id="dropdown-menu" role="menu">
        <div class="dropdown-content">
          <a
            v-for="(obj, index) in data"
            :key="index"
            class="dropdown-item"
            @click="changeSelected(obj)"
          >{{obj.Role}}</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// This is a dropdown list component with MDT roles.
export default {
  components: {},
  props: {},

  data() {
    return {
      data: [],
      showList: false,
      selectedItem: null
    };
  },

  methods: {
    close(e) {
      if (this.showList) {
        this.showList = !this.showList;
      }
    },
    open(e) {
      this.showList = !this.showList;
    },
    changeSelected(obj) {
      this.selectedItem = obj;
      this.$emit("changed", obj);
    }
  },

  async created() {
    let result = await this.$root.HttpGet("roles");
    this.data = result;

    window.addEventListener("click", this.close);
  }
};
</script>