<script setup lang="ts">
import { computed } from "vue";
import { useColorMode } from "@vueuse/core";
import { Toaster } from "@/components/ui/sonner";
import "vue-sonner/style.css";

const mode = useColorMode();
const toasterTheme = computed(() => (mode.value === "dark" ? "dark" : "light"));
</script>

<template>
  <div class="min-h-screen">
    <RouterView />
    <Toaster
      :theme="toasterTheme"
      :richColors="true"
      :expand="true"
      :position="'bottom-right'"
      :toastOptions="{
        duration: 4000,
        style: {
          fontSize: '14px',
        },
      }"
    />
  </div>
</template>

<style scoped></style>
