<template>
  <div id="app">
    <section class="section">
      <div class="container">
        <router-view />
        <div class="notification-pop">
          <div id="alert" class="notification" style="display: none">
            <button class="delete"></button>
            {{$root.notificationText}}
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style>
[v-cloak] {
  display: none;
}

.loader {
  color: #ffffff;
  font-size: 20px;
  width: 1em;
  height: 1em;
  border-radius: 50%;
  position: relative;
  text-indent: -9999em;

  border-left-color: rgb(16, 175, 154) !important;
  border-bottom-color: rgb(16, 175, 154) !important;
  border-right-color: transparent !important;
  border-top-color: transparent !important;
}

.notification-pop {
  position: fixed !important;
  bottom: 50px !important;
  width: 400px !important;
  left: 50% !important;
  margin-left: -200px !important;
  z-index: 9999 !important;
}
</style>


<script>
export default {
  created() {
    document.addEventListener("DOMContentLoaded", () => {
      (document.querySelectorAll(".notification-pop .delete") || []).forEach(
        $delete => {
          let $notification = $delete.parentNode;
          $notification.addEventListener("click", () => {
            $notification.setAttribute("style", "display: none");
          });
        }
      );
    });
  }
};
</script>
