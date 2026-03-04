"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Company = {
  id: string;
  name: string | null;
  slug: string | null;
  logo_url: string | null;
  banner_url: string | null;
  slogan: string | null;
  about: string | null;
  industry: string | null;
  employee_count: string | null;
  founded_year: number | null;
  website: string | null;
  telegram: string | null;
  instagram: string | null;
  city: string | null;
  address: string | null;
  is_premium: boolean;
};

const INDUSTRIES = [
  "IT и разработка",
  "Маркетинг и реклама",
  "Финансы и банки",
  "Производство",
  "Торговля и ритейл",
  "Образование",
  "Медицина",
  "Строительство",
  "Логистика",
  "HoReCa",
  "Телеком",
  "Консалтинг",
  "Другое",
];

const EMPLOYEE_COUNTS = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
];

export default function EditCompanyPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form fields
  const [slug, setSlug] = useState("");
  const [slogan, setSlogan] = useState("");
  const [about, setAbout] = useState("");
  const [industry, setIndustry] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [foundedYear, setFoundedYear] = useState("");
  const [website, setWebsite] = useState("");
  const [telegram, setTelegram] = useState("");
  const [instagram, setInstagram] = useState("");
  const [city, setCity] = useState("");

  // Image uploads
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/auth");
        return;
      }

      const { data: comp } = await supabase
        .from("companies")
        .select("*")
        .eq("owner_id", userData.user.id)
        .maybeSingle();

      if (!comp) {
        router.replace("/onboarding/employer");
        return;
      }

      setCompany(comp as Company);
      setSlug(comp.slug ?? "");
      setSlogan(comp.slogan ?? "");
      setAbout(comp.about ?? "");
      setIndustry(comp.industry ?? "");
      setEmployeeCount(comp.employee_count ?? "");
      setFoundedYear(comp.founded_year?.toString() ?? "");
      setWebsite(comp.website ?? "");
      setTelegram(comp.telegram ?? "");
      setInstagram(comp.instagram ?? "");
      setCity(comp.city ?? "");
      setLogoPreview(comp.logo_url);
      setBannerPreview(comp.banner_url);
      setLoading(false);
    }

    load();
  }, [router, supabase]);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  }

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  }

  async function uploadImage(file: File, path: string): Promise<string | null> {
    const ext = file.name.split(".").pop();
    const fileName = `${path}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("company-assets")
      .upload(fileName, file, { upsert: true });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("company-assets")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }

  async function handleSave() {
    if (!company) return;

    setMsg(null);
    setSaving(true);

    try {
      let logoUrl = company.logo_url;
      let bannerUrl = company.banner_url;

      // Upload logo if changed
      if (logoFile) {
        setUploadingLogo(true);
        const url = await uploadImage(logoFile, `logos/${company.id}`);
        if (url) logoUrl = url;
        setUploadingLogo(false);
      }

      // Upload banner if changed
      if (bannerFile) {
        setUploadingBanner(true);
        const url = await uploadImage(bannerFile, `banners/${company.id}`);
        if (url) bannerUrl = url;
        setUploadingBanner(false);
      }

      // Validate slug
      const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 50);

      // Check if slug is taken
      if (cleanSlug && cleanSlug !== company.slug) {
        const { data: existing } = await supabase
          .from("companies")
          .select("id")
          .eq("slug", cleanSlug)
          .neq("id", company.id)
          .maybeSingle();

        if (existing) {
          setMsg({ type: "error", text: "Этот URL уже занят. Выберите другой." });
          setSaving(false);
          return;
        }
      }

      // Update company
      const { error } = await supabase
        .from("companies")
        .update({
          slug: cleanSlug || null,
          logo_url: logoUrl,
          banner_url: bannerUrl,
          slogan: slogan.trim() || null,
          about: about.trim() || null,
          industry: industry || null,
          employee_count: employeeCount || null,
          founded_year: foundedYear ? parseInt(foundedYear) : null,
          website: website.trim() || null,
          telegram: telegram.trim() || null,
          instagram: instagram.trim() || null,
          city: city.trim() || null,
        })
        .eq("id", company.id);

      if (error) {
        setMsg({ type: "error", text: error.message });
      } else {
        setMsg({ type: "success", text: "Изменения сохранены!" });
        setCompany({
          ...company,
          slug: cleanSlug || null,
          logo_url: logoUrl,
          banner_url: bannerUrl,
          slogan: slogan.trim() || null,
          about: about.trim() || null,
          industry: industry || null,
          employee_count: employeeCount || null,
          founded_year: foundedYear ? parseInt(foundedYear) : null,
          website: website.trim() || null,
          telegram: telegram.trim() || null,
          instagram: instagram.trim() || null,
          city: city.trim() || null,
        });
        setLogoFile(null);
        setBannerFile(null);
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ink)" }}>
        <div className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: "rgba(196,173,255,0.2)", borderTopColor: "var(--lavender)" }} />
      </div>
    );
  }

  if (!company) return null;

  const pageUrl = slug ? `freedomhire.uz/company/${slug}` : null;

  return (
    <div className="min-h-screen p-4 sm:p-8" style={{ background: "var(--ink)" }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/employer" className="text-sm mb-2 inline-block" style={{ color: "var(--lavender)" }}>
            ← Назад в кабинет
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--chalk)" }}>
            Страница компании
          </h1>
          <p className="mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
            Настройте публичную страницу для привлечения кандидатов
          </p>
        </div>

        {/* Message */}
        {msg && (
          <div className={`mb-6 rounded-xl px-4 py-3 text-sm ${msg.type === "success" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
            {msg.text}
          </div>
        )}

        {/* Preview link */}
        {pageUrl && (
          <div className="mb-6 rounded-xl p-4" style={{ background: "rgba(92,46,204,0.1)", border: "1px solid rgba(92,46,204,0.2)" }}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Ваша страница:</div>
                <a href={`/company/${slug}`} target="_blank" className="font-medium" style={{ color: "var(--lavender)" }}>
                  {pageUrl}
                </a>
              </div>
              <Link href={`/company/${slug}`} target="_blank"
                className="px-4 py-2 rounded-xl text-sm font-medium transition"
                style={{ background: "rgba(255,255,255,0.05)", color: "var(--lavender)", border: "1px solid rgba(255,255,255,0.1)" }}>
                Предпросмотр →
              </Link>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Banner */}
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 className="font-semibold mb-4" style={{ color: "var(--chalk)" }}>🖼️ Баннер</h2>
            
            <div className="relative h-40 sm:h-48 rounded-xl overflow-hidden mb-4"
              style={{ background: bannerPreview ? "transparent" : "linear-gradient(135deg, #5B2ECC 0%, #7C4AE8 100%)" }}>
              {bannerPreview && (
                <img src={bannerPreview} alt="" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <label className="cursor-pointer px-4 py-2 rounded-xl text-sm font-medium transition hover:scale-105"
                  style={{ background: "rgba(0,0,0,0.6)", color: "white", backdropFilter: "blur(4px)" }}>
                  {uploadingBanner ? "Загрузка..." : "Загрузить баннер"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} disabled={uploadingBanner} />
                </label>
              </div>
            </div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Рекомендуемый размер: 1920×480 пикселей
            </p>
          </div>

          {/* Logo */}
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 className="font-semibold mb-4" style={{ color: "var(--chalk)" }}>🏢 Логотип</h2>
            
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0"
                style={{ background: logoPreview ? "white" : "linear-gradient(135deg, #5B2ECC, #7C4AE8)" }}>
                {logoPreview ? (
                  <img src={logoPreview} alt="" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                    {(company.name ?? "C")[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <label className="cursor-pointer inline-block px-4 py-2 rounded-xl text-sm font-medium transition"
                  style={{ background: "rgba(255,255,255,0.05)", color: "var(--lavender)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  {uploadingLogo ? "Загрузка..." : "Загрузить логотип"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} disabled={uploadingLogo} />
                </label>
                <p className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  PNG или JPG, до 2 МБ
                </p>
              </div>
            </div>
          </div>

          {/* URL */}
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 className="font-semibold mb-4" style={{ color: "var(--chalk)" }}>🔗 URL страницы</h2>
            
            <div className="flex items-center gap-2">
              <span className="text-sm shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>
                freedomhire.uz/company/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="your-company"
                maxLength={50}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--chalk)" }}
              />
            </div>
            <p className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Только латинские буквы, цифры и дефис
            </p>
          </div>

          {/* About */}
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 className="font-semibold mb-4" style={{ color: "var(--chalk)" }}>✍️ О компании</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs block mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Слоган</label>
                <input
                  type="text"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  placeholder="Создаём будущее вместе"
                  maxLength={100}
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--chalk)" }}
                />
              </div>

              <div>
                <label className="text-xs block mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Описание</label>
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Расскажите о компании, миссии, культуре..."
                  rows={5}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none transition"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--chalk)" }}
                />
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 className="font-semibold mb-4" style={{ color: "var(--chalk)" }}>📋 Детали</h2>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs block mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Отрасль</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition appearance-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--chalk)" }}
                >
                  <option value="">Выберите отрасль</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs block mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Размер компании</label>
                <select
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition appearance-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--chalk)" }}
                >
                  <option value="">Выберите размер</option>
                  {EMPLOYEE_COUNTS.map((count) => (
                    <option key={count} value={count}>{count} сотрудников</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs block mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Год основания</label>
                <input
                  type="number"
                  value={foundedYear}
                  onChange={(e) => setFoundedYear(e.target.value)}
                  placeholder="2020"
                  min={1900}
                  max={new Date().getFullYear()}
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--chalk)" }}
                />
              </div>

              <div>
                <label className="text-xs block mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Город</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ташкент"
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--chalk)" }}
                />
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 className="font-semibold mb-4" style={{ color: "var(--chalk)" }}>🌐 Ссылки</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs block mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Сайт</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--chalk)" }}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs block mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Telegram</label>
                  <input
                    type="text"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    placeholder="@company"
                    className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--chalk)" }}
                  />
                </div>

                <div>
                  <label className="text-xs block mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Instagram</label>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@company"
                    className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--chalk)" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end gap-3 pt-4">
            <Link href="/employer"
              className="px-6 py-3 rounded-xl text-sm font-medium transition"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}>
              Отмена
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary px-8 py-3 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50"
            >
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
