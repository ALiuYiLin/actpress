<template>
  <div class="VPTeamPageTitle">
    <h1 v-if="$slots.title" class="title">
      <slot name="title" />
    </h1>
    <p v-if="$slots.lead" class="lead">
      <slot name="lead" />
    </p>
  </div>
</template>