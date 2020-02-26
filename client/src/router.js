import Vue from "vue";
import Router from "vue-router";
import computers from "./views/computers.vue";
import rooms from "./views/rooms.vue";
import cities from "./views/cities.vue";

Vue.use(Router);

export default new Router({
  mode: "history",
  base: process.env.BASE_URL,
  routes: [
    {
      path: "/",
      name: "cities",
      component: cities
    },
    {
      path: "/cities",
      name: "cities",
      component: cities
    },
    {
      path: "/cities/:city/rooms/",
      name: "rooms",
      component: rooms
    },
    {
      path: "/cities/:city/rooms/:room/computers",
      name: "computers",
      component: computers
    }
  ]
});
