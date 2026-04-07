import React from "react";
import { safeUrl } from "../../shared/safe-url";

interface Props { greeting?: string; name: string; title: string; subtitle: string; avatarUrl?: string; buttonText: string; buttonLink: string; secondaryButtonText?: string; secondaryButtonLink?: string; available?: boolean; }

export default function Hero(props: Props) {
  return (
    <section id="hero" className="pt-14">
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-24 sm:py-32">
        <div className="flex flex-col sm:flex-row items-start gap-8">
          {props.avatarUrl && (
            <div className="relative flex-shrink-0 animate-fade-in">
              <img src={props.avatarUrl} alt={props.name} className="w-24 h-24 rounded-full object-cover grayscale hover:grayscale-0 transition duration-700" />
              {props.available && (
                <span className="absolute -bottom-1 -right-1 flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-medium text-emerald-700">Available</span>
                </span>
              )}
            </div>
          )}
          <div className="animate-fade-up">
            <p className="text-gray-400 text-sm mb-2">
              {props.greeting} <span className="text-gray-900 font-medium">{props.name}</span>
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-gray-900 leading-tight mb-4 tracking-tight">
              {props.title}
            </h1>
            <p className="text-gray-400 text-lg max-w-xl leading-relaxed mb-8">{props.subtitle}</p>
            <div className="flex items-center gap-3">
              <a href={safeUrl(props.buttonLink) || "#portfolio"} className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition">
                {props.buttonText}
              </a>
              {props.secondaryButtonText && (
                <a href={safeUrl(props.secondaryButtonLink) || "#"} className="inline-flex items-center gap-2 text-gray-500 text-sm font-medium px-5 py-2.5 rounded-lg border border-gray-200 hover:border-gray-300 hover:text-gray-900 transition">
                  {props.secondaryButtonText}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="border-b border-gray-100" />
    </section>
  );
}
