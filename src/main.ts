import { createApp } from "vue";
import { getCurrentWindow } from "./bridge/window";
import App from "./App.vue";
import SettingsApp from "./settings/SettingsApp.vue";
import ToastApp from "./toast/ToastApp.vue";
import "./styles/global.css";

const label = getCurrentWindow().label;
const root =
  label === "settings" ? SettingsApp : label === "toast" ? ToastApp : App;
createApp(root).mount("#app");
