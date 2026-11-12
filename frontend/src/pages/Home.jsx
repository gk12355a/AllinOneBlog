import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Download, Mail, ExternalLink, Sparkles, Briefcase, Code, Terminal, CheckCircle2 } from 'lucide-react';
import { GithubIcon } from '../components/SocialIcons';
import api from '../services/api';
import { useApp } from '../contexts/AppContext';

export default function Home() {
  const { t } = useApp();
  const [profile, setProfile] = useState(null);
  const [featuredProjects, setFeaturedProjects] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [contactStatus, setContactStatus] = useState({ loading: false, success: false, error: '' });

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
      await api.post('/contact', contactForm);
      setContactStatus({ loading: false, success: true, error: '' });
      setContactForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setContactStatus({ loading: false, success: false, error: err.message || 'Không thể gửi tin nhắn.' });
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
            {t('home.headline') || profile?.headline || 'DevOps Engineer | Cloud & Infrastructure Specialist'}
          </p>

          <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xl text-sm sm:text-base">
            {t('home.bio') || profile?.bio}
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
              src={profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80'}
              alt={profile?.full_name}
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
              className="group rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 transition-all hover:shadow-xl flex flex-col"
            >
              {proj.image_url && (
                <div className="h-48 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  <img
                    src={proj.image_url}
                    alt={proj.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {proj.title}
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

                  <div className="flex items-center gap-3 pt-2">
                    {proj.demo_link && (
                      <a
                        href={proj.demo_link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Live Demo</span>
                      </a>
                    )}
                    {proj.github_link && (
                      <a
                        href={proj.github_link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:underline"
                      >
                        <GithubIcon className="w-3.5 h-3.5" />
                        <span>Source Code</span>
                      </a>
                    )}
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
      <section id="contact" className="p-8 sm:p-12 rounded-3xl bg-gradient-to-tr from-blue-50/50 to-indigo-50/50 dark:from-zinc-900 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 scroll-mt-20">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {t('home.contact_me')}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Có ý tưởng dự án hoặc muốn hợp tác? Hãy gửi tin nhắn cho tôi bất kỳ lúc nào!
            </p>
          </div>

          {contactStatus.success && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>Cảm ơn bạn! Tin nhắn đã được gửi thành công. Tôi sẽ phản hồi sớm nhất có thể.</span>
            </div>
          )}

          {contactStatus.error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-sm">
              {contactStatus.error}
            </div>
          )}

          <form onSubmit={handleSendContact} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">{t('home.your_name')}</label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">{t('home.your_email')}</label>
                <input
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Tiêu đề</label>
              <input
                type="text"
                value={contactForm.subject}
                onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">{t('home.message_content')}</label>
              <textarea
                required
                rows={4}
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm outline-none focus:border-blue-500 resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={contactStatus.loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>{contactStatus.loading ? 'Đang gửi...' : t('home.send_message')}</span>
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
