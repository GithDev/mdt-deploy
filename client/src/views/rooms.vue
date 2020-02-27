<template>
  <div>
    <nav class="breadcrumb" aria-label="breadcrumbs">
      <ul>
        <li>
          <router-link :to="{name: 'cities'}">Cities</router-link>
        </li>
        <li>
          <router-link
            :to="{name: 'rooms', city: {city: $route.params.city}}"
          >{{$route.params.city}}</router-link>
        </li>
        <li class="is-active">
          <a href="/cities">Rooms</a>
        </li>
      </ul>
    </nav>

    <roles @changed="roleChanged($event)"></roles>
    <table class="table is-narrow">
      <thead>
        <tr>
          <th>Room</th>
          <th>Action</th>
          <th>Schedule</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(obj, index) in data" :key="index">
          <td>
            <router-link
              :to="{name: 'computers', params: {city: $route.params.city, room: obj.Room}}"
            >{{obj.Room}}</router-link>
          </td>
          <td>
            <assignBtn
              type="room"
              :selected="obj.Room"
              :toAssign="toAssign"
              @assigned="roleAssigned($event)"
              @deployed="roleDeployed($event)"
            ></assignBtn>
          </td>
          <td>
            <button
              class="button is-small"
              @click="showModal(obj)"
              :class="{'is-info': obj.schedule && new Date(obj.schedule.start) >  new Date()}"
            >Schedule</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="modal" :class="{'is-active': modalVisible}" v-if="modal">
      <div class="modal-background"></div>
      <div class="modal-content">
        <div class="content">
          <button
            class="button is-pulled-right is-danger"
            style="margin-bottom:20px"
            @click="deleteSchedule(modal)"
          >Delete all</button>
        </div>
        <scheduleBtn type="room" :selected="modal.Room" :toAssign="toAssign" :done="schedulesDone"></scheduleBtn>
      </div>
      <button class="modal-close is-large" aria-label="close" @click="modalVisible=false"></button>
    </div>
  </div>
</template>

<script>
import roles from "../components/roles.vue";
import assignBtn from "../components/assignBtn.vue";
import scheduleBtn from "../components/scheduleBtn.vue";

export default {
  data() {
    return {
      data: [],
      toAssign: null,
      selected: null,
      modal: null,
      modalVisible: false
    };
  },

  components: { roles, assignBtn, scheduleBtn },
  async created() {
    let result = await this.$root.HttpGet(
      "cities/" + this.$route.params.city + "/rooms"
    );
    this.data = result;
  },
  methods: {
    async deleteSchedule(obj) {
      let result = await this.$root.HttpPost("schedule/delete/room", {
        target: obj.Room,
        city: this.$route.params.city
      });

      this.$root.ShowNotification("Schedules are deleted!", "is-success");
    },
    showModal(obj) {
      this.modalVisible = true;
      this.modal = obj;
    },
    schedulesDone() {
      this.modalVisible = false;
      this.$root.ShowNotification("Schedules are set!", "is-success");
    },
    roleChanged(obj) {
      this.toAssign = obj;
    },
    roleAssigned() {
      this.$root.ShowNotification("Assigning role - done", "is-success");
    },
    roleDeployed() {
      this.$root.ShowNotification("Reboot computers - done", "is-success");
    }
  }
};
</script>

