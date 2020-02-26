import axios from "axios";
export default {
  data() {
    return {
      baseUrl: "http://10.16.106.33:2500/",
      notificationText: ""
    };
  },

  created() {},
  methods: {
    ShowNotification(text, css) {
      this.notificationText = text;

      let alert = document.getElementById("alert");
      alert.setAttribute("style", "display: block");
      alert.className = "notification";
      if (css && css != "") {
        alert.classList.add(css);
      } else {
        alert.classList.add("is-default");
      }
    },
    HttpGet(path) {
      return new Promise((resolve, reject) => {
        axios.get(this.baseUrl + path).then(result => {
          if (result.status == 200) {
            resolve(result.data);
          } else {
            console.log(result.statusText);
            reject();
          }
        });
      });
    },

    HttpPost(path, data) {
      return new Promise((resolve, reject) => {
        axios.post(this.baseUrl + path, data).then(result => {
          if (result.status == 200) {
            resolve(result.data);
          } else {
            console.log(result.statusText);
            reject();
          }
        });
      });
    },

    GetDate(date) {
      if (date) {
        return new Date(date);
      }

      return null;
    },

    GetDateStr(date) {
      if (date) {
        date = new Date(date);
        return date.toLocaleString();
      }

      return "";
    },

    GetAspDateStr(date) {
      if (date) {
        let newDate = new Date(parseInt(date.match(/-?\d+/), 10));
        return newDate.toLocaleString();
      }

      return "";
    },

    GetAspDate(date) {
      if (date) {
        let newDate = new Date(parseInt(date.match(/-?\d+/), 10));
        return newDate;
      }

      return "";
    },

    GetTimeBetweenDates(dt2, dt1) {
      if (dt1 && dt2) {
        var diff = (dt2.getTime() - dt1.getTime()) / 1000;
        diff /= 60;
        return Math.abs(Math.round(diff));
      }
    }
  }
};
