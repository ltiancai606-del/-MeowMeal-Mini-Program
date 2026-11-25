import { Link } from 'react-router-dom';
import { ChevronRight, Plus } from 'lucide-react';
import { MOCK_CATS, MOCK_RECIPES, MOCK_INVENTORY } from '../data/mock';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const activeRecipe = MOCK_RECIPES.find(r => r.isActive);

  const normalItems = MOCK_INVENTORY.filter(i => i.status === 'normal');
  const expiringItems = MOCK_INVENTORY.filter(i => i.status === 'expiring');
  const expiredItems = MOCK_INVENTORY.filter(i => i.status === 'expired');
  const alertCount = expiringItems.length + expiredItems.length;

  const totalDays = Math.max(1, activeRecipe?.days || 7);
  const executedDays = Math.min(totalDays, activeRecipe?.executedDays || 0);
  const remainingDays = Math.max(0, totalDays - executedDays);
  const progressPct = Math.round((executedDays / totalDays) * 100);

  return (
    <div className="min-h-full bg-transparent flex flex-col">
      {/* Orange Hero Header */}
      <div className="bg-[#FF7B4A] pt-4 pb-12 px-5 shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-white/90 text-sm font-medium mb-0.5">早上好 👋</p>
            <h1 className="text-2xl font-bold text-white tracking-wide leading-tight">喵膳 MeowMeal</h1>
          </div>
          <Link
            to="/profile"
            className="w-11 h-11 bg-orange-100 rounded-full flex items-center justify-center border-2 border-[#ff9e7a] shrink-0 shadow-sm"
          >
            <span className="text-orange-600 font-bold text-sm">主</span>
          </Link>
        </div>
      </div>

      {/* Overlapping Active Recipe Card */}
      <div className="px-4 -mt-8 relative z-10 shrink-0">
        <div className="bg-white rounded-3xl p-4 shadow-md shadow-orange-500/8 border border-stone-100">
          <Link to={activeRecipe ? `/recipes/${activeRecipe.id}` : '/recipes'} className="block">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <span className="text-orange-500 bg-orange-50 p-1.5 rounded-xl">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>
                </span>
                <span className="text-sm font-semibold text-stone-500">执行中食谱</span>
              </div>
              <div className="flex items-center gap-1.5">
                {activeRecipe && (
                  <span className="text-xs font-semibold text-[#FF7B4A] bg-[#FFFAF5] border border-orange-100 px-2 py-0.5 rounded-lg whitespace-nowrap">
                    {activeRecipe.standard === 'AAFCO' ? 'AAFCO' : 'NRC 2006'}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </div>
            </div>

            {activeRecipe ? (
              <>
                <h2 className="text-[17px] font-bold text-stone-800 mb-3 truncate">{activeRecipe.name}</h2>

                <div className="grid grid-cols-3 gap-2 mb-3 tabular-nums">
                  <div className="flex flex-col">
                    <span className="text-xs text-stone-400 mb-0.5">已执行</span>
                    <span className="text-2xl font-extrabold text-orange-500 leading-none">
                      {executedDays}
                      <span className="text-xs font-medium text-stone-400 ml-1">天</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-stone-400 mb-0.5">周期</span>
                    <span className="text-2xl font-extrabold text-stone-800 leading-none">
                      {totalDays}
                      <span className="text-xs font-medium text-stone-400 ml-1">天</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-stone-400 mb-0.5">剩余</span>
                    <span className="text-2xl font-extrabold text-stone-800 leading-none">
                      {remainingDays}
                      <span className="text-xs font-medium text-stone-400 ml-1">天</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex-1 bg-stone-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${progressPct}%` }} />
                  </div>
                  <span className="text-xs text-orange-500 font-bold tabular-nums shrink-0">{progressPct}%</span>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-stone-400 text-sm">
                暂无执行中的食谱，点击前往新建 →
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* Main Content Area — Evenly Fills Remaining Viewport Height */}
      <div className="flex-1 flex flex-col justify-between gap-3.5 px-4 pt-3.5 pb-4">
        {/* Inventory Section */}
        <section className="flex-1 bg-white rounded-3xl p-4 shadow-sm border border-stone-100 flex flex-col justify-center">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold flex items-center gap-2 text-stone-800">
              <span className="bg-blue-50 text-blue-500 p-1.5 rounded-xl">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 6v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6M4 6l4-4h8l4 4M10 10v6M14 10v6"></path></svg>
              </span>
              冰箱库存
            </h2>
            <Link to="/inventory" className="flex items-center gap-1.5 text-stone-400 hover:text-stone-600">
              {alertCount > 0 && (
                <span className="text-xs font-semibold text-amber-600">⚠ {alertCount}项需处理</span>
              )}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3 tabular-nums">
            <Link to="/inventory" className="bg-[#FFFAF5] rounded-2xl py-3 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-[#FF7B4A] leading-tight">{normalItems.length}</span>
              <span className="text-xs text-[#FF7B4A]/85 font-medium mt-0.5">正常</span>
            </Link>
            <Link to="/inventory" className="bg-amber-50 rounded-2xl py-3 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-amber-500 leading-tight">{expiringItems.length}</span>
              <span className="text-xs text-amber-600/85 font-medium mt-0.5">临期</span>
            </Link>
            <Link to="/inventory" className="bg-rose-50 rounded-2xl py-3 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-rose-500 leading-tight">{expiredItems.length}</span>
              <span className="text-xs text-rose-600/85 font-medium mt-0.5">已过期</span>
            </Link>
          </div>
        </section>

        {/* My Pets Section */}
        <section className="flex-1 bg-white rounded-3xl p-4 shadow-sm border border-stone-100 flex flex-col justify-center">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold flex items-center gap-2 text-stone-800">
              <span className="bg-stone-100 text-stone-500 p-1.5 rounded-xl">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.48C21 17.9 16.97 21 12 21s-9-3.1-9-7.52c0-1.24.43-2.41 1-3.48 0 0-1.82-6.42-.42-7 1.39-.58 4.64.26 6.42 2.26.65-.17 1.33-.26 2-.26z"></path><path d="M9 14v.01"></path><path d="M15 14v.01"></path></svg>
              </span>
              我的猫咪
            </h2>
            <Link to="/profile/cats/new" className="text-xs text-orange-500 hover:text-orange-600 font-semibold flex items-center gap-0.5">
              <Plus className="w-3.5 h-3.5" />
              添加
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-0.5 scrollbar-none">
            {MOCK_CATS.map(cat => (
              <Link
                key={cat.id}
                to="/profile"
                className="shrink-0 bg-stone-50 rounded-2xl px-3.5 py-2.5 flex items-center gap-3 border border-stone-100 hover:border-orange-200 transition-colors"
              >
                <div className="w-11 h-11 rounded-2xl bg-orange-100 flex items-center justify-center overflow-hidden shrink-0">
                  {cat.avatarUrl ? (
                    <img src={cat.avatarUrl} alt={cat.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">🐱</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-stone-800 text-[15px]">{cat.name}</h3>
                    <span className={cn(
                      "text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap",
                      cat.neutered ? "bg-emerald-100 text-emerald-600" : "bg-stone-200 text-stone-500"
                    )}>
                      {cat.neutered ? '已绝育' : '未绝育'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5 tabular-nums">{cat.weight}kg · {cat.age}岁</p>
                </div>
              </Link>
            ))}

            <Link
              to="/profile/cats/new"
              className="shrink-0 rounded-2xl px-4 py-2.5 flex items-center gap-1.5 border-2 border-dashed border-orange-200 bg-orange-50/50 hover:bg-orange-50 transition-colors text-orange-500 text-sm font-semibold whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              添加猫咪
            </Link>
          </div>
        </section>

        {/* Nutrition Info Cards — Side-by-Side 2-Column Grid */}
        <section className="grid grid-cols-2 gap-3 shrink-0">
          <Link
            to="/nutrition?type=ingredients"
            className="bg-white rounded-3xl p-4 shadow-sm border border-stone-100 flex items-center gap-3 hover:border-orange-200 transition-colors"
          >
            <div className="w-11 h-11 rounded-2xl bg-orange-50 text-[#FF7B4A] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-stone-800 truncate">食材营养库</p>
              <p className="text-xs text-stone-400 truncate mt-0.5">176 项肉类/内脏</p>
            </div>
          </Link>

          <Link
            to="/nutrition?type=supplements"
            className="bg-white rounded-3xl p-4 shadow-sm border border-stone-100 flex items-center gap-3 hover:border-orange-200 transition-colors"
          >
            <div className="w-11 h-11 rounded-2xl bg-orange-50 text-[#FF7B4A] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3a4 4 0 0 0 4-4V6a2 2 0 0 1 4 0v1.5a2.5 2.5 0 0 0 5 0V6a2 2 0 0 1 4 0v7a1 1 0 0 1-1 1h-3a4 4 0 0 0-4 4v1a2 2 0 0 1-4 0v-1h3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-8M7 19h10"></path></svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-stone-800 truncate">营养剂库</p>
              <p className="text-xs text-stone-400 truncate mt-0.5">10 款常见补剂</p>
            </div>
          </Link>
        </section>
      </div>
    </div>
  );
}
