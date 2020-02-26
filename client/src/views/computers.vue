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
        <li>
          <router-link :to="{name: 'rooms', city: {city: $route.params.city}}">Rooms</router-link>
        </li>
        <li class="is-active">
          <a>{{$route.params.room}}</a>
        </li>
      </ul>
    </nav>

    <roles @changed="RoleChanged($event)"></roles>
    <table class="table is-fullwidth is-narrow">
      <thead>
        <tr>
          <th>Computer name</th>
          <th>Role</th>
          <th>Current step</th>
          <th>Total steps</th>
          <th>% Completed</th>
          <th>Errors</th>
          <th>Reboot success</th>
          <th>Last reboot</th>
          <th>Deploy started</th>
          <th>Duration</th>
          <th>Initiating</th>
          <th>Deploy</th>
          <th>Schedule</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(obj, index) in data" :key="index">
          <td>
            <div class="tooltip" :data-tooltip="obj.MacAddress">{{obj.Description}}</div>
          </td>
          <td :class="{'has-text-grey-light':IsIniting(obj)}">{{obj.Role}}</td>
          <td
            :class="{'has-text-link' : obj.CurrentStep != obj.TotalSteps, 'has-text-grey-light':IsIniting(obj) }"
          >{{obj.CurrentStep}}</td>
          <td :class="{'has-text-grey-light':IsIniting(obj)}">{{obj.TotalSteps}}</td>
          <td :class="{'has-text-grey-light':IsIniting(obj)}">
            <span class="has-text-link" v-if="obj.PercentComplete != 100">{{obj.PercentComplete}}</span>
            <span class="has-text-success" v-else>
              <i class="material-icons" aria-hidden="true">check</i>
            </span>
          </td>
          <td
            :class="{'has-text-danger' : obj.Errors != 0, 'has-text-grey-light':IsIniting(obj)}"
          >{{obj.Errors}}</td>
          <td>
            <span
              class="icon is-small has-text-success"
              v-if="obj.deployResult && obj.deployResult.success"
            >
              <i class="material-icons" aria-hidden="true">check</i>
            </span>
            <span
              class="icon is-small has-text-danger"
              v-if="obj.deployResult && !obj.deployResult.success && !obj.deployResult.running"
            >
              <i class="material-icons" aria-hidden="true">error</i>
            </span>
            <span class="loader" v-if="obj.deployResult && obj.deployResult.running"></span>
          </td>
          <td
            :class="{'has-text-grey-light':IsIniting(obj)}"
          >{{obj.deployResult && obj.deployResult.started ? $root.GetDateStr(obj.deployResult.started) : ""}}</td>
          <td
            :class="{'has-text-grey-light':IsIniting(obj)}"
          >{{ $root.GetAspDateStr(obj.StartTime)}}</td>
          <td :class="{'has-text-grey-light':IsIniting(obj)}">
            <span
              v-if="obj.StartTime && obj.LastTime"
            >{{ $root.GetTimeBetweenDates($root.GetAspDate(obj.StartTime), $root.GetAspDate(obj.LastTime))}} min</span>
          </td>
          <td>
            <span v-if="IsIniting(obj)">
              <span class="loader"></span>
            </span>
          </td>
          <td>
            <assignBtn
              :disabled="obj.PercentComplete && obj.PercentComplete != 100"
              type="computer"
              :selected="obj.Description"
              :toAssign="toAssign"
              @assigned="RoleAssigned($event)"
              @deployed="RoleDeployed($event)"
            ></assignBtn>
          </td>
          <td>
            <button
              class="button is-small"
              @click="ShowModal(obj)"
              :class="{'is-info': obj.schedule && new Date(obj.schedule.start) >  new Date()}"
            >Schedule</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="modal" :class="{'is-active': showModal}" v-if="modal">
      <div class="modal-background"></div>
      <div class="modal-content">
        <div
          class="notification is-info"
          v-if="modal.schedule && new Date(modal.schedule.start) > new Date()"
        >
          <h1 class="title">Current schedule</h1>Start:
          <b>{{new Date(modal.schedule.start).toLocaleString()}}</b>
          Role:
          <b>{{modal.schedule.roleName}}</b>
          <button
            class="button is-pulled-right is-danger"
            @click="DeleteSchedule(modal.schedule)"
          >Delete</button>
        </div>
        <scheduleBtn
          type="computer"
          :selected="modal.Description"
          :toAssign="toAssign"
          @done="SetScheduleDone($event)"
        ></scheduleBtn>
      </div>
      <button class="modal-close is-large" aria-label="close" @click="showModal=false"></button>
    </div>
  </div>
