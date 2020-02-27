<template>
  <div class="button is-primary is-small" :class="{'is-loading':isLoading}" @click="assign">Deploy</div>
</template>

<script>
// This is an assignment button component. This assign a role a room, city or computer.
export default {
  components: {},
  props: {
    toAssign: null,
    selected: null,
    type: null
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
        // Tell the server to assign a role. "Type" is the endpoint route (room, city or computer).
        await this.$root.HttpPost("assign/" + this.type, {
          target: this.selected,
          role: this.toAssign.Role,
          city: this.$route.params.city,
          room: this.$route.params.room
        });

        // Tell the parent component that the it has been assigned.
        this.$emit("assigned");

        // Tell the server to start deployment.
        let result = await this.$root.HttpPost("deploy/" + this.type, {
          target: this.selected,
          role: this.toAssign.Role,
          city: this.$route.params.city,
          room: this.$route.params.room
        });

        // Tell the parent component it has been deployed, and bring the result.
        this.$emit("deployed", result);

        this.isLoading = false;
      } else {
        this.$root.ShowNotification("Select a role first!", "is-warning");
      }
    }
  }
};
</script>