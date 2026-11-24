const storage = require('./utils/storage');

App({
  globalData: {
    userInfo: null,
  },
  onLaunch() {
    storage.ensureInitialized();
  },
});
