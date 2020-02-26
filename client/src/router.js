import Vue from "vue";
import Router from "vue-router";
import computers from "./components/computers.vue"
import rooms from "./components/rooms.vue"
import cities from "./components/cities.vue"

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
      path:"/cities",
      name: "cities",
      component: cities
    },
    {
      path:"/cities/:city/rooms/",
      name: "rooms",
      component: rooms
    },
    {
      path:"/cities/:city/rooms/:room/computers",
      name: "computers",
      component: computers
    },
    
    // {
    //   path: "/about",
    //   name: "about",
    //   // route level code-splitting
    //   // this generates a separate chunk (about.[hash].js) for this route
    //   // which is lazy-loaded when the route is visited.
    //   component: () =>
    //     import(/* webpackChunkName: "about" */ "./views/About.vue")
    // }
  ]
});
