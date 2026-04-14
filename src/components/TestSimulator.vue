<template>
  <div class="card">
    <h1>محاكي الأخطاء (Test Simulator)</h1>
    <p>استخدم هذه الأزرار لإرسال أخطاء تجريبية إلى النظام.</p>

    <div style="margin: 30px 0;">
      <button @click="triggerReferenceError" class="btn-error">خطأ مرجع (ReferenceError)</button>
      <br>
      <button @click="triggerAsyncError" class="btn-async">خطأ غير متزامن (Async Error)</button>
      <br>
      <br>
      <button @click="triggerRangeError" class="btn-range">خطأ في النطاق (RangeError)</button>
      <hr style="margin: 20px 0; border: 0; border-top: 1px solid var(--border-color);">
      <div style="text-align: center;">
        <h3>Network Tests</h3>
        <button @click="testFetchSuccess" style="background: #10b981;">Fetch Success (200)</button>
        <button @click="testFetchError" style="background: #ef4444;">Fetch Error (404)</button>
        <button @click="testXHR" style="background: #3b82f6;">XHR Request</button>
      </div>
      <hr style="margin: 20px 0; border: 0; border-top: 1px solid var(--border-color);">
      <div style="text-align: center;">
        <h3>Console Tests</h3>
        <button @click="consoleLog" style="background: #64748b;">Log</button>
        <button @click="consoleInfo" style="background: #0ea5e9;">Info</button>
        <button @click="consoleWarn" style="background: #eab308;">Warn</button>
      </div>

      <div class="status" :style="{ color: statusColor }">{{ statusMessage }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TestSimulator',
  data() {
    return {
      statusMessage: 'جاهز للاختبار...',
      statusColor: '#666'
    }
  },
  mounted() {
    // Initialize the Tracker if available globally
    /* 
    if (window.Tracker) {
      window.Tracker.init({
        trackerUrl: 'http://127.0.0.1:3535',
        project: 'Test Simulator',
        userId: 'Tester-' + Math.floor(Math.random() * 1000)
      });
    } else {
      console.warn('Tracker is not defined. Ensure client_sdk.js is loaded.');
    }
    */
  },
  methods: {
    showStatus(msg) {
      this.statusMessage = msg;
      this.statusColor = 'green';
      setTimeout(() => {
        this.statusMessage = "جاهز للاختبار...";
        this.statusColor = '#666';
      }, 3000);
    },
    triggerReferenceError() {
      try {
        // This variable doesn't exist
        console.log(nonExistentVariable);
      } catch (e) {
        // While the tracker catches global errors, we can also manually capture
        if (window.Tracker) window.Tracker.captureException(e);
        this.showStatus("تم إرسال ReferenceError!");
        throw e; // Re-throw to ensure it hits console
      }
    },
    async triggerAsyncError() {
      setTimeout(() => {
        const err = new Error("فشل في تحميل البيانات (Async)");
        if (window.Tracker) window.Tracker.captureException(err);
        this.showStatus("تم إرسال Async Error!");
        console.error(err);
      }, 500);
    },
    triggerRangeError() {
      try {
        const arr = new Array(-1);
      } catch (e) {
        if (window.Tracker) window.Tracker.captureException(e);
        this.showStatus("تم إرسال RangeError!");
        console.error(e);
      }
    },
    async testFetchSuccess() {
      this.showStatus("جاري ارسال Fetch...");
      try {
        await fetch('https://jsonplaceholder.typicode.com/todos/1');
        console.log("Fetch Success");
        this.showStatus("تم ارسال Fetch بنجاح!");
      } catch (e) {
        console.error(e);
      }
    },
    async testFetchError() {
      this.showStatus("جاري ارسال Fetch (404)...");
      try {
        await fetch('https://jsonplaceholder.typicode.com/invalid-url-for-test');
      } catch (e) {
        console.error("Fetch Error caught", e);
      }
      setTimeout(() => this.showStatus("تم اختبار Fetch 404"), 1000);
    },
    testXHR() {
      this.showStatus("جاري ارسال XHR...");
      const xhr = new XMLHttpRequest();
      xhr.open('GET', 'https://jsonplaceholder.typicode.com/users/1');
      xhr.onload = () => this.showStatus("تم ارسال XHR بنجاح!");
      xhr.send();
    },
    consoleLog() {
      console.log('Test Log Message');
    },
    consoleInfo() {
      console.info('Test Info Message');
    },
    consoleWarn() {
      console.warn('Test Warning Message');
    }
  }
}
</script>

<style scoped>
.card {
  background: var(--bg-card);
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
  border: 1px solid var(--border-color);
}

h1 {
  color: var(--text-main);
}

button {
  padding: 12px 24px;
  margin: 10px;
  font-size: 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.1s;
  color: white;
  font-weight: bold;
}

button:active {
  transform: scale(0.98);
}

.btn-error {
  background: #ef4444;
}

.btn-async {
  background: #f59e0b;
}

.btn-range {
  background: #8b5cf6;
}

.status {
  margin-top: 20px;
  color: var(--text-muted);
  font-weight: bold;
}
</style>
