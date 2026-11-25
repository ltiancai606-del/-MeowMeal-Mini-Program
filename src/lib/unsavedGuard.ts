// 轻量级全局未保存食谱拦截守卫（供顶部导航栏、底部 Tab 与页面返回按钮共享）

interface UnsavedGuardState {
  active: boolean;
  message: string;
}

const guardState: UnsavedGuardState = {
  active: false,
  message: '未保存食谱，确认返回？',
};

export function setUnsavedRecipeGuard(active: boolean, message = '未保存食谱，确认返回？') {
  guardState.active = active;
  guardState.message = message;
}

export function getUnsavedRecipeGuard(): UnsavedGuardState {
  return { ...guardState };
}
