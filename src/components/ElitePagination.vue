<template>
  <div class="elite-pagination-wrapper" v-if="totalPages > 1">
    <button class="elite-page-btn nav-btn" :disabled="currentPage === 1" @click="change(currentPage - 1)">
      <i :class="$i18n.locale === 'ar' ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-left'"></i>
    </button>
    
    <div class="elite-page-numbers">
      <button 
        v-for="(p, index) in visiblePages" 
        :key="index" 
        class="elite-page-btn" 
        :class="{ active: p === currentPage, ellipsis: p === '...' }"
        :disabled="p === '...'"
        @click="p !== '...' && change(p)"
      >
        {{ p }}
      </button>
    </div>

    <button class="elite-page-btn nav-btn" :disabled="currentPage === totalPages" @click="change(currentPage + 1)">
      <i :class="$i18n.locale === 'ar' ? 'fa-solid fa-chevron-left' : 'fa-solid fa-chevron-right'"></i>
    </button>
  </div>
</template>

<script>
export default {
  name: 'ElitePagination',
  props: {
    totalItems: { type: Number, required: true },
    itemsPerPage: { type: Number, default: 10 },
    currentPage: { type: Number, required: true }
  },
  computed: {
    totalPages() {
      return Math.ceil(this.totalItems / this.itemsPerPage) || 1;
    },
    visiblePages() {
      const current = this.currentPage;
      const last = this.totalPages;
      const delta = 1;
      const left = current - delta;
      const right = current + delta + 1;
      const range = [];
      const rangeWithDots = [];
      let l;

      for (let i = 1; i <= last; i++) {
        if (i == 1 || i == last || i >= left && i < right) {
          range.push(i);
        }
      }

      for (let i of range) {
        if (l) {
          if (i - l === 2) {
            rangeWithDots.push(l + 1);
          } else if (i - l !== 1) {
            rangeWithDots.push('...');
          }
        }
        rangeWithDots.push(i);
        l = i;
      }
      return rangeWithDots;
    }
  },
  methods: {
    change(page) {
      this.$emit('update:currentPage', page);
    }
  }
}
</script>
