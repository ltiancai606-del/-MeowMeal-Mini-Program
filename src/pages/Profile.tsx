import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { User, Plus, Save, Trash2, Pencil } from 'lucide-react';
import React, { useState, useRef } from 'react';
import { MOCK_CATS, MOCK_USER, MOCK_RECIPES, MOCK_INVENTORY, saveCats, saveUser, getDaysUsed, CatProfile as CatItem } from '../data/mock';
import { cn } from '../lib/utils';

function ProfileHome() {
  const [cats, setCats] = useState<CatItem[]>(() => [...MOCK_CATS]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(MOCK_CATS.length > 0 ? MOCK_CATS[0].id : null);
  const [catPendingDelete, setCatPendingDelete] = useState<CatItem | null>(null);

  const selectedCat = cats.find(c => c.id === selectedCatId) || cats[0] || null;

  const totalMadeKg = (
    MOCK_RECIPES.reduce(
      (sum, r) => sum + (r.ingredients || []).reduce((s, ing) => s + (Number(ing.weight) || 0), 0),
      0
    ) / 1000
  ).toFixed(1);

  const totalSpent = Math.round(
    MOCK_INVENTORY.reduce((sum, item) => sum + (Number(item.price) || 0), 0)
  );

  const handleConfirmDeleteCat = () => {
    if (!catPendingDelete) return;
    const idx = MOCK_CATS.findIndex(c => c.id === catPendingDelete.id);
    if (idx !== -1) {
      MOCK_CATS.splice(idx, 1);
      saveCats();
    }
    const nextCats = [...MOCK_CATS];
    setCats(nextCats);
    setSelectedCatId(nextCats.length > 0 ? nextCats[0].id : null);
    setCatPendingDelete(null);
  };

  return (
    <div className="min-h-full bg-transparent flex flex-col">
      {/* Orange User Header */}
      <div className="bg-[#FF7B4A] py-5 px-5 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-white/30 shrink-0">
              {MOCK_USER.avatarUrl ? (
                <img src={MOCK_USER.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">😊</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white truncate">{MOCK_USER.nickname}</h2>
                <span className="text-xs font-medium text-amber-200 whitespace-nowrap">⭐ 科学喂养达人</span>
              </div>
              <p className="text-[13px] text-white/90 mt-1 tabular-nums">已养 {cats.length} 只猫 · 使用喵膳 {getDaysUsed(MOCK_USER.firstUseDate)} 天</p>
            </div>
          </div>

          <Link
            to="/profile/settings"
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0 hover:bg-white/30 transition-colors"
            aria-label="编辑资料"
          >
            <Pencil className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Full-Viewport Balanced Body */}
      <div className="flex-1 flex flex-col justify-between gap-3.5 px-4 pt-3.5 pb-4">
        {/* Cat Profiles Card */}
        <section className="flex-[1.3] bg-white rounded-3xl p-4 shadow-sm border border-stone-100 flex flex-col justify-center">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-bold text-stone-800 flex items-center gap-2">
              <span>🐾</span>
              猫咪档案
            </h3>
            <Link to="/profile/cats/new" className="text-orange-500 text-xs font-semibold flex items-center gap-0.5">
              <Plus className="w-4 h-4" /> 添加猫咪
            </Link>
          </div>

          {cats.length > 0 ? (
            <>
              <div className="flex gap-2 mb-3.5 overflow-x-auto pb-0.5">
                {cats.map(cat => {
                  const isSelected = selectedCat?.id === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCatId(cat.id)}
                      className={cn(
                        "px-3.5 py-2 rounded-2xl flex items-center gap-1.5 text-sm font-semibold transition-all shrink-0",
                        isSelected
                          ? "bg-white border-2 border-orange-500 text-orange-600 shadow-sm"
                          : "bg-stone-50 border-2 border-transparent text-stone-500 hover:bg-stone-100"
                      )}
                    >
                      {cat.avatarUrl ? (
                        <img src={cat.avatarUrl} alt={cat.name} className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <span>🐱</span>
                      )}
                      {cat.name}
                    </button>
                  );
                })}
                <Link
                  to="/profile/cats/new"
                  className="px-3.5 py-2 rounded-2xl flex items-center justify-center text-orange-400 border-2 border-dashed border-orange-200 bg-orange-50/50 hover:bg-orange-50 transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Link>
              </div>

              {selectedCat && (
                <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-100">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
                        {selectedCat.avatarUrl ? (
                          <img src={selectedCat.avatarUrl} alt={selectedCat.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">🐱</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-stone-800 text-[17px] truncate">{selectedCat.name}</h4>
                          <span className={cn(
                            "text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap",
                            selectedCat.neutered ? "bg-emerald-100 text-emerald-600" : "bg-stone-200 text-stone-500"
                          )}>
                            {selectedCat.neutered ? '已绝育' : '未绝育'}
                          </span>
                        </div>
                        <p className="text-[13px] text-stone-500 mt-0.5 tabular-nums">
                          {selectedCat.gender === 'male' ? '公猫' : '母猫'} · {selectedCat.age || '?'}岁 · <span className="text-orange-600 font-bold">{selectedCat.weight || '?'}kg</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        to={`/profile/cats/${selectedCat.id}`}
                        className="px-3 py-1.5 bg-white border border-stone-200 text-orange-500 rounded-xl text-xs font-semibold hover:bg-stone-50 flex items-center gap-1"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        编辑
                      </Link>
                      <button
                        type="button"
                        onClick={() => setCatPendingDelete(selectedCat)}
                        className="px-3 py-1.5 bg-rose-50 border border-rose-100 text-rose-500 rounded-xl text-xs font-semibold hover:bg-rose-100 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        删除
                      </button>
                    </div>
                  </div>

                  {/* 2-Column Traits */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-stone-200/70">
                    <div>
                      <h5 className="text-xs text-stone-500 font-medium mb-1.5">⚠️ 过敏忌口</h5>
                      {selectedCat.allergies && selectedCat.allergies.length > 0 ? (
                        <div className="flex gap-1.5 flex-wrap">
                          {selectedCat.allergies.map((item, idx) => (
                            <span key={idx} className="bg-rose-50 text-rose-500 text-xs px-2.5 py-0.5 rounded-full font-medium">
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-stone-400">无已知过敏原</p>
                      )}
                    </div>

                    <div>
                      <h5 className="text-xs text-stone-500 font-medium mb-1.5">💊 健康需求</h5>
                      {selectedCat.dietNeeds && selectedCat.dietNeeds.length > 0 ? (
                        <div className="flex gap-1.5 flex-wrap">
                          {selectedCat.dietNeeds.map((item, idx) => (
                            <span key={idx} className="bg-blue-50 text-blue-500 text-xs px-2.5 py-0.5 rounded-full font-medium">
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-stone-400">常规均衡养护</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-stone-50 rounded-2xl p-5 text-center border border-dashed border-stone-200">
              <p className="text-sm text-stone-400 mb-3">还没有添加猫咪档案</p>
              <Link
                to="/profile/cats/new"
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#FF7B4A] text-white text-sm font-semibold"
              >
                <Plus className="w-4 h-4" /> 添加第一只猫咪
              </Link>
            </div>
          )}
        </section>

        {/* Stats Section */}
        <section className="flex-1 bg-white rounded-3xl p-4 shadow-sm border border-stone-100 flex flex-col justify-center">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-bold text-stone-800 flex items-center gap-2">
              <span>📊</span>
              使用统计
            </h3>
            <span className="text-xs text-stone-400">实时同步</span>
          </div>
          <div className="grid grid-cols-3 gap-3 tabular-nums">
            <div className="bg-[#FFFAF5] rounded-2xl py-3 flex flex-col items-center justify-center border border-orange-50">
              <span className="text-xl font-extrabold text-orange-500 leading-tight">{MOCK_RECIPES.length}<span className="text-xs font-medium text-orange-400 ml-0.5">份</span></span>
              <span className="text-xs text-stone-500 mt-1">专属食谱</span>
            </div>
            <div className="bg-blue-50/60 rounded-2xl py-3 flex flex-col items-center justify-center border border-blue-50">
              <span className="text-xl font-extrabold text-blue-500 leading-tight">{totalMadeKg}<span className="text-xs font-medium text-blue-400 ml-0.5">kg</span></span>
              <span className="text-xs text-stone-500 mt-1">累计制作</span>
            </div>
            <div className="bg-purple-50/60 rounded-2xl py-3 flex flex-col items-center justify-center border border-purple-50">
              <span className="text-xl font-extrabold text-purple-600 leading-tight"><span className="text-xs font-medium text-purple-400 mr-0.5">¥</span>{totalSpent}</span>
              <span className="text-xs text-stone-500 mt-1">库存投入</span>
            </div>
          </div>
        </section>

        {/* 2-Column Library Shortcuts + Standard Strip */}
        <section className="space-y-3 shrink-0">
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/nutrition?type=ingredients"
              className="bg-white rounded-3xl p-4 shadow-sm border border-stone-100 flex items-center gap-3 hover:border-orange-200 transition-colors"
            >
              <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center text-xl shrink-0">🥩</div>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-stone-800 truncate">食材营养库</p>
                <p className="text-xs text-stone-400 truncate mt-0.5">176 项分级数据</p>
              </div>
            </Link>
            <Link
              to="/nutrition?type=supplements"
              className="bg-white rounded-3xl p-4 shadow-sm border border-stone-100 flex items-center gap-3 hover:border-orange-200 transition-colors"
            >
              <div className="w-11 h-11 rounded-2xl bg-[#FFFAF5] flex items-center justify-center text-xl shrink-0">💊</div>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-stone-800 truncate">营养剂库</p>
                <p className="text-xs text-stone-400 truncate mt-0.5">10 款标准补剂</p>
              </div>
            </Link>
          </div>

          <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-stone-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">⚖️</span>
              <span className="text-[13px] text-stone-700 font-medium truncate">内置 NRC 2006 + AAFCO 2016/2026 标准</span>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 whitespace-nowrap shrink-0">
              已对齐
            </span>
          </div>
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      {catPendingDelete && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-5"
          onClick={() => setCatPendingDelete(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-base font-bold text-stone-800 mb-2">删除猫咪档案</h4>
            <p className="text-sm text-stone-500 leading-relaxed mb-5">
              确认删除「{catPendingDelete.name}」的档案吗？删除后将无法自动带入该猫咪的过敏原与体型设置。
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setCatPendingDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-sm font-semibold"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCat}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CatProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const cat = isNew ? null : MOCK_CATS.find(c => c.id === id);

  const [avatar, setAvatar] = useState(cat?.avatarUrl || '');
  const [name, setName] = useState(cat?.name || '');
  const [age, setAge] = useState(cat?.age?.toString() || '');
  const [weight, setWeight] = useState(cat?.weight?.toString() || '');
  const [gender, setGender] = useState<'male' | 'female'>(cat?.gender || 'male');
  const [neutered, setNeutered] = useState<boolean>(cat?.neutered ?? true);
  const [allergies, setAllergies] = useState(cat?.allergies?.join(', ') || '');
  const [dietNeeds, setDietNeeds] = useState(cat?.dietNeeds?.join(', ') || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      setErrorMsg('请输入猫咪姓名');
      return;
    }
    setErrorMsg('');

    const newCat: CatItem = {
      id: isNew ? `c${Date.now()}` : cat!.id,
      name: name.trim(),
      age: age ? parseFloat(age) : 1,
      weight: weight ? parseFloat(weight) : 4,
      gender,
      neutered,
      allergies: allergies.split(/[,，、\s]+/).map(s => s.trim()).filter(Boolean),
      dietNeeds: dietNeeds.split(/[,，、\s]+/).map(s => s.trim()).filter(Boolean),
      avatarUrl: avatar
    };

    if (isNew) {
      MOCK_CATS.push(newCat);
    } else {
      const index = MOCK_CATS.findIndex(c => c.id === cat!.id);
      if (index !== -1) MOCK_CATS[index] = newCat;
    }
    saveCats();
    navigate('/profile');
  };

  const handleDelete = () => {
    if (!cat) return;
    const index = MOCK_CATS.findIndex(c => c.id === cat.id);
    if (index !== -1) {
      MOCK_CATS.splice(index, 1);
      saveCats();
    }
    navigate('/profile');
  };

  return (
    <div className="p-4 space-y-3 bg-stone-50 min-h-full pb-20">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 space-y-4">
        <div className="flex justify-center">
          <div className="relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center text-stone-400 overflow-hidden border-2 border-dashed border-stone-300">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Plus className="w-7 h-7" />
              )}
            </div>
            <div className="absolute bottom-0 right-0 bg-[#FF7B4A] text-white p-1 rounded-full shadow-sm">
              <Plus className="w-3.5 h-3.5" />
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">姓名 <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={name}
            onChange={e => {
              setName(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
            placeholder="请输入猫咪姓名"
            className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7B4A]/20"
          />
          {errorMsg && <p className="text-xs text-rose-500 mt-1">{errorMsg}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">年龄 (岁)</label>
            <input
              type="number"
              step="0.1"
              value={age}
              onChange={e => setAge(e.target.value)}
              placeholder="如 2 或 0.5"
              className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7B4A]/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">体重 (kg)</label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="如 4.5"
              className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7B4A]/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">性别</label>
            <div className="flex gap-2">
              <label className="flex-1 flex items-center justify-center py-2.5 border border-stone-200 rounded-xl cursor-pointer has-[:checked]:border-[#FF7B4A] has-[:checked]:bg-[#FFFAF5] has-[:checked]:text-[#FF7B4A]">
                <input type="radio" name="gender" value="male" checked={gender === 'male'} onChange={() => setGender('male')} className="hidden" />
                <span className="text-sm font-medium">公猫</span>
              </label>
              <label className="flex-1 flex items-center justify-center py-2.5 border border-stone-200 rounded-xl cursor-pointer has-[:checked]:border-[#FF7B4A] has-[:checked]:bg-[#FFFAF5] has-[:checked]:text-[#FF7B4A]">
                <input type="radio" name="gender" value="female" checked={gender === 'female'} onChange={() => setGender('female')} className="hidden" />
                <span className="text-sm font-medium">母猫</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">绝育状态</label>
            <div className="flex gap-2">
              <label className="flex-1 flex items-center justify-center py-2.5 border border-stone-200 rounded-xl cursor-pointer has-[:checked]:border-[#FF7B4A] has-[:checked]:bg-[#FFFAF5] has-[:checked]:text-[#FF7B4A]">
                <input type="radio" name="neutered" value="true" checked={neutered === true} onChange={() => setNeutered(true)} className="hidden" />
                <span className="text-sm font-medium">已绝育</span>
              </label>
              <label className="flex-1 flex items-center justify-center py-2.5 border border-stone-200 rounded-xl cursor-pointer has-[:checked]:border-[#FF7B4A] has-[:checked]:bg-[#FFFAF5] has-[:checked]:text-[#FF7B4A]">
                <input type="radio" name="neutered" value="false" checked={neutered === false} onChange={() => setNeutered(false)} className="hidden" />
                <span className="text-sm font-medium">未绝育</span>
              </label>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">过敏源及忌口</label>
          <input
            type="text"
            value={allergies}
            onChange={e => setAllergies(e.target.value)}
            placeholder="选填，例如: 牛肉、鱼类 (用逗号分隔)"
            className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7B4A]/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">健康需求</label>
          <input
            type="text"
            value={dietNeeds}
            onChange={e => setDietNeeds(e.target.value)}
            placeholder="选填，例如: 护肾、减脂、低磷等"
            className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7B4A]/20"
          />
        </div>
      </div>

      <div className="fixed bottom-16 inset-x-0 max-w-md mx-auto px-4 flex gap-2.5 z-20">
        {!isNew && cat && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 bg-rose-50 border border-rose-200 text-rose-600 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            删除
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 bg-[#FF7B4A] text-white px-4 py-3 rounded-xl text-sm font-semibold shadow-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          保存档案
        </button>
      </div>

      {showDeleteConfirm && cat && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-5"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-base font-bold text-stone-800 mb-2">删除猫咪档案</h4>
            <p className="text-sm text-stone-500 leading-relaxed mb-5">
              确认删除「{cat.name}」的档案吗？
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-sm font-semibold"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsPage() {
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState(MOCK_USER.avatarUrl);
  const [nickname, setNickname] = useState(MOCK_USER.nickname);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = () => {
    MOCK_USER.avatarUrl = avatar;
    MOCK_USER.nickname = nickname.trim() || '铲屎官';
    saveUser();
    navigate('/profile');
  };

  return (
    <div className="p-4 space-y-4 bg-stone-50 min-h-full pb-20">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 space-y-5">
        <div className="flex flex-col items-center justify-center">
          <div className="relative cursor-pointer mb-2" onClick={() => fileInputRef.current?.click()}>
            <div className="w-24 h-24 bg-stone-100 rounded-full flex items-center justify-center text-stone-400 overflow-hidden border-2 border-dashed border-stone-300">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10" />
              )}
            </div>
            <div className="absolute bottom-0 right-0 bg-[#FF7B4A] text-white p-1.5 rounded-full shadow-sm">
              <Plus className="w-4 h-4" />
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
          <p className="text-sm text-stone-500">点击修改头像</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">昵称</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="请输入昵称"
            className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7B4A]/20"
          />
        </div>
      </div>

      <div className="fixed bottom-16 inset-x-0 max-w-md mx-auto px-4 z-20">
        <button onClick={handleSaveSettings} className="w-full bg-[#FF7B4A] text-white px-4 py-3 rounded-xl text-sm font-semibold shadow-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2">
          <Save className="w-4 h-4" />
          保存设置
        </button>
      </div>
    </div>
  );
}

export default function Profile() {
  return (
    <Routes>
      <Route path="/" element={<ProfileHome />} />
      <Route path="/cats/:id" element={<CatProfile />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}
