import { useEffect } from 'react';

const DEFAULT_TITLE = 'AllinOneBlog — Personal Portfolio & Tech Blog';
const DEFAULT_DESC = 'Chia sẻ kiến thức lập trình, DevOps, Kubernetes, kiến trúc hệ thống và các dự án thực tế.';
const DEFAULT_IMAGE = '/Logo_AllinOneBlog.png';

function setMetaTag(selector, attrName, attrValue, content) {
  if (!content) return;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Dynamic SEO hook for React SPA pages (Title, Meta Description, Open Graph, Canonical, JSON-LD).
 */
export default function useSEO({
  title,
  description,
  image,
  type = 'website',
  url,
  jsonLd
} = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | AllinOneBlog` : DEFAULT_TITLE;
    const desc = description || DEFAULT_DESC;
    const img = image || DEFAULT_IMAGE;
    const canonicalUrl = url || window.location.href;

    document.title = fullTitle;

    setMetaTag('meta[name="description"]', 'name', 'description', desc);
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', desc);
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', img);
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', type);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', desc);
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', img);

    let canonicalEl = document.head.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalUrl);

    const existingLd = document.head.querySelector('script[data-seo-jsonld="true"]');
    if (existingLd) existingLd.remove();

    if (jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-jsonld', 'true');
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      const ld = document.head.querySelector('script[data-seo-jsonld="true"]');
      if (ld) ld.remove();
    };
  }, [title, description, image, type, url, jsonLd]);
}
