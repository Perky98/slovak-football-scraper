import { component$ } from "@builder.io/qwik";

export const SkeletonCard = component$(() => {
  return (
    <article class="card skeleton-card">
      <div class="card-top">
        <div class="skel skel-club" />
        <div class="skel skel-date" />
      </div>
      <div class="skel skel-title" />
      <div class="skel skel-title skel-title-short" />
      <div class="skel skel-preview" />
      <div class="skel skel-preview" />
      <div class="skel skel-preview skel-preview-short" />
      <div class="card-bottom">
        <div class="skel skel-badge" />
        <div class="skel skel-badge" />
      </div>
    </article>
  );
});
