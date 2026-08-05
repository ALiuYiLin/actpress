<template>
  <section class="VPTeamPageSection">
    <div class="title">
      <div class="title-line" />
      <h2 v-if="$slots.title" class="title-text">
        <slot name="title" />
      </h2>
    </div>
    <p v-if="$slots.lead" class="lead">
      <slot name="lead" />
    </p>
    <div v-if="$slots.members" class="members">
      <slot name="members" />
    </div>
  </section>
</template>