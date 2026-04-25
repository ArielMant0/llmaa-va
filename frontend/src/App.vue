<template>
  <v-app>
    <router-view />
    <GlobalToolTip/>
  </v-app>
</template>

<script setup>
  import GlobalToolTip from '@/components/GlobalToolTip.vue'
</script>
