<template>
  <div class="button is-primary is-small" :class="{'is-loading':isLoading}" @click="assign">Deploy</div>
</template>

<script>
export default {
  components: {},
  props: {
    toAssign: null,
    selected: null,
    type: null,
    assigned: Function,
    deployed: Function
  },

  data() {
    return {      
      isLoading: false
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
    async assign() {
      if (this.toAssign) {
        this.isLoading = true;

        await this.$root.HttpPost("assign/" + this.type, {
          target: this.selected,
          role: this.toAssign.Role,
          city: this.$route.params.city,
          room: this.$route.params.room
        });

        this.assigned();

        let result = await this.$root.HttpPost("deploy/" + this.type, {
          target: this.selected,
          role: this.toAssign.Role,
          city: this.$route.params.city,
          room: this.$route.params.room
        });
        
        this.deployed(result);

        this.isLoading = false;
      } else {
        this.$root.ShowNotification("Select a role first!", "is-warning");
      }
    }
  }
};
</script>