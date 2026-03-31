import React from 'react';
import { Clock, Rocket, Zap } from 'lucide-react';

interface MeroCmsRouterProps {
  appSlug: string;
}

/**
 * Mero CMS — Coming Soon
 *
 * The Mero CMS is a dedicated Next.js microservice that will be connected
 * once it reaches production readiness. This placeholder is shown in the
 * meantime.
 */
export default function MeroCmsRouter({ appSlug: _appSlug }: MeroCmsRouterProps) {
  return (
    <div className="flex items-center justify-center h-full w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="text-center max-w-lg px-8 py-12">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Rocket className="w-10 h-10 text-indigo-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Clock className="w-3 h-3 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-white mb-3">
          Mero CMS
        </h1>
        <div className="inline-flex items-center gap-2 bg-indigo-600/20 border border-indigo-500/30 rounded-full px-4 py-1.5 mb-6">
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-indigo-300 text-sm font-medium">Coming Soon</span>
        </div>

        {/* Description */}
        <p className="text-slate-400 text-base leading-relaxed mb-8">
          Mero CMS is a powerful content management system built as a dedicated Next.js microservice.
          It will be seamlessly integrated into your workspace once it launches.
        </p>

        {/* Feature list */}
        <div className="grid grid-cols-2 gap-3 text-left">
          {[
            'Pages & Posts',
            'Media Library',
            'Custom Forms',
            'SEO Tools',
            'Multi-language',
            'API-first CMS',
          ].map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              <span className="text-slate-300 text-sm">{feature}</span>
            </div>
          ))}
        </div>

        <p className="text-slate-600 text-xs mt-8">
          Stay tuned — we'll notify you when Mero CMS is ready to connect.
        </p>
      </div>
    </div>
  );
}
