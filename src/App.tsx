import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Refrigerator, User, ChevronLeft } from 'lucide-react';
import { cn } from './lib/utils';
import Dashboard from './pages/Dashboard';
import Recipes from './pages/Recipes';
import Inventory from './pages/Inventory';
import Profile from './pages/Profile';
import Nutrition from './pages/Nutrition';

function getMiniProgramTitle(pathname: string, search: string): { title: string; isSubPage: boolean } {
  if (pathname === '/') return { title: '喵膳 MeowMeal', isSubPage: false };
  if (pathname === '/recipes') return { title: '猫饭食谱', isSubPage: false };
  if (pathname.startsWith('/recipes/create')) return { title: '新建专属食谱', isSubPage: true };
  if (pathname.startsWith('/recipes/')) return { title: '食谱营养详情', isSubPage: true };
  if (pathname.startsWith('/inventory')) return { title: '冰箱库存', isSubPage: false };
  if (pathname.startsWith('/profile')) return { title: '我的', isSubPage: false };
  if (pathname.startsWith('/nutrition')) {
    const isSupps = search.includes('supplements');
    return { title: isSupps ? '营养剂库' : '食材营养库', isSubPage: true };
  }
  return { title: '喵膳 MeowMeal', isSubPage: false };
}

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { title, isSubPage } = getMiniProgramTitle(location.pathname, location.search);

  const navItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/recipes', label: '食谱', icon: BookOpen },
    { path: '/inventory', label: '冰箱', icon: Refrigerator },
    { path: '/profile', label: '我的', icon: User },
  ];

  return (
    <div className="h-screen w-full bg-[#EDEDED] text-stone-900 font-sans flex justify-center overflow-hidden">
      <div className="w-full max-w-md h-full flex flex-col bg-[#f9f7f4] shadow-xl relative overflow-hidden">
        {/* 微信小程序顶部导航栏 + 胶囊按钮 */}
        <header className="shrink-0 w-full z-30 bg-white border-b border-stone-100 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
          <div className="h-11 px-3 flex items-center justify-between">
            <div className="w-20 flex items-center">
              {isSubPage ? (
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex items-center text-stone-800 hover:text-stone-950 -ml-1 py-1 pr-2"
                  aria-label="返回"
                >
                  <ChevronLeft size={20} strokeWidth={2.2} />
                </button>
              ) : (
                <span className="text-[11px] font-semibold text-[#FF7B4A] bg-[#FFFAF5] border border-[#FED7AA] px-2 py-0.5 rounded-full">
                  小程序
                </span>
              )}
            </div>

            <h1 className="text-[15px] font-semibold text-stone-900 truncate max-w-[170px] text-center">
              {title}
            </h1>

            {/* 微信原生右上角胶囊按钮 */}
            <div className="w-20 flex justify-end">
              <div className="h-[28px] px-2.5 rounded-full border border-stone-200/90 bg-white/90 flex items-center gap-2 select-none">
                <div className="flex items-center gap-[2.5px]">
                  <span className="w-[3px] h-[3px] rounded-full bg-stone-800" />
                  <span className="w-[4.5px] h-[4.5px] rounded-full bg-stone-800" />
                  <span className="w-[3px] h-[3px] rounded-full bg-stone-800" />
                </div>
                <span className="w-[1px] h-3.5 bg-stone-200" />
                <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-stone-800 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-800" />
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full overflow-y-auto overflow-x-hidden pb-6 relative">
          {children}
        </main>

        <nav className="shrink-0 w-full z-30 bg-white border-t border-stone-100 pb-safe">
          <div className="flex justify-around items-center h-14">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                    isActive ? "text-[#FF7B4A]" : "text-stone-400 hover:text-stone-600"
                  )}
                >
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/recipes/*" element={<Recipes />} />
          <Route path="/inventory/*" element={<Inventory />} />
          <Route path="/profile/*" element={<Profile />} />
          <Route path="/nutrition" element={<Nutrition />} />
        </Routes>
      </Layout>
    </Router>
  );
}