</template>

<script>
import roles from "../components/roles.vue";
import assignBtn from "../components/assignBtn.vue";
import scheduleBtn from "../components/scheduleBtn.vue";

export default {
  components: { roles, assignBtn, scheduleBtn },
  data() {
    return {
      data: [],
      progress: [],
      schedules: [],
      toAssign: null,
      selected: null,
      modal: null,
      showModal: false
    };
  },
  async created() {
    await this.GetComputers();
    this.GetProgress();
    this.GetRebootProgress();
    this.GetSchedules();

    setInterval(async () => {
      this.GetProgress();
      this.GetRebootProgress();
      //this.GetSchedules();
    }, 5000);
  },
  methods: {
    async SetScheduleDone(schedules) {
      this.showModal = false;
      this.$root.ShowNotification("Saved!", "is-success");
      this.GetSchedules(schedules);
    },
    async DeleteSchedule(schedule) {
      let result = await this.$root.HttpPost("schedule/delete/computer", {
        target: schedule.computer
      });

      let computer = this.data.find(x => x.Description === schedule.computer);
      this.$set(computer, "schedule", null);
    },
    async GetComputers() {
      let result = await this.$root.HttpGet(
        "cities/" +
          this.$route.params.city +
          "/rooms/" +
          this.$route.params.room +
          "/computers"
      );
      this.data = result;
    },

    async GetProgress() {
      let result = await this.$root.HttpGet(
        "cities/" +
          this.$route.params.city +
          "/rooms/" +
          this.$route.params.room +
          "/computers/progress"
      );

      for (let progress of result) {
        let computer = this.data.find(x => x.Description === progress.Name);

        if (computer) {
          let toAdd = { ...computer, ...progress };
          if (JSON.stringify(toAdd) != JSON.stringify(computer)) {
            let index = this.data.indexOf(computer);
            this.$set(this.data, index, toAdd);
          }
        }
      }
    },
    async GetRebootProgress() {
      let result = await this.$root.HttpGet(
        "cities/" +
          this.$route.params.city +
          "/rooms/" +
          this.$route.params.room +
          "/computers/rebootprogress"
      );

      for (let rebootResult of result) {
        let computer = this.data.find(
          x => x.Description === rebootResult.computer
        );

        if (
          (computer &&
            computer.deployResult &&
            rebootResult.deployResult.success !=
              computer.deployResult.success &&
            rebootResult.deployResult.running !=
              computer.deployResult.running) ||
          (computer && !computer.deployResult)
        ) {
          let index = this.data.indexOf(computer);
          this.$set(this.data, index, { ...computer, ...rebootResult });
        }
      }
    },
    async GetSchedules(arr) {
      if (!arr) {
        arr = await this.$root.HttpGet(
          "cities/" +
            this.$route.params.city +
            "/rooms/" +
            this.$route.params.room +
            "/computers/schedules"
        );
      }

      for (let computer of this.data) {
        let schedule = arr.find(x => x.computer === computer.Description);
        this.$set(computer, "schedule", schedule);
      }
    },
    RoleChanged(obj) {
      this.toAssign = obj;
    },
    async RoleAssigned() {
      await this.GetComputers();
      await this.GetProgress();
      await this.GetRebootProgress();
    },
    RoleDeployed(result) {
      for (let deployResult of result) {
        let computer = this.data.find(
          x => x.Description === deployResult.computer
        );

        if (computer) {
          let index = this.data.indexOf(computer);
          this.$set(this.data, index, { ...computer, ...deployResult });
        }
      }
    },
    IsIniting(obj) {
      if (
        obj.deployResult &&
        obj.deployResult.started &&
        this.$root.GetDate(obj.deployResult.started) != "" &&
        obj.LastTime
      ) {
        return (
          this.$root.GetAspDate(obj.StartTime) <=
          this.$root.GetDate(obj.deployResult.started)
        );
      }

      return false;
    },
    ShowModal(computer) {
      this.showModal = true;
      this.modal = computer;
    }
  }
};
</script>

