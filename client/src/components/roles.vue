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
            @click="ChangeSelected(obj)"
          >{{obj.Role}}</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  components: {},
  props: {
    changed: Function
  },

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
    ChangeSelected(obj) {
      this.selectedItem = obj;
      this.changed(obj);
    }
  },

  async created() {
    let result = await this.$root.HttpGet("roles");
    this.data = result;

    window.addEventListener("click", this.close);
  }
};
</script>