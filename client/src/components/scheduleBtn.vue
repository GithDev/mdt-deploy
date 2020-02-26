<template>
  <div>
    <VueCtkDateTimePicker
      v-model="date"
      :inline="true"
      :first-day-of-week="1"
      :min-date="minDate"
      format="YYYY-MM-DDTHH:mm:ssZ"
    />
    <br />
    <button
      class="button is-primary is-pulled-right"
      :class="{'is-loading':isLoading}"
      @click="click"
    >Save</button>
  </div>
</template>

<style>
/* .datetimepicker {
  right: 100% !important;
} */
</style>


<script>
import VueCtkDateTimePicker from "vue-ctk-date-time-picker";
import "vue-ctk-date-time-picker/dist/vue-ctk-date-time-picker.css";

export default {
  components: { VueCtkDateTimePicker },
  props: {
    toAssign: null,
    selected: null,
    type: null,
    start: null
  },

  data() {
    return {
      isLoading: false,
      date: new Date().toISOString(),
      minDate: "2010-01-01"
    };
  },

  created() {
    let date = new Date();
    date = new Date(date.setDate(date.getDate() - 1));
    this.minDate = date.toISOString().substring(0, 10);
  },
  methods: {
    async click() {
      if (this.toAssign) {
        this.isLoading = true;
        let result = await this.$root.HttpPost("schedule/set/" + this.type, {
          target: this.selected,
          role: this.toAssign.Role,
          city: this.$route.params.city,
          room: this.$route.params.room,
          start: this.date
        });

        this.$emit("done", result);

        this.isLoading = false;
      } else {
        this.$root.ShowNotification("Select a role first!", "is-warning");
      }
    }
  }
};
</script>