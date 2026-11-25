import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Download, Mail, ExternalLink, Sparkles, Briefcase, Code, Terminal, CheckCircle2, Lock, LogIn } from 'lucide-react';
import { GithubIcon } from '../../components/SocialIcons';
import api from '../../services/api';
import { useApp } from '../../contexts/AppContext';
import useSEO from '../../hooks/useSEO';

export default function Home() {
  const { t, user, lang } = useApp();
  const [profile, setProfile] = useState(null);

  useSEO({
    title: profile?.full_name ? `${profile.full_name} — Portfolio & Blog` : 'Trang chủ',
    description: profile?.bio || 'Chia sẻ kiến thức lập trình, DevOps, Kubernetes và các dự án thực tế.',
    image: profile?.avatar_url || '/avatar_default.jpg'
  });
  const [featuredProjects, setFeaturedProjects] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [contactForm, setContactForm] = useState({
    name: user?.display_name || user?.username || '',
    email: user?.email || '',
    subject: '',
    category: 'general',
    message: ''
  });
  const [honeypot, setHoneypot] = useState('');
  const [formStartTime, setFormStartTime] = useState(Date.now());
  const [contactStatus, setContactStatus] = useState({ loading: false, success: false, error: '' });

  useEffect(() => {
    setFormStartTime(Date.now());
  }, []);

  // Tự động điền thông tin nếu người dùng đăng nhập
  useEffect(() => {
    if (user) {
      setContactForm(prev => ({
        ...prev,
        name: prev.name || user.display_name || user.username || '',
        email: prev.email || user.email || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    // 1. Lấy thông tin Profile
    api.get('/profile').then(res => setProfile(res.data)).catch(console.error);

    // 2. Lấy Dự án Nổi bật
    api.get('/projects?featured=true').then(res => setFeaturedProjects(res.data)).catch(console.error);

    // 3. Lấy Bài viết Mới nhất
    api.get('/posts?limit=3').then(res => setRecentPosts(res.data.posts)).catch(console.error);
  }, []);

  const handleSendContact = async (e) => {
    e.preventDefault();
    setContactStatus({ loading: true, success: false, error: '' });
    try {
      const fillTimeMs = Date.now() - formStartTime;
      const payload = {
        ...contactForm,
        website_hp: honeypot,
        fill_time_ms: fillTimeMs
      };
      const res = await api.post('/contact', payload);
      setContactStatus({
        loading: false,
        success: true,
        error: ''
      });
      setContactForm({
        name: user?.display_name || user?.username || '',
        email: user?.email || '',
        subject: '',
        category: 'general',
        message: ''
      });
      setHoneypot('');
    } catch (err) {
      // err có thể là object response.data do Axios interceptor reject(error.response?.data || error.message)
      const data = err?.response?.data || err;
      const rawMsg = data?.message || err?.message || '';
      const isRateLimit = err?.response?.status === 429 ||
        data?.error === 'rate_limit_exceeded' ||
        (typeof rawMsg === 'string' && (rawMsg.toLowerCase().includes('rate limit') || rawMsg.toLowerCase().includes('quá nhiều lần')));

      let errorMsg;
      if (isRateLimit) {
        errorMsg = lang === 'en'
          ? (data?.message_en || t('home.rate_limit_error'))
          : (data?.message_vi || t('home.rate_limit_error'));
      } else {
        errorMsg = (typeof rawMsg === 'string' && rawMsg) ? rawMsg : (lang === 'en' ? 'Failed to send message.' : 'Không thể gửi tin nhắn.');
      }

      setContactStatus({
        loading: false,
        success: false,
        error: errorMsg
      });
    }
  };

  return (
    <div className="space-y-24 py-12 animate-fade-in">
      {/* 1. HERO SECTION */}
      <section className="flex flex-col-reverse md:flex-row items-center justify-between gap-12">
        <div className="flex-1 space-y-6">
          {/* Live Status Badge */}
          {profile?.live_status && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold shadow-sm animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{t('home.live_status')}</span>
            </div>
          )}

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
            {t('home.greeting')}{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
              {profile?.full_name || 'Đỗ Trí Kiên'}
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-300 font-medium">
            {profile?.headline || t('home.headline') || 'DevOps Engineer | Cloud & Infrastructure Specialist'}
          </p>

          <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xl text-sm sm:text-base whitespace-pre-line">
            {profile?.bio || t('home.bio')}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <a
              href="#projects"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-all hover:scale-105"
            >
              {t('home.view_projects')}
            </a>
            <a
              href="#contact"
              className="px-5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-sm transition-all"
            >
              {t('home.contact_me')}
            </a>
            {profile?.resume_url && (
              <a
                href={profile.resume_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{t('home.download_cv')}</span>
              </a>
            )}
          </div>
        </div>

        {/* Avatar Card */}
        <div className="shrink-0 relative">
          <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-3xl overflow-hidden p-1.5 bg-gradient-to-tr from-blue-600 via-indigo-500 to-emerald-400 shadow-2xl">
            <img
              src={profile?.avatar_url || '/Ảnh chân dung.jpg'}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/avatar_default.jpg';
              }}
              alt={profile?.full_name || 'Avatar'}
              className="w-full h-full object-cover rounded-2xl bg-zinc-100 dark:bg-zinc-800"
            />
          </div>
        </div>
      </section>

      {/* 2. SKILLS SHOWCASE */}
      {profile?.skills?.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Code className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {t('home.skills')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {profile.skills.map((group, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3"
              >
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {group.category}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {group.items?.map((item, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. FEATURED PROJECTS */}
      <section id="projects" className="space-y-8 scroll-mt-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {t('home.featured_projects')}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {featuredProjects.map((proj) => (
            <div
              key={proj.id}
              className="group rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 transition-all hover:shadow-xl flex flex-col cursor-pointer"
            >
              {proj.image_url && (
                <Link to={`/projects/${proj.id}`} className="block h-48 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  <img
                    src={proj.image_url}
                    alt={proj.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </Link>
              )}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    <Link to={`/projects/${proj.id}`} className="hover:underline">
                      {proj.title}
                    </Link>
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-3">
                    {proj.description}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap gap-1.5">
                    {proj.tech_stack?.map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 text-xs rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-mono">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3">
                      {proj.show_demo && proj.demo_link && (
                        <a
                          href={proj.demo_link}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Live Demo</span>
                        </a>
                      )}
                      {proj.show_github && proj.github_link && (
                        <a
                          href={proj.github_link}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:underline"
                        >
                          <GithubIcon className="w-3.5 h-3.5" />
                          <span>Source Code</span>
                        </a>
                      )}
                    </div>

                    <Link
                      to={`/projects/${proj.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Chi tiết</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. WORK EXPERIENCE TIMELINE */}
      {profile?.timeline?.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {t('home.experience')}
            </h2>
          </div>

          <div className="relative pl-6 border-l-2 border-zinc-200 dark:border-zinc-800 space-y-8 my-4 ml-3">
            {profile.timeline.map((item, idx) => (
              <div key={idx} className="relative group">
                <span className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-white dark:ring-zinc-950"></span>
                <span className="text-xs font-semibold font-mono text-blue-600 dark:text-blue-400">
                  {item.year}
                </span>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {item.title} <span className="font-normal text-zinc-500">tại {item.company}</span>
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. RECENT BLOG POSTS */}
      {recentPosts.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                {t('home.recent_posts')}
              </h2>
            </div>
            <Link
              to="/blog"
              className="flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <span>{t('home.view_all')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentPosts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 transition-all hover:shadow-lg flex flex-col"
              >
                {post.cover_image && (
                  <div className="h-40 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    <img
                      src={post.cover_image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider font-mono">
                      {post.reading_time} {t('blog.reading_time')}
                    </span>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 mt-1">
                      {post.title}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1">
                      {post.excerpt}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 6. QUICK CONTACT FORM */}
      <section id="contact" className="p-8 sm:p-12 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 scroll-mt-20 shadow-sm">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {t('home.contact_me')}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t('home.contact_subtitle')}
            </p>
          </div>

          {contactStatus.success && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>{t('home.contact_success')}</span>
            </div>
          )}

          {contactStatus.error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-sm">
              {contactStatus.error}
            </div>
          )}

          {!user ? (
            <div className="p-8 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/50 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm">
                <Lock className="w-7 h-7" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {t('home.contact_login_required_title')}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {t('home.contact_login_required_desc')}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/login?redirect=/#contact"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all hover:scale-105"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t('home.contact_login_btn')}</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendContact} className="space-y-4">
              {/* Honeypot field (ẩn với người thật, bot tự điền sẽ bị bẫy) */}
              <div className="hidden" aria-hidden="true" style={{ display: 'none' }}>
                <label htmlFor="website_hp">Không điền vào ô này nếu bạn là người thật:</label>
                <input
                  id="website_hp"
                  type="text"
                  name="website_hp"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    {t('home.your_name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    readOnly
                    autoComplete="name"
                    placeholder="VD: Nguyễn Văn A"
                    value={contactForm.name}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 text-sm outline-none cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    {t('home.your_email')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    readOnly
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={contactForm.email}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 text-sm outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    {t('home.contact_topic')}
                  </label>
                  <select
                    value={contactForm.category}
                    onChange={(e) => setContactForm({ ...contactForm, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm outline-none focus:border-blue-500 font-medium cursor-pointer"
                  >
                    <option value="general">{t('home.contact_topic_general')}</option>
                    <option value="project">{t('home.contact_topic_project')}</option>
                    <option value="question">{t('home.contact_topic_question')}</option>
                    <option value="feedback">{t('home.contact_topic_feedback')}</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    {t('home.contact_subject')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('home.contact_subject_placeholder')}
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {t('home.message_content')} <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {contactForm.message.length} / 5000 {t('home.contact_chars')}
                  </span>
                </div>
                <textarea
                  required
                  rows={4}
                  maxLength={5000}
                  placeholder={t('home.contact_message_placeholder')}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm outline-none focus:border-blue-500 resize-none leading-relaxed"
                ></textarea>
              </div>

              <p className="text-[11px] text-zinc-400 text-center">
                {t('home.contact_privacy_note')}
              </p>

              <button
                type="submit"
                disabled={contactStatus.loading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>{contactStatus.loading ? t('home.sending') : t('home.send_message')}</span>
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
