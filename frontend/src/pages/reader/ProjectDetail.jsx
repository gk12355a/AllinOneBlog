import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ExternalLink, 
  Layers, 
  Calendar, 
  ChevronRight, 
  Code2, 
  Share2, 
  Check, 
  Sparkles
} from 'lucide-react';
import { GithubIcon } from '../../components/SocialIcons';
import api from '../../services/api';
import { useApp } from '../../contexts/AppContext';

export default function ProjectDetail() {
  const { id } = useParams();
  const { t, lang } = useApp();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/projects/${id}`)
      .then((res) => {
        setProject(res.data);
      })
      .catch((err) => {
        console.error('Lỗi tải chi tiết dự án:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
          <Code2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {t('project_detail.not_found_title')}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t('project_detail.not_found_desc')}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('project_detail.back_home')}</span>
        </Link>
      </div>
    );
  }

  return (
    <article className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/#projects"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('project_detail.back_to_projects')}</span>
          </Link>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? t('project_detail.share_copied') : t('project_detail.share')}</span>
          </button>
        </div>

        {/* Project Hero Header */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 uppercase tracking-wide">
              {project.is_featured ? t('project_detail.featured_badge') : t('project_detail.portfolio_badge')}
            </span>
            {project.created_at && (
              <span className="flex items-center gap-1 text-xs text-zinc-500 font-mono">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(project.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN')}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight">
            {project.title}
          </h1>

          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
            {project.description}
          </p>

          {/* Action links: Live Demo & GitHub */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {project.show_demo && project.demo_link && (
              <a
                href={project.demo_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition"
              >
                <ExternalLink className="w-4 h-4" />
                <span>{t('project_detail.live_demo')}</span>
              </a>
            )}

            {project.show_github && project.github_link && (
              <a
                href={project.github_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold text-xs shadow-sm transition"
              >
                <GithubIcon className="w-4 h-4" />
                <span>{t('project_detail.source_code')}</span>
              </a>
            )}
          </div>
        </div>

        {/* Project Showcase Image */}
        {project.image_url && (
          <div className="rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xl bg-zinc-100 dark:bg-zinc-900">
            <img
              src={project.image_url}
              alt={project.title}
              className="w-full max-h-[500px] object-cover"
            />
          </div>
        )}

        {/* Tech Stack Section */}
        {project.tech_stack && project.tech_stack.length > 0 && (
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{t('project_detail.tech_stack_title')}</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {project.tech_stack.map((tech, idx) => (
                <span
                  key={idx}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-mono text-xs font-semibold border border-blue-200/60 dark:border-blue-900/40"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-center space-y-4 shadow-xl">
          <Sparkles className="w-8 h-8 mx-auto text-amber-300 animate-pulse" />
          <h3 className="text-xl font-bold">{t('project_detail.cta_title')}</h3>
          <p className="text-xs sm:text-sm text-blue-100 max-w-lg mx-auto">
            {t('project_detail.cta_desc')}
          </p>
          <Link
            to="/#contact"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs shadow-md transition"
          >
            <span>{t('project_detail.cta_btn')}</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </article>
  );
}
