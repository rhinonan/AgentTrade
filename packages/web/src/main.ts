import { createApp } from "vue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import Aura from "@primevue/themes/aura";
import App from "./App.vue";
import "tailwindcss";

// PrimeVue needs this class on <html> for dark mode detection at mount time
document.documentElement.classList.add("app-dark");

const app = createApp(App);
app.use(createPinia());
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: ".app-dark",
    },
  },
});
app.mount("#app");
