<script setup lang="ts">
import { Toaster } from "@/components/ui/sonner";
import "vue-sonner/style.css";
</script>

<template>
  <div class="min-h-screen">
    <RouterView />
    <Toaster
      :theme="'light'"
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
