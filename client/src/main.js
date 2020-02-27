import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import "bulma/css/bulma.css";
import "material-icons/iconfont/material-icons.scss";
import "bulma-tooltip/dist/css/bulma-tooltip.min.css";

import mixin from "./mixin.js";

Vue.config.productionTip = false;

new Vue({
  mixins: [mixin],
  router,
  store,
  render: h => h(App)
}).$mount("#app");
